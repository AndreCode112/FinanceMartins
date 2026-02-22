from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class Bank(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="banks",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=80)
    slug = models.SlugField(max_length=50)
    color = models.CharField(max_length=7, default="#4F46E5")
    icon = models.CharField(max_length=60, default="ph-bank")

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "name"],
                name="uniq_bank_name_per_owner",
            ),
            models.UniqueConstraint(
                fields=["owner", "slug"],
                name="uniq_bank_slug_per_owner",
            ),
        ]

    def __str__(self):
        return self.name


class PayableCategory(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payable_categories",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=80)
    slug = models.SlugField(max_length=50)
    color = models.CharField(max_length=7, default="#5D7084")

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "name"],
                name="uniq_payable_category_name_per_owner",
            ),
            models.UniqueConstraint(
                fields=["owner", "slug"],
                name="uniq_payable_category_slug_per_owner",
            ),
        ]

    def __str__(self):
        return self.name


class Transaction(models.Model):
    class TransactionType(models.TextChoices):
        INCOME = "income", "Entrada"
        EXPENSE = "expense", "Saida"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="transactions",
        null=True,
        blank=True,
    )
    bank = models.ForeignKey(Bank, on_delete=models.PROTECT, related_name="transactions")
    title = models.CharField(max_length=120)
    description = models.CharField(max_length=255, blank=True)
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    transaction_type = models.CharField(
        max_length=10,
        choices=TransactionType.choices,
    )
    transaction_date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-transaction_date", "-id"]

    def __str__(self):
        return f"{self.title} ({self.get_transaction_type_display()})"


class Event(models.Model):
    class EventStatus(models.TextChoices):
        PENDING = "pending", "Pendente"
        COMPLETED = "completed", "Concluido"
        CANCELED = "canceled", "Cancelado"

    class EventImportance(models.TextChoices):
        LOW = "low", "Baixa"
        MEDIUM = "medium", "Media"
        HIGH = "high", "Alta"
        CRITICAL = "critical", "Critica"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="events",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=140)
    creator_name = models.CharField(max_length=120, blank=True, default="")
    starts_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField(null=True, blank=True)
    description = models.CharField(max_length=500, blank=True)
    location = models.CharField(max_length=120, blank=True)
    color = models.CharField(max_length=7, default="#4F46E5")
    status = models.CharField(
        max_length=12,
        choices=EventStatus.choices,
        default=EventStatus.PENDING,
    )
    importance = models.CharField(
        max_length=12,
        choices=EventImportance.choices,
        default=EventImportance.MEDIUM,
    )
    reminder_minutes_before = models.PositiveIntegerField(
        default=60,
        validators=[MinValueValidator(0)],
    )
    all_day = models.BooleanField(default=False)
    last_reminded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["starts_at", "id"]

    def clean(self):
        errors = {}
        if self.title:
            self.title = self.title.strip()
        if self.creator_name:
            self.creator_name = self.creator_name.strip()
        if self.description:
            self.description = self.description.strip()
        if self.location:
            self.location = self.location.strip()

        if self.ends_at and self.ends_at < self.starts_at:
            errors["ends_at"] = "Fim nao pode ser anterior ao inicio."

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"{self.title} ({self.get_importance_display()})"


class Payable(models.Model):
    class PayableType(models.TextChoices):
        INVOICE = "invoice", "Fatura"
        SUBSCRIPTION = "subscription", "Assinatura"
        DEBT = "debt", "Divida"
        INSTALLMENT = "installment", "Parcela"
        OTHER = "other", "Outro"

    class PayableStatus(models.TextChoices):
        PENDING = "pending", "Pendente"
        PAID = "paid", "Pago"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payables",
        null=True,
        blank=True,
    )
    bank = models.ForeignKey(
        Bank,
        on_delete=models.SET_NULL,
        related_name="payables",
        null=True,
        blank=True,
    )
    category = models.ForeignKey(
        PayableCategory,
        on_delete=models.SET_NULL,
        related_name="payables",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=120)
    description = models.CharField(max_length=255, blank=True)
    payable_type = models.CharField(
        max_length=20,
        choices=PayableType.choices,
    )
    status = models.CharField(
        max_length=12,
        choices=PayableStatus.choices,
        default=PayableStatus.PENDING,
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    due_date = models.DateField(default=timezone.localdate)
    payment_date = models.DateField(null=True, blank=True)
    payment_note = models.CharField(max_length=255, blank=True)
    payment_receipt = models.FileField(upload_to="payable_receipts/%Y/%m/", null=True, blank=True)
    installment_number = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
    )
    installment_total = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
    )
    installment_group = models.UUIDField(null=True, blank=True, db_index=True, editable=False)
    is_recurring = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_date", "id"]

    def clean(self):
        errors = {}

        if self.payable_type == self.PayableType.INSTALLMENT:
            if not self.installment_total:
                errors["installment_total"] = "Informe o total de parcelas."
            if not self.installment_number:
                self.installment_number = 1
            if (
                self.installment_number
                and self.installment_total
                and self.installment_number > self.installment_total
            ):
                errors["installment_number"] = "Parcela atual nao pode ser maior que o total."
        else:
            self.installment_number = None
            self.installment_total = None
            self.installment_group = None

        if self.payable_type != self.PayableType.SUBSCRIPTION:
            self.is_recurring = False

        if self.status == self.PayableStatus.PAID and not self.payment_date:
            self.payment_date = timezone.localdate()
        if self.status == self.PayableStatus.PENDING:
            self.payment_date = None
            self.payment_note = ""
        if self.payment_note:
            self.payment_note = self.payment_note.strip()

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"{self.title} ({self.get_payable_type_display()})"


class PayableStatusHistory(models.Model):
    payable = models.ForeignKey(
        Payable,
        on_delete=models.CASCADE,
        related_name="status_history",
    )
    previous_status = models.CharField(max_length=12, choices=Payable.PayableStatus.choices)
    new_status = models.CharField(max_length=12, choices=Payable.PayableStatus.choices)
    previous_payment_date = models.DateField(null=True, blank=True)
    new_payment_date = models.DateField(null=True, blank=True)
    previous_payment_note = models.CharField(max_length=255, blank=True, default="")
    new_payment_note = models.CharField(max_length=255, blank=True, default="")
    source = models.CharField(max_length=40, default="manual")
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payable_status_changes",
    )
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-changed_at", "-id"]

    def __str__(self):
        return f"Historico parcela {self.payable_id}: {self.previous_status} -> {self.new_status}"


class UserDashboardLayout(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dashboard_layout",
    )
    widget_order = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Layout do dashboard"
        verbose_name_plural = "Layouts do dashboard"

    def __str__(self):
        return f"Layout {self.user}"
