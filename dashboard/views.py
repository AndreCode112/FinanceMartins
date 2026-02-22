from calendar import monthrange
from collections import defaultdict
import csv
import json
import mimetypes
import os
from decimal import Decimal, ROUND_DOWN
from io import StringIO, BytesIO
import unicodedata
from uuid import uuid4
from xml.sax.saxutils import escape

from django.contrib.auth.decorators import login_required
from django.db import transaction as db_transaction
from django.db.models.deletion import ProtectedError
from django.http import FileResponse, Http404, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, render, redirect
from django.utils.dateparse import parse_date
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.utils.text import slugify
from django.urls import reverse

from .forms import BankForm, EventForm, PayableCategoryForm, PayableForm, TransactionForm
from .models import Bank, Event, Payable, PayableCategory, PayableStatusHistory, Transaction, UserDashboardLayout



import json
from datetime import datetime
from django.contrib import messages
from django.core.exceptions import ValidationError
from django.utils.dateparse import parse_datetime
from django.db import transaction



DEFAULT_BANKS = [
    {"name": "Nubank", "slug": "nubank", "color": "#8A05BE", "icon": "ph-credit-card"},
    {"name": "Itau", "slug": "itau", "color": "#EC7000", "icon": "ph-bank"},
    {"name": "Inter", "slug": "inter", "color": "#FF7A00", "icon": "ph-wallet"},
]

DASHBOARD_WIDGET_IDS = [
    "summary_cards",
    "reminders",
    "reconciliation",
    "monthly_chart",
    "search_filters",
    "reports",
    "transactions_table",
]


def _bootstrap_banks(user):
    if Bank.objects.filter(owner=user).exists():
        return
    Bank.objects.bulk_create([Bank(owner=user, **bank_data) for bank_data in DEFAULT_BANKS])


def _serialize_transaction(transaction):
    return {
        "id": transaction.id,
        "title": transaction.title,
        "description": transaction.description,
        "amount": float(transaction.amount),
        "transaction_type": transaction.transaction_type,
        "transaction_date": transaction.transaction_date.isoformat(),
        "bank": {
            "id": transaction.bank.id,
            "name": transaction.bank.name,
            "slug": transaction.bank.slug,
            "color": transaction.bank.color,
            "icon": transaction.bank.icon,
        },
    }


def _serialize_event(event):
    return {
        "id": event.id,
        "title": event.title,
        "creator_name": event.creator_name,
        "starts_at": event.starts_at.isoformat(),
        "ends_at": event.ends_at.isoformat() if event.ends_at else None,
        "description": event.description,
        "location": event.location,
        "color": event.color,
        "status": event.status,
        "importance": event.importance,
        "reminder_minutes_before": event.reminder_minutes_before,
        "all_day": event.all_day,
    }


def _serialize_bank(bank):
    return {
        "id": bank.id,
        "name": bank.name,
        "slug": bank.slug,
        "color": bank.color,
        "icon": bank.icon,
    }


def _serialize_payable_category(category):
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "color": category.color,
    }


def _serialize_payable(payable, request=None):
    receipt_url = None
    receipt_name = None
    if payable.payment_receipt:
        receipt_name = os.path.basename(payable.payment_receipt.name)
        receipt_path = reverse("payable_receipt_view", kwargs={"payable_id": payable.id})
        receipt_url = request.build_absolute_uri(receipt_path) if request else receipt_path

    return {
        "id": payable.id,
        "title": payable.title,
        "description": payable.description,
        "payable_type": payable.payable_type,
        "status": payable.status,
        "amount": float(payable.amount),
        "due_date": payable.due_date.isoformat(),
        "payment_date": payable.payment_date.isoformat() if payable.payment_date else None,
        "payment_note": payable.payment_note,
        "payment_receipt_url": receipt_url,
        "payment_receipt_name": receipt_name,
        "installment_number": payable.installment_number,
        "installment_total": payable.installment_total,
        "installment_group": str(payable.installment_group) if payable.installment_group else None,
        "is_recurring": payable.is_recurring,
        "category": _serialize_payable_category(payable.category) if payable.category else None,
        "bank": (
            {
                "id": payable.bank.id,
                "name": payable.bank.name,
                "slug": payable.bank.slug,
                "color": payable.bank.color,
                "icon": payable.bank.icon,
            }
            if payable.bank
            else None
        ),
    }


def _serialize_form_errors(form):
    errors = {}
    for field, field_errors in form.errors.get_json_data().items():
        errors[field] = [item["message"] for item in field_errors]
    return errors


def _serialize_payable_history_item(history_item):
    return {
        "id": history_item.id,
        "payable_id": history_item.payable_id,
        "previous_status": history_item.previous_status,
        "new_status": history_item.new_status,
        "previous_payment_date": (
            history_item.previous_payment_date.isoformat() if history_item.previous_payment_date else None
        ),
        "new_payment_date": history_item.new_payment_date.isoformat() if history_item.new_payment_date else None,
        "previous_payment_note": history_item.previous_payment_note or "",
        "new_payment_note": history_item.new_payment_note or "",
        "source": history_item.source,
        "changed_at": history_item.changed_at.isoformat(),
        "changed_by": history_item.changed_by.username if history_item.changed_by else None,
    }


def _normalize_dashboard_widget_order(order):
    normalized = []
    if not isinstance(order, list):
        order = []
    for widget_id in order:
        if widget_id in DASHBOARD_WIDGET_IDS and widget_id not in normalized:
            normalized.append(widget_id)
    for widget_id in DASHBOARD_WIDGET_IDS:
        if widget_id not in normalized:
            normalized.append(widget_id)
    return normalized


def _get_user_dashboard_widget_order(user):
    layout = UserDashboardLayout.objects.filter(user=user).first()
    if not layout:
        return DASHBOARD_WIDGET_IDS.copy()
    return _normalize_dashboard_widget_order(layout.widget_order)


def _normalize_payment_note(raw_note):
    return (raw_note or "").strip()


def _parse_optional_date(raw_date):
    if not raw_date:
        return None
    return parse_date(raw_date)


def _delete_payable_receipt_file(payable):
    if not payable.payment_receipt:
        return
    payable.payment_receipt.delete(save=False)
    payable.payment_receipt = None


def _apply_payable_status(payable, status, payment_date=None, payment_note=None, clear_receipt=False):
    payable.status = status
    if status == Payable.PayableStatus.PAID:
        payable.payment_date = payment_date or payable.payment_date or timezone.localdate()
        payable.payment_note = _normalize_payment_note(payment_note) if payment_note is not None else payable.payment_note
        if payable.payment_note is None:
            payable.payment_note = ""
        return

    payable.payment_date = None
    payable.payment_note = ""
    if clear_receipt:
        _delete_payable_receipt_file(payable)


