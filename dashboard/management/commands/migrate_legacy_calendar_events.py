import json
import sqlite3
from datetime import datetime
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction as db_transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from dashboard.models import Event


def _normalize_status(raw_status):
    status = str(raw_status or "").strip().lower()
    if status in {"pending", "completed", "canceled"}:
        return status
    if status in {"concluido", "concluida", "done"}:
        return Event.EventStatus.COMPLETED
    if status in {"cancelado", "cancelada"}:
        return Event.EventStatus.CANCELED
    return Event.EventStatus.PENDING


def _normalize_color(raw_color):
    color = str(raw_color or "").strip()
    if len(color) == 7 and color.startswith("#"):
        try:
            int(color[1:], 16)
            return color
        except ValueError:
            return "#4F46E5"
    return "#4F46E5"


def _parse_dt(raw_value):
    if not raw_value:
        return None

    raw_text = str(raw_value).strip()
    if raw_text.endswith("Z"):
        raw_text = raw_text[:-1] + "+00:00"

    parsed = parse_datetime(raw_text)
    if not parsed:
        try:
            parsed = datetime.fromisoformat(raw_text)
        except ValueError:
            return None

    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


def _to_bool(raw_value):
    normalized = str(raw_value or "").strip().lower()
    return normalized in {"1", "true", "yes", "sim", "on"}


