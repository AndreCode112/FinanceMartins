from decimal import Decimal
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import models
from django.test import TestCase, override_settings
from django.urls import reverse

from .models import Bank, Event, Payable, PayableCategory, Transaction, UserDashboardLayout


class DashboardCrudTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.test_media_root = tempfile.mkdtemp(prefix="finances-test-media-")
        cls.media_override = override_settings(MEDIA_ROOT=cls.test_media_root)
        cls.media_override.enable()

    @classmethod
    def tearDownClass(cls):
        cls.media_override.disable()
        shutil.rmtree(cls.test_media_root, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(username="andre", password="123456Teste!")
        self.client.force_login(self.user)
        self.bank, _ = Bank.objects.get_or_create(
            owner=self.user,
            slug="nubank",
            defaults={"name": "Nubank", "color": "#8A05BE", "icon": "ph-credit-card"},
        )

    def test_dashboard_renders(self):
        response = self.client.get(reverse("dashboard_home"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Painel Financeiro")
        self.assertContains(response, "Contas a Pagar")

    def test_dashboard_requires_login(self):
        self.client.logout()
        response = self.client.get(reverse("dashboard_home"))
        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse("login"), response.url)

    def test_api_requires_login(self):
        self.client.logout()
        response = self.client.post(reverse("transaction_create"), {})
        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse("login"), response.url)

    def test_dashboard_layout_save_endpoint(self):
        response = self.client.post(
            reverse("dashboard_layout_save"),
            data='{"order":["reports","summary_cards","transactions_table"]}',
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        layout = UserDashboardLayout.objects.get(user=self.user)
        self.assertEqual(
            layout.widget_order,
            [
                "reports",
                "summary_cards",
                "transactions_table",
                "reminders",
                "reconciliation",
                "monthly_chart",
                "search_filters",
            ],
        )

    def test_create_transaction(self):
        response = self.client.post(
            reverse("transaction_create"),
            {
                "bank": self.bank.id,
                "title": "Freelance",
                "description": "Projeto",
                "transaction_type": "income",
                "amount": "1450.50",
                "transaction_date": "2026-02-10",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        self.assertEqual(Transaction.objects.count(), 1)

    def test_create_event(self):
        response = self.client.post(
            reverse("event_create"),
            {
                "title": "Reuniao mensal",
                "creator_name": "Andre",
                "starts_at": "2026-02-25T09:30",
                "ends_at": "2026-02-25T10:30",
                "description": "Revisar metas",
                "location": "Sala 1",
                "color": "#4F46E5",
                "status": "pending",
                "importance": "high",
                "reminder_minutes_before": "45",
                "all_day": "",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        self.assertEqual(Event.objects.filter(owner=self.user).count(), 1)
        self.assertEqual(Event.objects.get(owner=self.user).importance, "high")

    def test_create_bank(self):
        response = self.client.post(
            reverse("bank_create"),
            {
                "name": "Santander",
                "color": "#D71E28",
                "icon": "ph-bank",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        self.assertTrue(Bank.objects.filter(name="Santander").exists())

    def test_create_payable_category(self):
        response = self.client.post(
            reverse("payable_category_create"),
            {
                "name": "Educacao",
                "color": "#1F7A8C",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        self.assertTrue(PayableCategory.objects.filter(owner=self.user, name="Educacao").exists())

    def test_update_transaction(self):
        transaction = Transaction.objects.create(
            owner=self.user,
            bank=self.bank,
            title="Mercado",
            description="Compra",
            transaction_type="expense",
            amount="250.00",
            transaction_date="2026-02-11",
        )

        response = self.client.post(
            reverse("transaction_update", kwargs={"transaction_id": transaction.id}),
            {
                "bank": self.bank.id,
                "title": "Mercado Mensal",
                "description": "Compra completa",
                "transaction_type": "expense",
                "amount": "320.00",
                "transaction_date": "2026-02-11",
            },
        )

        transaction.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        self.assertEqual(transaction.title, "Mercado Mensal")
        self.assertEqual(str(transaction.amount), "320.00")

    def test_update_event(self):
        event = Event.objects.create(
            owner=self.user,
            title="Planejamento",
            creator_name="Andre",
            starts_at="2026-02-25T09:00:00Z",
            ends_at="2026-02-25T11:00:00Z",
            description="Mensal",
            location="Escritorio",
            color="#4F46E5",
            status="pending",
            importance="medium",
            reminder_minutes_before=60,
            all_day=False,
        )

        response = self.client.post(
            reverse("event_update", kwargs={"event_id": event.id}),
            {
                "title": "Planejamento trimestral",
                "creator_name": "Andre",
                "starts_at": "2026-02-25T10:00",
                "ends_at": "2026-02-25T12:00",
                "description": "Atualizado",
                "location": "Sala 2",
                "color": "#2E8064",
                "status": "completed",
                "importance": "critical",
                "reminder_minutes_before": "30",
                "all_day": "on",
            },
        )

        event.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        self.assertEqual(event.title, "Planejamento trimestral")
        self.assertEqual(event.status, "completed")
        self.assertEqual(event.importance, "critical")
        self.assertTrue(event.all_day)

    def test_delete_transaction(self):
        transaction = Transaction.objects.create(
            owner=self.user,
            bank=self.bank,
            title="Cinema",
            description="Lazer",
            transaction_type="expense",
            amount="70.00",
            transaction_date="2026-02-11",
        )

        response = self.client.post(
            reverse("transaction_delete", kwargs={"transaction_id": transaction.id})
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        self.assertEqual(Transaction.objects.count(), 0)

    def test_delete_event(self):
        event = Event.objects.create(
            owner=self.user,
            title="Evento apagar",
            creator_name="Andre",
            starts_at="2026-02-25T09:00:00Z",
            status="pending",
            importance="medium",
            reminder_minutes_before=60,
        )

        response = self.client.post(reverse("event_delete", kwargs={"event_id": event.id}))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        self.assertEqual(Event.objects.filter(owner=self.user).count(), 0)

    def test_create_payable(self):
        category = PayableCategory.objects.create(
            owner=self.user,
            name="Streaming",
            slug="streaming",
            color="#5D7084",
        )
        response = self.client.post(
            reverse("payable_create"),
            {
                "bank": self.bank.id,
                "category": category.id,
                "title": "Netflix",
                "description": "Plano mensal",
                "payable_type": "subscription",
                "status": "pending",
                "amount": "59.90",
                "due_date": "2026-02-22",
                "is_recurring": "on",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        self.assertEqual(Payable.objects.count(), 1)
        self.assertTrue(Payable.objects.first().is_recurring)
        self.assertEqual(Payable.objects.first().category_id, category.id)

    def test_update_payable(self):
        payable = Payable.objects.create(
            owner=self.user,
            bank=self.bank,
            title="Curso",
            description="Parcela",
            payable_type="installment",
            status="pending",
            amount="120.00",
            due_date="2026-02-25",
            installment_number=2,
            installment_total=10,
        )

        response = self.client.post(
            reverse("payable_update", kwargs={"payable_id": payable.id}),
            {
                "bank": self.bank.id,
                "title": "Curso Online",
                "description": "Parcela atualizada",
                "payable_type": "installment",
                "status": "paid",
                "amount": "120.00",
                "due_date": "2026-02-25",
                "installment_number": "3",
                "installment_total": "10",
            },
        )

        payable.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        self.assertEqual(payable.title, "Curso Online")
        self.assertEqual(payable.status, "paid")
        self.assertEqual(payable.installment_number, 3)

    def test_delete_payable(self):
        payable = Payable.objects.create(
            owner=self.user,
            bank=self.bank,
            title="Cartao",
            description="Fatura",
            payable_type="invoice",
            status="pending",
            amount="850.00",
            due_date="2026-02-28",
        )

        response = self.client.post(reverse("payable_delete", kwargs={"payable_id": payable.id}))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        self.assertEqual(Payable.objects.count(), 0)

    def test_delete_bank_with_transactions_should_fail(self):
        Transaction.objects.create(
            owner=self.user,
            bank=self.bank,
            title="Pagamento",
            description="Teste",
            transaction_type="income",
            amount="100.00",
            transaction_date="2026-02-10",
        )

        response = self.client.post(reverse("bank_delete", kwargs={"bank_id": self.bank.id}))

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["ok"])
        self.assertTrue(Bank.objects.filter(id=self.bank.id).exists())

    def test_delete_bank_without_transactions_should_succeed(self):
        free_bank = Bank.objects.create(
            owner=self.user,
            name="C6",
            slug="c6",
            color="#1E1E1E",
            icon="ph-credit-card",
        )

        response = self.client.post(reverse("bank_delete", kwargs={"bank_id": free_bank.id}))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        self.assertFalse(Bank.objects.filter(id=free_bank.id).exists())

    def test_create_installment_plan_generates_all_installments(self):
        response = self.client.post(
            reverse("payable_create"),
            {
                "bank": self.bank.id,
                "title": "Notebook",
                "description": "Compra parcelada",
                "payable_type": "installment",
                "status": "pending",
                "amount": "300.00",
                "due_date": "2026-03-10",
                "installment_total": "12",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        self.assertEqual(Payable.objects.filter(title="Notebook").count(), 12)
        self.assertEqual(len(response.json()["payables"]), 12)

        first_installment = Payable.objects.get(title="Notebook", installment_number=1)
        last_installment = Payable.objects.get(title="Notebook", installment_number=12)
        self.assertIsNotNone(first_installment.installment_group)
        self.assertEqual(first_installment.installment_group, last_installment.installment_group)
        self.assertEqual(first_installment.amount, Decimal("25.00"))
        self.assertEqual(
            Payable.objects.filter(title="Notebook").aggregate(total=models.Sum("amount"))["total"],
            Decimal("300.00"),
        )

    def test_payable_status_update_endpoint(self):
        payable = Payable.objects.create(
            owner=self.user,
            bank=self.bank,
            title="Curso",
            description="Parcela",
            payable_type="installment",
            status="pending",
            amount="150.00",
            due_date="2026-02-15",
            installment_number=1,
            installment_total=6,
        )

        response = self.client.post(
            reverse("payable_status_update", kwargs={"payable_id": payable.id}),
            {"status": "paid"},
        )

        payable.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        self.assertEqual(payable.status, "paid")

    def test_payable_status_update_tracks_payment_date_and_note(self):
        payable = Payable.objects.create(
            owner=self.user,
            bank=self.bank,
            title="Energia",
            description="Conta mensal",
            payable_type="invoice",
            status="pending",
            amount="210.00",
            due_date="2026-02-21",
        )

        paid_response = self.client.post(
            reverse("payable_status_update", kwargs={"payable_id": payable.id}),
            {"status": "paid", "payment_date": "2026-02-20", "payment_note": "Pago no app"},
        )
        payable.refresh_from_db()
        self.assertEqual(paid_response.status_code, 200)
        self.assertEqual(payable.status, "paid")
        self.assertEqual(str(payable.payment_date), "2026-02-20")
        self.assertEqual(payable.payment_note, "Pago no app")

        pending_response = self.client.post(
            reverse("payable_status_update", kwargs={"payable_id": payable.id}),
            {"status": "pending"},
        )
        payable.refresh_from_db()
        self.assertEqual(pending_response.status_code, 200)
        self.assertEqual(payable.status, "pending")
        self.assertIsNone(payable.payment_date)
        self.assertEqual(payable.payment_note, "")

    def test_payable_status_update_pending_clears_receipt(self):
        payable = Payable.objects.create(
            owner=self.user,
            bank=self.bank,
            title="Seguro",
            description="Mensal",
            payable_type="invoice",
            status="paid",
            amount="180.00",
            due_date="2026-02-21",
            payment_date="2026-02-20",
        )
        payable.payment_receipt.save(
            "comprovante.pdf",
            SimpleUploadedFile("comprovante.pdf", b"%PDF-1.4\nstatus\n", content_type="application/pdf"),
            save=True,
        )

        response = self.client.post(
            reverse("payable_status_update", kwargs={"payable_id": payable.id}),
            {"status": "pending"},
        )

        payable.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertFalse(payable.payment_receipt)
        self.assertIsNone(response.json()["payable"]["payment_receipt_url"])
        self.assertIsNone(response.json()["payable"]["payment_receipt_name"])

    def test_payable_bulk_action_mark_paid(self):
        payable_one = Payable.objects.create(
            owner=self.user,
            bank=self.bank,
            title="Conta 1",
            description="Teste",
            payable_type="invoice",
            status="pending",
            amount="120.00",
            due_date="2026-02-21",
        )
        payable_two = Payable.objects.create(
            owner=self.user,
            bank=self.bank,
            title="Conta 2",
            description="Teste",
            payable_type="debt",
            status="pending",
            amount="80.00",
            due_date="2026-02-22",
        )

        response = self.client.post(
            reverse("payable_bulk_action"),
            data='{"action":"mark_paid","payable_ids":[%d,%d],"payment_date":"2026-02-20","payment_note":"Lote"}'
            % (payable_one.id, payable_two.id),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        payable_one.refresh_from_db()
        payable_two.refresh_from_db()
        self.assertEqual(payable_one.status, "paid")
        self.assertEqual(str(payable_one.payment_date), "2026-02-20")
        self.assertEqual(payable_one.payment_note, "Lote")
        self.assertEqual(payable_two.status, "paid")
        self.assertEqual(str(payable_two.payment_date), "2026-02-20")

    def test_payable_bulk_action_delete(self):
        payable_one = Payable.objects.create(
            owner=self.user,
            bank=self.bank,
            title="Conta A",
            description="Teste",
            payable_type="invoice",
            status="pending",
            amount="40.00",
            due_date="2026-02-21",
        )
        payable_two = Payable.objects.create(
            owner=self.user,
            bank=self.bank,
            title="Conta B",
            description="Teste",
            payable_type="invoice",
            status="pending",
            amount="60.00",
            due_date="2026-02-21",
        )

        response = self.client.post(
            reverse("payable_bulk_action"),
            data='{"action":"delete","payable_ids":[%d,%d]}' % (payable_one.id, payable_two.id),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        self.assertEqual(Payable.objects.filter(owner=self.user, id__in=[payable_one.id, payable_two.id]).count(), 0)

    def test_payable_category_delete_detaches_from_payables(self):
        category = PayableCategory.objects.create(
            owner=self.user,
            name="Servicos",
            slug="servicos",
            color="#5D7084",
        )
        payable = Payable.objects.create(
            owner=self.user,
            bank=self.bank,
            category=category,
            title="Internet",
            description="Teste",
            payable_type="invoice",
            status="pending",
            amount="99.90",
            due_date="2026-02-21",
        )

        response = self.client.post(reverse("payable_category_delete", kwargs={"category_id": category.id}))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        payable.refresh_from_db()
        self.assertIsNone(payable.category_id)

    def test_user_cannot_update_other_user_payable(self):
        user_model = get_user_model()
        other_user = user_model.objects.create_user(username="ana", password="123456Teste!")
        payable = Payable.objects.create(
            owner=other_user,
            bank=None,
            title="Conta privada",
            description="Nao deve aparecer",
            payable_type="invoice",
            status="pending",
            amount="90.00",
            due_date="2026-02-22",
        )

        response = self.client.post(
            reverse("payable_status_update", kwargs={"payable_id": payable.id}),
            {"status": "paid"},
        )

        self.assertEqual(response.status_code, 404)

    def test_user_cannot_update_other_user_event(self):
        user_model = get_user_model()
        other_user = user_model.objects.create_user(username="maria", password="123456Teste!")
        event = Event.objects.create(
            owner=other_user,
            title="Privado",
            creator_name="Maria",
            starts_at="2026-02-28T09:00:00Z",
            status="pending",
            importance="medium",
            reminder_minutes_before=30,
        )

        response = self.client.post(
            reverse("event_update", kwargs={"event_id": event.id}),
            {
                "title": "Tentativa",
                "creator_name": "Andre",
                "starts_at": "2026-02-28T10:00",
                "status": "pending",
                "importance": "low",
                "reminder_minutes_before": "15",
            },
        )

        self.assertEqual(response.status_code, 404)

    def test_payable_history_endpoint_records_status_changes(self):
        payable = Payable.objects.create(
            owner=self.user,
            bank=self.bank,
            title="Historico Parcela",
            description="Teste",
            payable_type="installment",
            status="pending",
            amount="140.00",
            due_date="2026-02-22",
            installment_number=1,
            installment_total=3,
        )

        self.client.post(
            reverse("payable_status_update", kwargs={"payable_id": payable.id}),
            {"status": "paid", "payment_date": "2026-02-21", "payment_note": "Primeiro pagamento"},
        )
        self.client.post(
            reverse("payable_status_update", kwargs={"payable_id": payable.id}),
            {"status": "pending"},
        )

        response = self.client.get(reverse("payable_history_list", kwargs={"payable_id": payable.id}))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertGreaterEqual(len(payload["history"]), 2)
        self.assertEqual(payload["history"][0]["new_status"], "pending")
        self.assertEqual(payload["history"][1]["new_status"], "paid")

    def test_payable_receipt_upload_requires_paid_status(self):
        payable = Payable.objects.create(
            owner=self.user,
            bank=self.bank,
            title="Internet",
            description="Conta mensal",
            payable_type="invoice",
            status="pending",
            amount="110.00",
            due_date="2026-02-22",
        )

        response = self.client.post(
            reverse("payable_receipt_upload", kwargs={"payable_id": payable.id}),
            {"receipt": SimpleUploadedFile("arquivo.pdf", b"%PDF-1.4\nfile\n", content_type="application/pdf")},
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["ok"])
        self.assertFalse(Payable.objects.get(id=payable.id).payment_receipt)

    def test_payable_receipt_upload_view_and_delete(self):
        payable = Payable.objects.create(
            owner=self.user,
            bank=self.bank,
            title="Escola",
            description="Mensal",
            payable_type="invoice",
            status="paid",
            amount="950.00",
            due_date="2026-02-22",
            payment_date="2026-02-20",
        )
        receipt_file = SimpleUploadedFile(
            "escola.pdf",
            b"%PDF-1.4\ncomprovante escola\n",
            content_type="application/pdf",
        )

        upload_response = self.client.post(
            reverse("payable_receipt_upload", kwargs={"payable_id": payable.id}),
            {"receipt": receipt_file},
        )
        self.assertEqual(upload_response.status_code, 200)
        self.assertTrue(upload_response.json()["ok"])
        self.assertIn("escola", upload_response.json()["payable"]["payment_receipt_name"])

        payable.refresh_from_db()
        self.assertTrue(payable.payment_receipt)

        view_response = self.client.get(reverse("payable_receipt_view", kwargs={"payable_id": payable.id}))
        self.assertEqual(view_response.status_code, 200)
        self.assertIn("application/pdf", view_response["Content-Type"])
        self.assertIn(b"comprovante escola", b"".join(view_response.streaming_content))

        delete_response = self.client.post(reverse("payable_receipt_delete", kwargs={"payable_id": payable.id}))
        self.assertEqual(delete_response.status_code, 200)
        self.assertTrue(delete_response.json()["ok"])

        payable.refresh_from_db()
        self.assertFalse(payable.payment_receipt)

    def test_installment_bulk_update_pay_until(self):
        create_response = self.client.post(
            reverse("payable_create"),
            {
                "bank": self.bank.id,
                "title": "TV",
                "description": "Parcelamento",
                "payable_type": "installment",
                "status": "pending",
                "amount": "1200.00",
                "due_date": "2026-03-10",
                "installment_total": "4",
            },
        )
        reference_id = create_response.json()["payables"][0]["id"]

        bulk_response = self.client.post(
            reverse("payable_installment_bulk_update", kwargs={"payable_id": reference_id}),
            {
                "action": "pay_until",
                "until_installment": "2",
                "payment_date": "2026-03-08",
                "payment_note": "Pagas no vencimento",
            },
        )

        self.assertEqual(bulk_response.status_code, 200)
        self.assertTrue(bulk_response.json()["ok"])
        installments = list(Payable.objects.filter(title="TV").order_by("installment_number"))
        self.assertEqual(len(installments), 4)
        self.assertEqual(installments[0].status, "paid")
        self.assertEqual(installments[1].status, "paid")
        self.assertEqual(str(installments[0].payment_date), "2026-03-08")
        self.assertEqual(installments[0].payment_note, "Pagas no vencimento")
        self.assertEqual(installments[2].status, "pending")
        self.assertEqual(installments[3].status, "pending")

    def test_installment_bulk_update_reopen_all(self):
        create_response = self.client.post(
            reverse("payable_create"),
            {
                "bank": self.bank.id,
                "title": "Mesa",
                "description": "Parcelamento",
                "payable_type": "installment",
                "status": "pending",
                "amount": "900.00",
                "due_date": "2026-03-10",
                "installment_total": "3",
            },
        )
        reference_id = create_response.json()["payables"][0]["id"]

        pay_all_response = self.client.post(
            reverse("payable_installment_bulk_update", kwargs={"payable_id": reference_id}),
            {
                "action": "pay_all",
                "payment_date": "2026-03-09",
                "payment_note": "Quitado",
            },
        )
        self.assertEqual(pay_all_response.status_code, 200)
        self.assertEqual(Payable.objects.filter(title="Mesa", status="paid").count(), 3)

        reopen_response = self.client.post(
            reverse("payable_installment_bulk_update", kwargs={"payable_id": reference_id}),
            {"action": "reopen_all"},
        )
        self.assertEqual(reopen_response.status_code, 200)
        reopened = Payable.objects.filter(title="Mesa")
        self.assertEqual(reopened.filter(status="pending").count(), 3)
        self.assertEqual(reopened.filter(payment_date__isnull=False).count(), 0)
        self.assertEqual(reopened.exclude(payment_note="").count(), 0)

    def test_report_export_csv_for_payables(self):
        Payable.objects.create(
            owner=self.user,
            bank=self.bank,
            title="Condominio",
            description="Mensal",
            payable_type="invoice",
            status="pending",
            amount="500.00",
            due_date="2026-03-05",
        )

        response = self.client.get(
            reverse("report_export"),
            {"report_type": "payables", "bank": "all", "format": "csv"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("text/csv", response["Content-Type"])
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".csv", response["Content-Disposition"])
        csv_content = response.content.decode("utf-8")
        self.assertIn("Relatorio de contas a pagar", csv_content)
        self.assertIn("Condominio", csv_content)

    def test_report_export_excel_and_pdf_for_cashflow(self):
        other_bank = Bank.objects.create(
            owner=self.user,
            name="XP",
            slug="xp",
            color="#0057B8",
            icon="ph-bank",
        )
        Transaction.objects.create(
            owner=self.user,
            bank=self.bank,
            title="Salario",
            description="Empresa",
            transaction_type="income",
            amount="5000.00",
            transaction_date="2026-02-10",
        )
        Transaction.objects.create(
            owner=self.user,
            bank=other_bank,
            title="Venda",
            description="Extra",
            transaction_type="income",
            amount="800.00",
            transaction_date="2026-02-12",
        )

        excel_response = self.client.get(
            reverse("report_export"),
            {"report_type": "cashflow", "bank": str(self.bank.id), "format": "excel"},
        )
        self.assertEqual(excel_response.status_code, 200)
        self.assertIn("application/vnd.ms-excel", excel_response["Content-Type"])
        excel_content = excel_response.content.decode("utf-8")
        self.assertIn("Relatorio de entradas e saidas", excel_content)
        self.assertIn("Salario", excel_content)
        self.assertNotIn("Venda", excel_content)

        pdf_response = self.client.get(
            reverse("report_export"),
            {"report_type": "cashflow", "bank": "all", "format": "pdf"},
        )
        self.assertEqual(pdf_response.status_code, 200)
        self.assertIn("application/pdf", pdf_response["Content-Type"])
        self.assertTrue(pdf_response.content.startswith(b"%PDF-1.4"))

    def test_report_export_supports_custom_period_and_detail_level(self):
        Transaction.objects.create(
            owner=self.user,
            bank=self.bank,
            title="Dentro do periodo",
            description="Janeiro",
            transaction_type="income",
            amount="1200.00",
            transaction_date="2026-01-15",
        )
        Transaction.objects.create(
            owner=self.user,
            bank=self.bank,
            title="Fora do periodo",
            description="Marco",
            transaction_type="income",
            amount="800.00",
            transaction_date="2026-03-02",
        )

        detailed_response = self.client.get(
            reverse("report_export"),
            {
                "report_type": "cashflow",
                "bank": "all",
                "format": "csv",
                "detail_level": "detailed",
                "start_date": "2026-01-01",
                "end_date": "2026-01-31",
            },
        )
        self.assertEqual(detailed_response.status_code, 200)
        detailed_content = detailed_response.content.decode("utf-8")
        self.assertIn("Dentro do periodo", detailed_content)
        self.assertNotIn("Fora do periodo", detailed_content)
        self.assertIn("Periodo: 01/01/2026 a 31/01/2026", detailed_content)

        consolidated_response = self.client.get(
            reverse("report_export"),
            {
                "report_type": "cashflow",
                "bank": "all",
                "format": "csv",
                "detail_level": "consolidated",
                "start_date": "2026-01-01",
                "end_date": "2026-01-31",
            },
        )
        self.assertEqual(consolidated_response.status_code, 200)
        consolidated_content = consolidated_response.content.decode("utf-8")
        self.assertIn("Visao: Consolidado", consolidated_content)
        self.assertIn("Consolidado por banco", consolidated_content)
        self.assertNotIn("Dentro do periodo", consolidated_content)

    def test_installment_plan_distributes_remainder_cents(self):
        self.client.post(
            reverse("payable_create"),
            {
                "bank": self.bank.id,
                "title": "Curso Especial",
                "description": "Parcelas quebradas",
                "payable_type": "installment",
                "status": "pending",
                "amount": "100.00",
                "due_date": "2026-03-10",
                "installment_total": "3",
            },
        )

        amounts = list(
            Payable.objects.filter(title="Curso Especial")
            .order_by("installment_number")
            .values_list("amount", flat=True)
        )
        self.assertEqual(sum(amounts), Decimal("100.00"))
        self.assertEqual(amounts[0], Decimal("33.34"))
        self.assertEqual(amounts[1], Decimal("33.33"))
        self.assertEqual(amounts[2], Decimal("33.33"))

    def test_dashboard_normalizes_legacy_installments(self):
        legacy_payable = Payable.objects.create(
            owner=self.user,
            bank=self.bank,
            title="Celular",
            description="Compra antiga",
            payable_type="installment",
            status="pending",
            amount="220.00",
            due_date="2026-03-12",
            installment_number=1,
            installment_total=12,
        )

        response = self.client.get(reverse("dashboard_home"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            Payable.objects.filter(title="Celular", installment_group__isnull=False).count(),
            12,
        )
        legacy_payable.refresh_from_db()
        self.assertIsNotNone(legacy_payable.installment_group)

    def test_delete_payable_installment_group(self):
        create_response = self.client.post(
            reverse("payable_create"),
            {
                "bank": self.bank.id,
                "title": "Notebook Pro",
                "description": "Parcelamento completo",
                "payable_type": "installment",
                "status": "pending",
                "amount": "1200.00",
                "due_date": "2026-04-10",
                "installment_total": "12",
            },
        )
        first_installment_id = create_response.json()["payables"][0]["id"]

        delete_response = self.client.post(
            reverse("payable_delete", kwargs={"payable_id": first_installment_id})
        )

        self.assertEqual(delete_response.status_code, 200)
        self.assertTrue(delete_response.json()["ok"])
        self.assertEqual(Payable.objects.filter(title="Notebook Pro").count(), 0)