def _snapshot_payable_status(payable):
    return {
        "status": payable.status,
        "payment_date": payable.payment_date,
        "payment_note": payable.payment_note or "",
    }


def _build_payable_history_entry(payable, before_snapshot, changed_by=None, source="manual"):
    previous_status = before_snapshot.get("status")
    previous_payment_date = before_snapshot.get("payment_date")
    previous_payment_note = before_snapshot.get("payment_note") or ""
    new_payment_note = payable.payment_note or ""
    has_change = (
        previous_status != payable.status
        or previous_payment_date != payable.payment_date
        or previous_payment_note != new_payment_note
    )
    if not has_change:
        return None

    return PayableStatusHistory(
        payable=payable,
        previous_status=previous_status,
        new_status=payable.status,
        previous_payment_date=previous_payment_date,
        new_payment_date=payable.payment_date,
        previous_payment_note=previous_payment_note,
        new_payment_note=new_payment_note,
        source=source,
        changed_by=changed_by,
    )


def _create_payable_history_entry(payable, before_snapshot, changed_by=None, source="manual"):
    history_entry = _build_payable_history_entry(
        payable,
        before_snapshot=before_snapshot,
        changed_by=changed_by,
        source=source,
    )
    if history_entry:
        history_entry.save()


def _format_currency_br(amount):
    decimal_amount = Decimal(amount).quantize(Decimal("0.01"))
    numeric = float(decimal_amount)
    formatted = f"{numeric:,.2f}"
    return f"R$ {formatted}".replace(",", "X").replace(".", ",").replace("X", ".")


def _format_date_br(date_value):
    if not date_value:
        return "-"
    return date_value.strftime("%d/%m/%Y")


def _get_report_bank(user, bank_param):
    if not bank_param or bank_param == "all":
        return None
    try:
        bank_id = int(bank_param)
    except (TypeError, ValueError) as exc:
        raise ValueError("Banco invalido.") from exc
    bank = Bank.objects.filter(id=bank_id, owner=user).first()
    if not bank:
        raise ValueError("Banco nao encontrado.")
    return bank


def _parse_report_period(start_param, end_param):
    start_date = parse_date(start_param) if start_param else None
    end_date = parse_date(end_param) if end_param else None
    if start_param and not start_date:
        raise ValueError("Data inicial invalida.")
    if end_param and not end_date:
        raise ValueError("Data final invalida.")
    if start_date and end_date and start_date > end_date:
        raise ValueError("Data inicial nao pode ser maior que a data final.")
    return start_date, end_date


def _get_report_file_name(report_type, report_format, selected_bank, start_date=None, end_date=None, detail_level="both"):
    date_stamp = timezone.localdate().isoformat()
    bank_scope = selected_bank.slug if selected_bank else "todos-bancos"
    period_start = start_date.isoformat() if start_date else "inicio"
    period_end = end_date.isoformat() if end_date else "fim"
    detail_token = slugify(detail_level or "both")
    extension = {"csv": "csv", "excel": "xls", "pdf": "pdf"}[report_format]
    return (
        f"relatorio-{slugify(report_type)}-{bank_scope}-"
        f"{period_start}-{period_end}-{detail_token}-{date_stamp}.{extension}"
    )


def _payable_status_label_for_report(payable, today):
    if payable.status == Payable.PayableStatus.PAID:
        return "Pago"
    if payable.due_date < today:
        return "Vencida"
    return "Pendente"


def _format_report_period_label(start_date, end_date):
    if not start_date and not end_date:
        return "Todo periodo"
    if start_date and end_date:
        return f"{_format_date_br(start_date)} a {_format_date_br(end_date)}"
    if start_date:
        return f"A partir de {_format_date_br(start_date)}"
    return f"Ate {_format_date_br(end_date)}"


def _build_payables_report_dataset(user, selected_bank, start_date, end_date, detail_level):
    today = timezone.localdate()
    queryset = (
        Payable.objects.select_related("bank", "category")
        .filter(owner=user)
        .order_by("due_date", "id")
    )
    if selected_bank:
        queryset = queryset.filter(bank=selected_bank)
    if start_date:
        queryset = queryset.filter(due_date__gte=start_date)
    if end_date:
        queryset = queryset.filter(due_date__lte=end_date)

    headers = [
        "Vencimento",
        "Titulo",
        "Categoria",
        "Banco",
        "Status",
        "Parcela",
        "Valor",
        "Data pagamento",
        "Obs pagamento",
        "Descricao",
    ]
    detailed_rows = []
    total_pending = Decimal("0.00")
    total_overdue = Decimal("0.00")
    total_paid = Decimal("0.00")
    by_bank = defaultdict(lambda: Decimal("0.00"))
    by_category = defaultdict(lambda: Decimal("0.00"))
    by_status = defaultdict(lambda: Decimal("0.00"))

    for payable in queryset:
        status_label = _payable_status_label_for_report(payable, today)
        installment_label = "-"
        if payable.installment_number and payable.installment_total:
            installment_label = f"{payable.installment_number}/{payable.installment_total}"
        bank_name = payable.bank.name if payable.bank else "Sem banco"
        category_name = payable.category.name if payable.category else payable.get_payable_type_display()
        detailed_rows.append(
            [
                _format_date_br(payable.due_date),
                payable.title,
                category_name,
                bank_name,
                status_label,
                installment_label,
                _format_currency_br(payable.amount),
                _format_date_br(payable.payment_date),
                payable.payment_note or "-",
                payable.description or "-",
            ]
        )
        by_bank[bank_name] += payable.amount
        by_category[category_name] += payable.amount
        by_status[status_label] += payable.amount
        if status_label == "Pago":
            total_paid += payable.amount
        elif status_label == "Vencida":
            total_overdue += payable.amount
        else:
            total_pending += payable.amount

    total_amount = total_pending + total_overdue + total_paid
    detail_label_map = {
        "consolidated": "Consolidado",
        "detailed": "Detalhado",
        "both": "Consolidado + detalhado",
    }
    rows = detailed_rows if detail_level in {"detailed", "both"} else []
    summary = [
        f"Visao: {detail_label_map.get(detail_level, 'Consolidado + detalhado')}",
        f"Periodo: {_format_report_period_label(start_date, end_date)}",
        f"Total de contas: {len(detailed_rows)}",
        f"Total pendente: {_format_currency_br(total_pending)}",
        f"Total vencido: {_format_currency_br(total_overdue)}",
        f"Total pago: {_format_currency_br(total_paid)}",
        f"Total geral: {_format_currency_br(total_amount)}",
    ]
    if detail_level in {"consolidated", "both"}:
        summary.append("Consolidado por banco:")
        for bank_name in sorted(by_bank.keys()):
            summary.append(f"- {bank_name}: {_format_currency_br(by_bank[bank_name])}")
        summary.append("Consolidado por categoria:")
        for category_name in sorted(by_category.keys()):
            summary.append(f"- {category_name}: {_format_currency_br(by_category[category_name])}")
        summary.append("Consolidado por status:")
        for status_name in sorted(by_status.keys()):
            summary.append(f"- {status_name}: {_format_currency_br(by_status[status_name])}")

    scope = selected_bank.name if selected_bank else "Todos os bancos"
    title = (
        f"Relatorio de contas a pagar - {scope} - "
        f"{_format_report_period_label(start_date, end_date)}"
    )
    return title, headers, rows, summary