class Command(BaseCommand):
    help = (
        "Faz backup dos eventos do projeto CalendarioDjango (tabela EventsApp_event) "
        "e opcionalmente importa no model dashboard.Event."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--mode",
            choices=["backup", "import", "backup-import"],
            default="backup",
            help="Modo de execucao: backup, import, backup-import.",
        )
        parser.add_argument(
            "--legacy-db",
            dest="legacy_db",
            help="Caminho do sqlite3 do projeto antigo (necessario em backup e backup-import).",
        )
        parser.add_argument(
            "--file",
            dest="file_path",
            help="Arquivo JSON de backup (saida no backup / entrada no import).",
        )
        parser.add_argument(
            "--fallback-owner",
            dest="fallback_owner",
            help="Username para receber eventos quando usuario legado nao existir no novo sistema.",
        )
        parser.add_argument(
            "--default-importance",
            dest="default_importance",
            choices=[
                Event.EventImportance.LOW,
                Event.EventImportance.MEDIUM,
                Event.EventImportance.HIGH,
                Event.EventImportance.CRITICAL,
            ],
            default=Event.EventImportance.MEDIUM,
            help="Importancia padrao usada na importacao.",
        )
        parser.add_argument(
            "--default-reminder-minutes",
            dest="default_reminder_minutes",
            type=int,
            default=60,
            help="Lembrete padrao em minutos antes do evento.",
        )
        parser.add_argument(
            "--update-existing",
            action="store_true",
            help="Atualiza eventos existentes (match por owner + title + starts_at + creator_name).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Executa validacoes sem persistir importacoes.",
        )

    def handle(self, *args, **options):
        mode = options["mode"]
        file_path = self._resolve_file_path(options["file_path"])

        if mode in {"backup", "backup-import"}:
            legacy_db = options.get("legacy_db")
            if not legacy_db:
                raise CommandError("Informe --legacy-db para executar backup.")
            backup_payload = self._backup_from_legacy_db(legacy_db)
            self._write_backup_file(file_path, backup_payload)
            self.stdout.write(self.style.SUCCESS(f"Backup criado: {file_path}"))

            if mode == "backup":
                return
        else:
            if not file_path.exists():
                raise CommandError(f"Arquivo de backup nao encontrado: {file_path}")
            backup_payload = self._read_backup_file(file_path)

        self._import_backup_payload(
            backup_payload=backup_payload,
            fallback_owner_username=options.get("fallback_owner"),
            default_importance=options["default_importance"],
            default_reminder_minutes=options["default_reminder_minutes"],
            update_existing=options["update_existing"],
            dry_run=options["dry_run"],
        )

    def _resolve_file_path(self, raw_file_path):
        if raw_file_path:
            return Path(raw_file_path).expanduser().resolve()

        timestamp = timezone.localtime().strftime("%Y%m%d_%H%M%S")
        default_file = Path.cwd() / "backups" / f"legacy_calendar_events_{timestamp}.json"
        return default_file

    def _resolve_legacy_event_table(self, conn):
        cursor = conn.cursor()
        tables = {
            row["name"]
            for row in cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        }

        if "EventsApp_event" in tables:
            return "EventsApp_event"
        if "eventsapp_event" in tables:
            return "eventsapp_event"

        for table_name in sorted(tables):
            if not table_name.lower().endswith("_event"):
                continue
            columns = {
                row["name"]
                for row in cursor.execute(f'PRAGMA table_info("{table_name.replace("\"", "\"\"")}")')
            }
            if {"id", "user_id", "title", "event_date"}.issubset(columns):
                return table_name

        raise CommandError("Nao foi possivel localizar a tabela de eventos legados no sqlite informado.")

    def _backup_from_legacy_db(self, legacy_db_path):
        source_path = Path(legacy_db_path).expanduser().resolve()
        if not source_path.exists():
            raise CommandError(f"Banco legado nao encontrado: {source_path}")

        conn = sqlite3.connect(source_path)
        conn.row_factory = sqlite3.Row
        try:
            event_table = self._resolve_legacy_event_table(conn)
            cursor = conn.cursor()

            legacy_users = {
                row["id"]: row["username"]
                for row in cursor.execute("SELECT id, username FROM auth_user")
            }

            events = []
            for row in cursor.execute(
                f'SELECT * FROM "{event_table.replace("\"", "\"\"")}" ORDER BY event_date, id'
            ):
                legacy_event = {
                    "legacy_event_id": row["id"],
                    "legacy_user_id": row["user_id"] if "user_id" in row.keys() else None,
                    "username": legacy_users.get(row["user_id"]) if "user_id" in row.keys() else "",
                    "title": (row["title"] if "title" in row.keys() else "") or "",
                    "creator_name": (row["creator_name"] if "creator_name" in row.keys() else "") or "",
                    "event_date": (row["event_date"] if "event_date" in row.keys() else "") or "",
                    "description": (row["description"] if "description" in row.keys() else "") or "",
                    "color": (row["color"] if "color" in row.keys() else "#4F46E5") or "#4F46E5",
                    "status": (row["status"] if "status" in row.keys() else "pending") or "pending",
                    "created_at": (row["created_at"] if "created_at" in row.keys() else "") or "",
                }
                events.append(legacy_event)

            return {
                "meta": {
                    "generated_at": timezone.now().isoformat(),
                    "source_db": str(source_path),
                    "source_table": event_table,
                    "total_events": len(events),
                    "total_legacy_users": len(legacy_users),
                },
                "events": events,
            }
        finally:
            conn.close()

    def _write_backup_file(self, file_path, payload):
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with file_path.open("w", encoding="utf-8") as backup_file:
            json.dump(payload, backup_file, indent=2)

    def _read_backup_file(self, file_path):
        with file_path.open("r", encoding="utf-8") as backup_file:
            payload = json.load(backup_file)

        if not isinstance(payload, dict) or not isinstance(payload.get("events"), list):
            raise CommandError("Arquivo de backup invalido: esperado objeto JSON com lista em 'events'.")
        return payload

    def _import_backup_payload(
        self,
        backup_payload,
        fallback_owner_username,
        default_importance,
        default_reminder_minutes,
        update_existing=False,
        dry_run=False,
    ):
        if default_reminder_minutes < 0:
            raise CommandError("--default-reminder-minutes nao pode ser negativo.")

        user_model = get_user_model()
        users_by_username = {user.username: user for user in user_model.objects.all()}
        fallback_owner = None

        if fallback_owner_username:
            fallback_owner = users_by_username.get(fallback_owner_username)
            if not fallback_owner:
                raise CommandError(f"Usuario fallback nao encontrado: {fallback_owner_username}")

        imported = 0
        updated = 0
        skipped_missing_owner = 0
        skipped_invalid_date = 0
        skipped_duplicates = 0

        with db_transaction.atomic():
            for raw_event in backup_payload.get("events", []):
                username = str(raw_event.get("username") or "").strip()
                owner = users_by_username.get(username) if username else None
                if not owner:
                    owner = fallback_owner
                if not owner:
                    skipped_missing_owner += 1
                    continue

                starts_at = _parse_dt(raw_event.get("starts_at") or raw_event.get("event_date"))
                if not starts_at:
                    skipped_invalid_date += 1
                    continue

                ends_at = _parse_dt(raw_event.get("ends_at"))
                if ends_at and ends_at < starts_at:
                    ends_at = None

                title = str(raw_event.get("title") or "").strip() or "Evento importado"
                creator_name = str(raw_event.get("creator_name") or "").strip() or username or owner.username
                description = str(raw_event.get("description") or "").strip()[:500]
                location = str(raw_event.get("location") or "").strip()[:120]
                color = _normalize_color(raw_event.get("color"))
                status = _normalize_status(raw_event.get("status"))
                importance = raw_event.get("importance") or default_importance
                if importance not in {
                    Event.EventImportance.LOW,
                    Event.EventImportance.MEDIUM,
                    Event.EventImportance.HIGH,
                    Event.EventImportance.CRITICAL,
                }:
                    importance = default_importance

                raw_reminder = raw_event.get("reminder_minutes_before")
                try:
                    reminder_minutes = int(raw_reminder) if raw_reminder is not None else default_reminder_minutes
                except (TypeError, ValueError):
                    reminder_minutes = default_reminder_minutes
                reminder_minutes = max(0, reminder_minutes)
                all_day = _to_bool(raw_event.get("all_day"))

                existing = Event.objects.filter(
                    owner=owner,
                    title=title,
                    starts_at=starts_at,
                    creator_name=creator_name,
                ).first()

                if existing:
                    if not update_existing:
                        skipped_duplicates += 1
                        continue
                    existing.ends_at = ends_at
                    existing.description = description
                    existing.location = location
                    existing.color = color
                    existing.status = status
                    existing.importance = importance
                    existing.reminder_minutes_before = reminder_minutes
                    existing.all_day = all_day
                    existing.save()
                    updated += 1
                    continue

                Event.objects.create(
                    owner=owner,
                    title=title,
                    creator_name=creator_name,
                    starts_at=starts_at,
                    ends_at=ends_at,
                    description=description,
                    location=location,
                    color=color,
                    status=status,
                    importance=importance,
                    reminder_minutes_before=reminder_minutes,
                    all_day=all_day,
                )
                imported += 1

            if dry_run:
                db_transaction.set_rollback(True)

        mode_label = "DRY-RUN" if dry_run else "IMPORT"
        self.stdout.write(
            self.style.SUCCESS(
                f"{mode_label} concluido | importados: {imported} | atualizados: {updated} | "
                f"ignorados sem owner: {skipped_missing_owner} | ignorados data invalida: {skipped_invalid_date} | "
                f"ignorados duplicados: {skipped_duplicates}"
            )
        )