def _build_cashflow_report_dataset(user, selected_bank, start_date, end_date, detail_level):
    queryset = (
        Transaction.objects.select_related("bank")
        .filter(owner=user)
        .order_by("transaction_date", "id")
    )
    if selected_bank:
        queryset = queryset.filter(bank=selected_bank)
    if start_date:
        queryset = queryset.filter(transaction_date__gte=start_date)
    if end_date:
        queryset = queryset.filter(transaction_date__lte=end_date)

    headers = [
        "Data",
        "Titulo",
        "Tipo",
        "Banco",
        "Valor",
        "Descricao",
    ]
    detailed_rows = []
    total_income = Decimal("0.00")
    total_expense = Decimal("0.00")
    by_bank = defaultdict(lambda: Decimal("0.00"))
    by_type = defaultdict(lambda: Decimal("0.00"))

    for tx in queryset:
        bank_name = tx.bank.name if tx.bank else "Sem banco"
        type_name = tx.get_transaction_type_display()
        detailed_rows.append(
            [
                _format_date_br(tx.transaction_date),
                tx.title,
                type_name,
                bank_name,
                _format_currency_br(tx.amount),
                tx.description or "-",
            ]
        )
        by_bank[bank_name] += tx.amount if tx.transaction_type == Transaction.TransactionType.INCOME else -tx.amount
        by_type[type_name] += tx.amount
        if tx.transaction_type == Transaction.TransactionType.INCOME:
            total_income += tx.amount
        else:
            total_expense += tx.amount

    rows = detailed_rows if detail_level in {"detailed", "both"} else []
    detail_label_map = {
        "consolidated": "Consolidado",
        "detailed": "Detalhado",
        "both": "Consolidado + detalhado",
    }
    summary = [
        f"Visao: {detail_label_map.get(detail_level, 'Consolidado + detalhado')}",
        f"Periodo: {_format_report_period_label(start_date, end_date)}",
        f"Total de transacoes: {len(detailed_rows)}",
        f"Entradas: {_format_currency_br(total_income)}",
        f"Saidas: {_format_currency_br(total_expense)}",
        f"Saldo: {_format_currency_br(total_income - total_expense)}",
    ]
    if detail_level in {"consolidated", "both"}:
        summary.append("Consolidado por banco (saldo):")
        for bank_name in sorted(by_bank.keys()):
            summary.append(f"- {bank_name}: {_format_currency_br(by_bank[bank_name])}")
        summary.append("Consolidado por tipo:")
        for type_name in sorted(by_type.keys()):
            summary.append(f"- {type_name}: {_format_currency_br(by_type[type_name])}")

    scope = selected_bank.name if selected_bank else "Todos os bancos"
    title = (
        f"Relatorio de entradas e saidas - {scope} - "
        f"{_format_report_period_label(start_date, end_date)}"
    )
    return title, headers, rows, summary


def _build_report_dataset(report_type, user, selected_bank, start_date, end_date, detail_level):
    if report_type == "payables":
        return _build_payables_report_dataset(user, selected_bank, start_date, end_date, detail_level)
    return _build_cashflow_report_dataset(user, selected_bank, start_date, end_date, detail_level)


def _build_csv_content(title, headers, rows, summary):
    output = StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow([title])
    writer.writerow([f"Gerado em: {_format_date_br(timezone.localdate())}"])
    writer.writerow([])
    writer.writerow(headers)
    writer.writerows(rows)
    if summary:
        writer.writerow([])
        for line in summary:
            writer.writerow([line])
    return "\ufeff" + output.getvalue()


def _build_excel_content(title, headers, rows, summary):
    def _cell(value, style_id="cell"):
        return (
            f'<Cell ss:StyleID="{style_id}"><Data ss:Type="String">'
            f"{escape(str(value))}"
            "</Data></Cell>"
        )

    xml_rows = []
    xml_rows.append(f"<Row>{_cell(title, 'title')}</Row>")
    xml_rows.append(f"<Row>{_cell(f'Gerado em: {_format_date_br(timezone.localdate())}', 'meta')}</Row>")
    xml_rows.append("<Row></Row>")
    xml_rows.append("<Row>" + "".join(_cell(header, "header") for header in headers) + "</Row>")

    for row in rows:
        xml_rows.append("<Row>" + "".join(_cell(value) for value in row) + "</Row>")

    if summary:
        xml_rows.append("<Row></Row>")
        for line in summary:
            xml_rows.append(f"<Row>{_cell(line, 'meta')}</Row>")

    worksheet_xml = "\n".join(xml_rows)
    return f"""<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="title"><Font ss:Bold="1" ss:Size="13"/></Style>
  <Style ss:ID="header"><Font ss:Bold="1"/></Style>
  <Style ss:ID="meta"><Font ss:Italic="1"/></Style>
  <Style ss:ID="cell"></Style>
 </Styles>
 <Worksheet ss:Name="Relatorio">
  <Table>
{worksheet_xml}
  </Table>
 </Worksheet>
</Workbook>
"""


def _normalize_ascii(value):
    return unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii")


def _escape_pdf_text(value):
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _build_pdf_content(title, headers, rows, summary):
    lines = [
        f"Gerado em: {_format_date_br(timezone.localdate())}",
        "",
        " | ".join(_normalize_ascii(header) for header in headers),
        "-" * 120,
    ]
    for row in rows:
        line = " | ".join(_normalize_ascii(col) for col in row)
        if len(line) > 120:
            line = f"{line[:117]}..."
        lines.append(line)

    if summary:
        lines.extend(["", "Resumo:"])
        lines.extend(_normalize_ascii(item) for item in summary)

    lines_per_page = 46
    paged_lines = [lines[i:i + lines_per_page] for i in range(0, len(lines), lines_per_page)] or [[]]

    objects = {}
    next_id = 1

    def new_object(content):
        nonlocal next_id
        object_id = next_id
        objects[object_id] = content
        next_id += 1
        return object_id

    font_id = new_object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    content_ids = []
    page_ids = []
    normalized_title = _normalize_ascii(title)

    for page_lines in paged_lines:
        stream_lines = [
            "BT",
            "/F1 10 Tf",
            "40 805 Td",
            f"({_escape_pdf_text(normalized_title)}) Tj",
            "0 -18 Td",
        ]
        for line in page_lines:
            stream_lines.append(f"({_escape_pdf_text(line)}) Tj")
            stream_lines.append("0 -14 Td")
        stream_lines.append("ET")
        stream = "\n".join(stream_lines)
        stream_bytes = stream.encode("latin-1", "ignore")
        content_id = new_object(f"<< /Length {len(stream_bytes)} >>\nstream\n{stream}\nendstream")
        page_id = new_object("")
        content_ids.append(content_id)
        page_ids.append(page_id)

    pages_id = new_object("")
    catalog_id = new_object(f"<< /Type /Catalog /Pages {pages_id} 0 R >>")
    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    objects[pages_id] = f"<< /Type /Pages /Count {len(page_ids)} /Kids [{kids}] >>"

    for index, page_id in enumerate(page_ids):
        objects[page_id] = (
            f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 {font_id} 0 R >> >> "
            f"/Contents {content_ids[index]} 0 R >>"
        )

    pdf_output = BytesIO()
    pdf_output.write(b"%PDF-1.4\n")
    object_offsets = {}
    max_object_id = next_id - 1

    for object_id in range(1, max_object_id + 1):
        object_offsets[object_id] = pdf_output.tell()
        pdf_output.write(f"{object_id} 0 obj\n".encode("ascii"))
        pdf_output.write(objects[object_id].encode("latin-1", "ignore"))
        pdf_output.write(b"\nendobj\n")

    xref_position = pdf_output.tell()
    pdf_output.write(f"xref\n0 {max_object_id + 1}\n".encode("ascii"))
    pdf_output.write(b"0000000000 65535 f \n")
    for object_id in range(1, max_object_id + 1):
        pdf_output.write(f"{object_offsets[object_id]:010d} 00000 n \n".encode("ascii"))
    pdf_output.write(
        (
            f"trailer\n<< /Size {max_object_id + 1} /Root {catalog_id} 0 R >>\n"
            f"startxref\n{xref_position}\n%%EOF"
        ).encode("ascii")
    )
    return pdf_output.getvalue()


def _add_months(base_date, month_offset):
    month_index = (base_date.month - 1) + month_offset
    target_year = base_date.year + (month_index // 12)
    target_month = (month_index % 12) + 1
    target_day = min(base_date.day, monthrange(target_year, target_month)[1])
    return base_date.replace(year=target_year, month=target_month, day=target_day)


def _create_installment_plan(cleaned_data, owner):
    installment_total = cleaned_data["installment_total"]
    current_installment = cleaned_data["installment_number"]
    base_due_date = cleaned_data["due_date"]
    current_status = cleaned_data["status"]
    current_payment_date = cleaned_data.get("payment_date")
    current_payment_note = _normalize_payment_note(cleaned_data.get("payment_note"))
    total_amount = cleaned_data["amount"]
    group_id = uuid4()

    # Divide valor total pelo numero de parcelas e distribui centavos restantes.
    unit_amount = (total_amount / installment_total).quantize(Decimal("0.01"), rounding=ROUND_DOWN)
    distributed_total = unit_amount * installment_total
    remainder_cents = int(((total_amount - distributed_total) * 100).quantize(Decimal("1")))

    installment_records = []
    for installment_number in range(1, installment_total + 1):
        month_offset = installment_number - current_installment
        installment_amount = unit_amount + (Decimal("0.01") if installment_number <= remainder_cents else Decimal("0.00"))
        installment_records.append(
            Payable(
                owner=owner,
                bank=cleaned_data["bank"],
                category=cleaned_data.get("category"),
                title=cleaned_data["title"],
                description=cleaned_data["description"],
                payable_type=Payable.PayableType.INSTALLMENT,
                status=current_status if installment_number == current_installment else Payable.PayableStatus.PENDING,
                amount=installment_amount,
                due_date=_add_months(base_due_date, month_offset),
                payment_date=(
                    current_payment_date
                    if installment_number == current_installment and current_status == Payable.PayableStatus.PAID
                    else None
                ),
                payment_note=(
                    current_payment_note
                    if installment_number == current_installment and current_status == Payable.PayableStatus.PAID
                    else ""
                ),
                payment_receipt=None,
                installment_number=installment_number,
                installment_total=installment_total,
                installment_group=group_id,
                is_recurring=False,
            )
        )

    with db_transaction.atomic():
        Payable.objects.bulk_create(installment_records)

    return (
        Payable.objects.select_related("bank", "category")
        .filter(installment_group=group_id, owner=owner)
        .order_by("installment_number")
    )


def _build_installment_plan_start_date(payable):
    installment_number = payable.installment_number or 1
    return _add_months(payable.due_date, -(installment_number - 1))


def _normalize_legacy_installments(owner):
    legacy_installments = list(
        Payable.objects.filter(
            owner=owner,
            payable_type=Payable.PayableType.INSTALLMENT,
            installment_total__gt=1,
            installment_group__isnull=True,
        ).order_by("id")
    )
    if not legacy_installments:
        return

    grouped_legacy_installments = defaultdict(list)
    for payable in legacy_installments:
        grouped_legacy_installments[
            (
                payable.bank_id,
                payable.title,
                payable.description,
                payable.amount,
                payable.installment_total,
                _build_installment_plan_start_date(payable),
            )
        ].append(payable)

    with db_transaction.atomic():
        for grouped_payables in grouped_legacy_installments.values():
            installment_total = grouped_payables[0].installment_total
            plan_start_date = _build_installment_plan_start_date(grouped_payables[0])
            group_id = uuid4()
            updated_payables = []
            existing_installment_numbers = set()

            for payable in grouped_payables:
                payable.installment_group = group_id
                if not payable.installment_number:
                    payable.installment_number = 1
                existing_installment_numbers.add(payable.installment_number)
                updated_payables.append(payable)

            Payable.objects.bulk_update(updated_payables, ["installment_group", "installment_number"])

            missing_installments = []
            for installment_number in range(1, installment_total + 1):
                if installment_number in existing_installment_numbers:
                    continue
                missing_installments.append(
                    Payable(
                        owner=grouped_payables[0].owner,
                        bank=grouped_payables[0].bank,
                        category=grouped_payables[0].category,
                        title=grouped_payables[0].title,
                        description=grouped_payables[0].description,
                        payable_type=Payable.PayableType.INSTALLMENT,
                        status=Payable.PayableStatus.PENDING,
                        amount=grouped_payables[0].amount,
                        due_date=_add_months(plan_start_date, installment_number - 1),
                        payment_date=None,
                        payment_note="",
                        installment_number=installment_number,
                        installment_total=installment_total,
                        installment_group=group_id,
                        is_recurring=False,
                    )
                )

            if missing_installments:
                Payable.objects.bulk_create(missing_installments)


@login_required
def dashboard_home(request):
    _bootstrap_banks(request.user)
    _normalize_legacy_installments(request.user)
    banks = list(Bank.objects.filter(owner=request.user).values("id", "name", "slug", "color", "icon"))
    categories = list(
        PayableCategory.objects.filter(owner=request.user).values("id", "name", "slug", "color")
    )
    transactions = Transaction.objects.select_related("bank").filter(owner=request.user)
    payables = Payable.objects.select_related("bank", "category").filter(owner=request.user)
    events = Event.objects.filter(owner=request.user)
    dashboard_data = {
        "banks": banks,
        "categories": categories,
        "transactions": [_serialize_transaction(tx) for tx in transactions],
        "payables": [_serialize_payable(payable, request=request) for payable in payables],
        "events": [_serialize_event(event) for event in events],
        "today": timezone.localdate().isoformat(),
        "dashboard_widget_order": _get_user_dashboard_widget_order(request.user),
    }
    return render(
        request,
        "dashboard/index.html",
        {"dashboard_data": dashboard_data, "banks": banks, "categories": categories},
    )


@login_required
@require_POST
def dashboard_layout_save(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
            {"ok": False, "errors": {"layout": ["Payload invalido."]}},
            status=400,
        )

    normalized_order = _normalize_dashboard_widget_order(payload.get("order", []))
    layout, _created = UserDashboardLayout.objects.get_or_create(user=request.user)
    layout.widget_order = normalized_order
    layout.save(update_fields=["widget_order", "updated_at"])
    return JsonResponse({"ok": True, "order": normalized_order})


@login_required
def event_list(request):
    events = Event.objects.filter(owner=request.user).order_by("starts_at", "id")
    return JsonResponse({"ok": True, "events": [_serialize_event(event) for event in events]})


@login_required
@require_POST
def event_create(request):
    form = EventForm(request.POST, user=request.user)
    if not form.is_valid():
        return JsonResponse({"ok": False, "errors": _serialize_form_errors(form)}, status=400)

    event = form.save(commit=False)
    event.owner = request.user
    if not event.creator_name:
        event.creator_name = request.user.username
    event.save()
    return JsonResponse({"ok": True, "event": _serialize_event(event)})


@login_required
@require_POST
def event_update(request, event_id):
    event = get_object_or_404(Event, pk=event_id, owner=request.user)
    form = EventForm(request.POST, instance=event, user=request.user)
    if not form.is_valid():
        return JsonResponse({"ok": False, "errors": _serialize_form_errors(form)}, status=400)

    updated_event = form.save(commit=False)
    updated_event.owner = request.user
    if not updated_event.creator_name:
        updated_event.creator_name = request.user.username
    updated_event.save()
    return JsonResponse({"ok": True, "event": _serialize_event(updated_event)})


@login_required
@require_POST
def event_delete(request, event_id):
    event = get_object_or_404(Event, pk=event_id, owner=request.user)
    deleted_id = event.id
    event.delete()
    return JsonResponse({"ok": True, "deleted_id": deleted_id})


@login_required
@require_POST
def transaction_create(request):
    form = TransactionForm(request.POST, user=request.user)
    if not form.is_valid():
        return JsonResponse({"ok": False, "errors": _serialize_form_errors(form)}, status=400)

    transaction = form.save(commit=False)
    transaction.owner = request.user
    transaction.save()
    return JsonResponse({"ok": True, "transaction": _serialize_transaction(transaction)})


@login_required
@require_POST
def transaction_update(request, transaction_id):
    transaction = get_object_or_404(Transaction, pk=transaction_id, owner=request.user)
    form = TransactionForm(request.POST, instance=transaction, user=request.user)
    if not form.is_valid():
        return JsonResponse({"ok": False, "errors": _serialize_form_errors(form)}, status=400)

    updated_transaction = form.save(commit=False)
    updated_transaction.owner = request.user
    updated_transaction.save()
    return JsonResponse({"ok": True, "transaction": _serialize_transaction(updated_transaction)})


@login_required
@require_POST
def transaction_delete(request, transaction_id):
    transaction = get_object_or_404(Transaction, pk=transaction_id, owner=request.user)
    deleted_id = transaction.id
    transaction.delete()
    return JsonResponse({"ok": True, "deleted_id": deleted_id})


@login_required
@require_POST
def payable_create(request):
    form = PayableForm(request.POST, user=request.user)
    if not form.is_valid():
        return JsonResponse({"ok": False, "errors": _serialize_form_errors(form)}, status=400)

    if form.cleaned_data["payable_type"] == Payable.PayableType.INSTALLMENT:
        created_installments = list(_create_installment_plan(form.cleaned_data, owner=request.user))
        return JsonResponse(
            {
                "ok": True,
                "payables": [_serialize_payable(payable, request=request) for payable in created_installments],
            }
        )

    payable = form.save(commit=False)
    payable.owner = request.user
    payable.save()
    return JsonResponse({"ok": True, "payable": _serialize_payable(payable, request=request)})


@login_required
@require_POST
def payable_update(request, payable_id):
    payable = get_object_or_404(Payable, pk=payable_id, owner=request.user)
    before_snapshot = _snapshot_payable_status(payable)
    form = PayableForm(request.POST, instance=payable, user=request.user)
    if not form.is_valid():
        return JsonResponse({"ok": False, "errors": _serialize_form_errors(form)}, status=400)

    updated_payable = form.save(commit=False)
    updated_payable.owner = request.user
    if updated_payable.status == Payable.PayableStatus.PENDING and updated_payable.payment_receipt:
        _delete_payable_receipt_file(updated_payable)
    updated_payable.save()
    _create_payable_history_entry(
        updated_payable,
        before_snapshot=before_snapshot,
        changed_by=request.user,
        source="form_update",
    )
    return JsonResponse({"ok": True, "payable": _serialize_payable(updated_payable, request=request)})


@login_required
@require_POST
def payable_delete(request, payable_id):
    payable = get_object_or_404(Payable, pk=payable_id, owner=request.user)
    if payable.payable_type == Payable.PayableType.INSTALLMENT and payable.installment_group:
        group_qs = Payable.objects.filter(installment_group=payable.installment_group, owner=request.user)
        for installment in group_qs:
            _delete_payable_receipt_file(installment)
        deleted_ids = list(group_qs.values_list("id", flat=True))
        deleted_group = str(payable.installment_group)
        group_qs.delete()
        return JsonResponse({"ok": True, "deleted_ids": deleted_ids, "deleted_group": deleted_group})

    _delete_payable_receipt_file(payable)
    deleted_id = payable.id
    payable.delete()
    return JsonResponse({"ok": True, "deleted_id": deleted_id, "deleted_ids": [deleted_id]})


@login_required
@require_POST
def payable_status_update(request, payable_id):
    payable = get_object_or_404(Payable, pk=payable_id, owner=request.user)
    before_snapshot = _snapshot_payable_status(payable)
    status = request.POST.get("status")
    raw_payment_date = request.POST.get("payment_date")
    payment_note = _normalize_payment_note(request.POST.get("payment_note"))

    if status not in (Payable.PayableStatus.PENDING, Payable.PayableStatus.PAID):
        return JsonResponse(
            {
                "ok": False,
                "errors": {"status": ["Status invalido."]},
            },
            status=400,
        )

    parsed_payment_date = _parse_optional_date(raw_payment_date)
    if raw_payment_date and not parsed_payment_date:
        return JsonResponse(
            {
                "ok": False,
                "errors": {"payment_date": ["Data de pagamento invalida."]},
            },
            status=400,
        )

    if status == Payable.PayableStatus.PAID:
        _apply_payable_status(
            payable,
            status=status,
            payment_date=parsed_payment_date or timezone.localdate(),
            payment_note=payment_note,
        )
    else:
        _apply_payable_status(payable, status=status, clear_receipt=True)

    payable.save(update_fields=["status", "payment_date", "payment_note", "payment_receipt", "updated_at"])
    _create_payable_history_entry(
        payable,
        before_snapshot=before_snapshot,
        changed_by=request.user,
        source="status_update",
    )
    return JsonResponse({"ok": True, "payable": _serialize_payable(payable, request=request)})


@login_required
@require_POST
def payable_installment_bulk_update(request, payable_id):
    reference_payable = get_object_or_404(Payable, pk=payable_id, owner=request.user)
    if (
        reference_payable.payable_type != Payable.PayableType.INSTALLMENT
        or not reference_payable.installment_group
    ):
        return JsonResponse(
            {
                "ok": False,
                "errors": {
                    "installment": ["Conta selecionada nao pertence a um grupo de parcelamento."],
                },
            },
            status=400,
        )

    action = request.POST.get("action")
    valid_actions = {"pay_until", "pay_all", "reopen_all"}
    if action not in valid_actions:
        return JsonResponse(
            {
                "ok": False,
                "errors": {"action": ["Acao invalida."]},
            },
            status=400,
        )

    installments = list(
        Payable.objects.filter(
            installment_group=reference_payable.installment_group,
            owner=request.user,
        )
        .order_by("installment_number", "id")
    )
    if not installments:
        return JsonResponse({"ok": False, "errors": {"installment": ["Nenhuma parcela encontrada."]}}, status=404)

    current_timestamp = timezone.now()
    changed_installments = []
    history_entries = []

    if action == "reopen_all":
        for installment in installments:
            before_snapshot = _snapshot_payable_status(installment)
            _apply_payable_status(
                installment,
                status=Payable.PayableStatus.PENDING,
                clear_receipt=True,
            )
            installment.updated_at = current_timestamp
            changed_installments.append(installment)
            history_entry = _build_payable_history_entry(
                installment,
                before_snapshot=before_snapshot,
                changed_by=request.user,
                source="bulk_reopen_all",
            )
            if history_entry:
                history_entries.append(history_entry)
    else:
        raw_payment_date = request.POST.get("payment_date")
        parsed_payment_date = _parse_optional_date(raw_payment_date)
        if raw_payment_date and not parsed_payment_date:
            return JsonResponse(
                {
                    "ok": False,
                    "errors": {"payment_date": ["Data de pagamento invalida."]},
                },
                status=400,
            )
        payment_date = parsed_payment_date or timezone.localdate()
        payment_note = _normalize_payment_note(request.POST.get("payment_note"))

        if action == "pay_until":
            raw_until_installment = request.POST.get("until_installment")
            try:
                until_installment = int(raw_until_installment)
            except (TypeError, ValueError):
                return JsonResponse(
                    {
                        "ok": False,
                        "errors": {"until_installment": ["Informe uma parcela valida."]},
                    },
                    status=400,
                )
            if until_installment < 1 or until_installment > len(installments):
                return JsonResponse(
                    {
                        "ok": False,
                        "errors": {"until_installment": ["Parcela fora do intervalo permitido."]},
                    },
                    status=400,
                )
        else:
            until_installment = len(installments)

        for installment in installments:
            installment_number = installment.installment_number or 0
            if installment_number > until_installment:
                continue
            before_snapshot = _snapshot_payable_status(installment)
            _apply_payable_status(
                installment,
                status=Payable.PayableStatus.PAID,
                payment_date=payment_date,
                payment_note=payment_note,
            )
            installment.updated_at = current_timestamp
            changed_installments.append(installment)
            history_entry = _build_payable_history_entry(
                installment,
                before_snapshot=before_snapshot,
                changed_by=request.user,
                source=f"bulk_{action}",
            )
            if history_entry:
                history_entries.append(history_entry)

    if changed_installments:
        Payable.objects.bulk_update(
            changed_installments,
            ["status", "payment_date", "payment_note", "payment_receipt", "updated_at"],
        )
    if history_entries:
        PayableStatusHistory.objects.bulk_create(history_entries)

    refreshed_installments = (
        Payable.objects.select_related("bank", "category")
        .filter(installment_group=reference_payable.installment_group, owner=request.user)
        .order_by("installment_number", "id")
    )
    return JsonResponse(
        {
            "ok": True,
            "payables": [_serialize_payable(payable, request=request) for payable in refreshed_installments],
            "group": str(reference_payable.installment_group),
        }
    )


@login_required
@require_POST
def payable_bulk_action(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
            {"ok": False, "errors": {"payload": ["Payload invalido."]}},
            status=400,
        )

    action = payload.get("action")
    payable_ids_raw = payload.get("payable_ids", [])
    if action not in {"mark_paid", "mark_pending", "delete"}:
        return JsonResponse(
            {"ok": False, "errors": {"action": ["Acao invalida."]}},
            status=400,
        )
    if not isinstance(payable_ids_raw, list) or not payable_ids_raw:
        return JsonResponse(
            {"ok": False, "errors": {"payable_ids": ["Selecione ao menos uma conta."]}},
            status=400,
        )

    payable_ids = []
    for raw_id in payable_ids_raw:
        try:
            parsed_id = int(raw_id)
        except (TypeError, ValueError):
            return JsonResponse(
                {"ok": False, "errors": {"payable_ids": ["Lista de contas invalida."]}},
                status=400,
            )
        if parsed_id > 0 and parsed_id not in payable_ids:
            payable_ids.append(parsed_id)

    if not payable_ids:
        return JsonResponse(
            {"ok": False, "errors": {"payable_ids": ["Selecione ao menos uma conta valida."]}},
            status=400,
        )

    target_payables = list(
        Payable.objects.select_related("bank", "category")
        .filter(owner=request.user, id__in=payable_ids)
        .order_by("due_date", "id")
    )
    if not target_payables:
        return JsonResponse(
            {"ok": False, "errors": {"payable_ids": ["Nenhuma conta encontrada para o usuario atual."]}},
            status=404,
        )

    if action == "delete":
        deleted_ids = [payable.id for payable in target_payables]
        with db_transaction.atomic():
            for payable in target_payables:
                _delete_payable_receipt_file(payable)
            Payable.objects.filter(owner=request.user, id__in=deleted_ids).delete()
        return JsonResponse({"ok": True, "action": action, "deleted_ids": deleted_ids})

    raw_payment_date = payload.get("payment_date")
    payment_date = _parse_optional_date(raw_payment_date)
    if raw_payment_date and not payment_date:
        return JsonResponse(
            {"ok": False, "errors": {"payment_date": ["Data de pagamento invalida."]}},
            status=400,
        )
    payment_note = _normalize_payment_note(payload.get("payment_note"))

    current_timestamp = timezone.now()
    updated_payables = []
    history_entries = []
    with db_transaction.atomic():
        for payable in target_payables:
            before_snapshot = _snapshot_payable_status(payable)
            if action == "mark_paid":
                _apply_payable_status(
                    payable,
                    status=Payable.PayableStatus.PAID,
                    payment_date=payment_date or timezone.localdate(),
                    payment_note=payment_note,
                )
            else:
                _apply_payable_status(
                    payable,
                    status=Payable.PayableStatus.PENDING,
                    clear_receipt=True,
                )
            payable.updated_at = current_timestamp
            updated_payables.append(payable)
            history_entry = _build_payable_history_entry(
                payable,
                before_snapshot=before_snapshot,
                changed_by=request.user,
                source=f"bulk_{action}",
            )
            if history_entry:
                history_entries.append(history_entry)

        Payable.objects.bulk_update(
            updated_payables,
            ["status", "payment_date", "payment_note", "payment_receipt", "updated_at"],
        )
        if history_entries:
            PayableStatusHistory.objects.bulk_create(history_entries)

    refreshed_payables = (
        Payable.objects.select_related("bank", "category")
        .filter(owner=request.user, id__in=[payable.id for payable in updated_payables])
        .order_by("due_date", "id")
    )
    return JsonResponse(
        {
            "ok": True,
            "action": action,
            "payables": [_serialize_payable(payable, request=request) for payable in refreshed_payables],
        }
    )


@login_required
@require_POST
def payable_receipt_upload(request, payable_id):
    payable = get_object_or_404(Payable, pk=payable_id, owner=request.user)
    if payable.status != Payable.PayableStatus.PAID:
        return JsonResponse(
            {"ok": False, "errors": {"receipt": ["Marque a parcela como paga antes de anexar comprovante."]}},
            status=400,
        )

    uploaded_receipt = request.FILES.get("receipt")
    if not uploaded_receipt:
        return JsonResponse(
            {"ok": False, "errors": {"receipt": ["Selecione um arquivo de comprovante."]}},
            status=400,
        )

    allowed_extensions = {".pdf", ".png", ".jpg", ".jpeg", ".webp"}
    extension = os.path.splitext(uploaded_receipt.name)[1].lower()
    if extension not in allowed_extensions:
        return JsonResponse(
            {
                "ok": False,
                "errors": {"receipt": ["Formato invalido. Use PDF, PNG, JPG, JPEG ou WEBP."]},
            },
            status=400,
        )

    if uploaded_receipt.size > 8 * 1024 * 1024:
        return JsonResponse(
            {"ok": False, "errors": {"receipt": ["Arquivo muito grande. Limite de 8MB."]}},
            status=400,
        )

    if payable.payment_receipt:
        _delete_payable_receipt_file(payable)

    payable.payment_receipt = uploaded_receipt
    payable.save(update_fields=["payment_receipt", "updated_at"])
    return JsonResponse({"ok": True, "payable": _serialize_payable(payable, request=request)})


@login_required
@require_POST
def payable_receipt_delete(request, payable_id):
    payable = get_object_or_404(Payable, pk=payable_id, owner=request.user)
    if not payable.payment_receipt:
        return JsonResponse(
            {"ok": False, "errors": {"receipt": ["Nenhum comprovante anexado nesta parcela."]}},
            status=400,
        )

    _delete_payable_receipt_file(payable)
    payable.save(update_fields=["payment_receipt", "updated_at"])
    return JsonResponse({"ok": True, "payable": _serialize_payable(payable, request=request)})


@login_required
def payable_receipt_view(request, payable_id):
    payable = get_object_or_404(Payable, pk=payable_id, owner=request.user)
    if not payable.payment_receipt:
        raise Http404("Comprovante nao encontrado.")

    file_path = payable.payment_receipt.path
    if not os.path.exists(file_path):
        raise Http404("Comprovante nao encontrado.")

    content_type, _encoding = mimetypes.guess_type(file_path)
    response = FileResponse(
        payable.payment_receipt.open("rb"),
        as_attachment=False,
        filename=os.path.basename(file_path),
    )
    if content_type:
        response["Content-Type"] = content_type
    return response


@login_required
def payable_history_list(request, payable_id):
    payable = get_object_or_404(Payable, pk=payable_id, owner=request.user)
    history = list(
        PayableStatusHistory.objects.select_related("changed_by")
        .filter(payable=payable)
        .order_by("-changed_at", "-id")[:120]
    )
    return JsonResponse(
        {
            "ok": True,
            "payable_id": payable.id,
            "history": [_serialize_payable_history_item(item) for item in history],
        }
    )


@login_required
def report_export(request):
    report_type = request.GET.get("report_type", "cashflow")
    report_format = request.GET.get("format", "csv")
    bank_param = request.GET.get("bank", "all")
    detail_level = request.GET.get("detail_level", "both")
    start_param = request.GET.get("start_date", "")
    end_param = request.GET.get("end_date", "")

    if report_type not in {"cashflow", "payables"}:
        return JsonResponse(
            {"ok": False, "errors": {"report_type": ["Tipo de relatorio invalido."]}},
            status=400,
        )
    if report_format not in {"csv", "excel", "pdf"}:
        return JsonResponse(
            {"ok": False, "errors": {"format": ["Formato de exportacao invalido."]}},
            status=400,
        )
    if detail_level not in {"consolidated", "detailed", "both"}:
        return JsonResponse(
            {"ok": False, "errors": {"detail_level": ["Nivel de detalhamento invalido."]}},
            status=400,
        )

    try:
        selected_bank = _get_report_bank(request.user, bank_param)
        start_date, end_date = _parse_report_period(start_param, end_param)
    except ValueError as exc:
        field = "bank"
        message = str(exc)
        if "Data inicial" in message:
            field = "start_date"
        elif "Data final" in message or "Data inicial nao pode" in message:
            field = "end_date"
        return JsonResponse({"ok": False, "errors": {field: [message]}}, status=400)

    title, headers, rows, summary = _build_report_dataset(
        report_type,
        request.user,
        selected_bank,
        start_date,
        end_date,
        detail_level,
    )
    file_name = _get_report_file_name(
        report_type,
        report_format,
        selected_bank,
        start_date,
        end_date,
        detail_level,
    )

    if report_format == "csv":
        content = _build_csv_content(title, headers, rows, summary)
        response = HttpResponse(content, content_type="text/csv; charset=utf-8")
    elif report_format == "excel":
        content = _build_excel_content(title, headers, rows, summary)
        response = HttpResponse(content, content_type="application/vnd.ms-excel")
    else:
        content = _build_pdf_content(title, headers, rows, summary)
        response = HttpResponse(content, content_type="application/pdf")

    response["Content-Disposition"] = f'attachment; filename="{file_name}"'
    return response


@login_required
@require_POST
def payable_category_create(request):
    form = PayableCategoryForm(request.POST, user=request.user)
    if not form.is_valid():
        return JsonResponse({"ok": False, "errors": _serialize_form_errors(form)}, status=400)

    category = form.save(commit=False)
    category.owner = request.user
    category.save()
    return JsonResponse({"ok": True, "category": _serialize_payable_category(category)})


@login_required
@require_POST
def payable_category_delete(request, category_id):
    category = get_object_or_404(PayableCategory, pk=category_id, owner=request.user)
    deleted_id = category.id
    category.delete()
    return JsonResponse({"ok": True, "deleted_id": deleted_id})


@login_required
@require_POST
def bank_create(request):
    form = BankForm(request.POST, user=request.user)
    if not form.is_valid():
        return JsonResponse({"ok": False, "errors": _serialize_form_errors(form)}, status=400)

    bank = form.save(commit=False)
    bank.owner = request.user
    bank.save()
    return JsonResponse({"ok": True, "bank": _serialize_bank(bank)})


@login_required
@require_POST
def bank_delete(request, bank_id):
    bank = get_object_or_404(Bank, pk=bank_id, owner=request.user)
    deleted_id = bank.id
    try:
        bank.delete()
    except ProtectedError:
        return JsonResponse(
            {
                "ok": False,
                "errors": {
                    "bank": [
                        "Nao foi possivel remover. Este banco possui transacoes vinculadas.",
                    ]
                },
            },
            status=400,
        )
    return JsonResponse({"ok": True, "deleted_id": deleted_id})





def _parse_event_datetime(value):
    if not value:
        return timezone.now()

    dt = parse_datetime(value)

    if dt is None:
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            return timezone.now()

    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())

    return dt


def _normalize_status(status_value):
    valid_status = {
        Event.EventStatus.PENDING,
        Event.EventStatus.COMPLETED,
        Event.EventStatus.CANCELED,
    }
    return status_value if status_value in valid_status else Event.EventStatus.PENDING


@login_required
@transaction.atomic
def import_events_json(request):
    if request.method == "GET":
        return render(request, "events/import_events.html")

    is_ajax = request.headers.get("X-Requested-With") == "XMLHttpRequest"

    json_file = request.FILES.get("json_file")
    if not json_file:
        if is_ajax:
            return JsonResponse({"message": "Envie um arquivo JSON.", "errors": []}, status=400)
        messages.error(request, "Envie um arquivo JSON.")
        return redirect("import_events_json")

    try:
        payload = json.load(json_file)
    except json.JSONDecodeError:
        if is_ajax:
            return JsonResponse({"message": "Arquivo JSON inválido.", "errors": []}, status=400)
        messages.error(request, "Arquivo JSON inválido.")
        return redirect("import_events_json")

    if not isinstance(payload, list):
        if is_ajax:
            return JsonResponse({"message": "Formato inválido. Esperado uma lista de objetos.", "errors": []}, status=400)
        messages.error(request, "Formato inválido. Esperado uma lista de objetos.")
        return redirect("import_events_json")

    imported = 0
    skipped = 0
    errors = []

    for idx, item in enumerate(payload, start=1):
        try:
            fields = item.get("fields", {}) if isinstance(item, dict) else {}

            title = (fields.get("title") or "").strip()
            if not title:
                skipped += 1
                errors.append(f"Item {idx}: título vazio.")
                continue

            starts_at = _parse_event_datetime(fields.get("event_date"))

            event = Event(
                owner=request.user,
                title=title[:140],
                creator_name=(fields.get("creator_name") or "").strip()[:120],
                starts_at=starts_at,
                description=(fields.get("description") or "").strip()[:500],
                color=(fields.get("color") or "#4F46E5")[:7],
                status=_normalize_status(fields.get("status")),
                importance=Event.EventImportance.MEDIUM,
                reminder_minutes_before=60,
                all_day=False,
                location="",
                ends_at=None,
            )

            event.full_clean()
            event.save()

            imported += 1

        except ValidationError as e:
            skipped += 1
            if hasattr(e, "message_dict"):
                errors.append(f"Item {idx}: erro de validação -> {e.message_dict}")
            else:
                errors.append(f"Item {idx}: erro de validação -> {e.messages}")
        except Exception as e:
            skipped += 1
            errors.append(f"Item {idx}: erro inesperado -> {str(e)}")

    success_message = f"Importação concluída. Importados: {imported} | Ignorados: {skipped}"

    if is_ajax:
        return JsonResponse({
            "ok": True,
            "message": success_message,
            "imported": imported,
            "skipped": skipped,
            "errors": errors[:100],
        }, status=200)

    messages.success(request, success_message)
    request.session["import_events_errors"] = errors[:100]
    return redirect("import_events_json")