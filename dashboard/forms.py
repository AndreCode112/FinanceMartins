from django import forms
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.text import slugify

from .models import Bank, Event, Payable, PayableCategory, Transaction


class TransactionForm(forms.ModelForm):
    def __init__(self, *args, user=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = user
        if user and not self.instance.pk:
            self.instance.owner = user
        if "bank" in self.fields:
            self.fields["bank"].queryset = Bank.objects.filter(owner=user) if user else Bank.objects.none()

    class Meta:
        model = Transaction
        fields = [
            "bank",
            "title",
            "description",
            "transaction_type",
            "amount",
            "transaction_date",
        ]
        widgets = {
            "transaction_date": forms.DateInput(attrs={"type": "date"}),
        }

    def clean_title(self):
        return self.cleaned_data["title"].strip()

    def clean_description(self):
        return self.cleaned_data["description"].strip()

    def clean_bank(self):
        bank = self.cleaned_data["bank"]
        if self.user and bank.owner_id != self.user.id:
            raise ValidationError("Banco invalido para este usuario.")
        return bank


class PayableForm(forms.ModelForm):
    def __init__(self, *args, user=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = user
        if user and not self.instance.pk:
            self.instance.owner = user
        if "bank" in self.fields:
            self.fields["bank"].queryset = Bank.objects.filter(owner=user) if user else Bank.objects.none()
        if "category" in self.fields:
            self.fields["category"].queryset = (
                PayableCategory.objects.filter(owner=user) if user else PayableCategory.objects.none()
            )

    class Meta:
        model = Payable
        fields = [
            "bank",
            "category",
            "title",
            "description",
            "payable_type",
            "status",
            "amount",
            "due_date",
            "payment_date",
            "payment_note",
            "installment_number",
            "installment_total",
            "is_recurring",
        ]
        widgets = {
            "due_date": forms.DateInput(attrs={"type": "date"}),
            "payment_date": forms.DateInput(attrs={"type": "date"}),
        }

    def clean_title(self):
        return self.cleaned_data["title"].strip()

    def clean_description(self):
        return self.cleaned_data["description"].strip()

    def clean_payment_note(self):
        return self.cleaned_data.get("payment_note", "").strip()

    def clean_bank(self):
        bank = self.cleaned_data.get("bank")
        if not bank:
            return bank
        if self.user and bank.owner_id != self.user.id:
            raise ValidationError("Banco invalido para este usuario.")
        return bank

    def clean_category(self):
        category = self.cleaned_data.get("category")
        if not category:
            return category
        if self.user and category.owner_id != self.user.id:
            raise ValidationError("Categoria invalida para este usuario.")
        return category

    def clean(self):
        cleaned_data = super().clean()
        payable_type = cleaned_data.get("payable_type")
        installment_number = cleaned_data.get("installment_number")
        installment_total = cleaned_data.get("installment_total")

        if payable_type == Payable.PayableType.INSTALLMENT:
            if not installment_total:
                self.add_error("installment_total", "Informe o total de parcelas.")
            if not installment_number:
                cleaned_data["installment_number"] = 1
                installment_number = 1
            if installment_number and installment_total and installment_number > installment_total:
                self.add_error(
                    "installment_number",
                    "Parcela atual nao pode ser maior que o total.",
                )
        else:
            cleaned_data["installment_number"] = None
            cleaned_data["installment_total"] = None

        if payable_type != Payable.PayableType.SUBSCRIPTION:
            cleaned_data["is_recurring"] = False

        status = cleaned_data.get("status")
        if status == Payable.PayableStatus.PAID:
            if not cleaned_data.get("payment_date"):
                cleaned_data["payment_date"] = timezone.localdate()
        elif status == Payable.PayableStatus.PENDING:
            cleaned_data["payment_date"] = None
            cleaned_data["payment_note"] = ""

        return cleaned_data


class BankForm(forms.ModelForm):
    def __init__(self, *args, user=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = user
        if user and not self.instance.pk:
            self.instance.owner = user

    class Meta:
        model = Bank
        fields = [
            "name",
            "color",
            "icon",
        ]

    def clean_name(self):
        return self.cleaned_data["name"].strip()

    def clean_icon(self):
        icon = self.cleaned_data.get("icon", "").strip()
        return icon or "ph-bank"

    def save(self, commit=True):
        instance = super().save(commit=False)
        if self.user:
            instance.owner = self.user
        base_slug = slugify(instance.name) or "bank"
        slug = base_slug
        counter = 2
        owner_id = instance.owner_id
        slug_queryset = Bank.objects.filter(slug=slug, owner_id=owner_id).exclude(pk=instance.pk)
        while slug_queryset.exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
            slug_queryset = Bank.objects.filter(slug=slug, owner_id=owner_id).exclude(pk=instance.pk)
        instance.slug = slug

        if commit:
            instance.save()
        return instance


class PayableCategoryForm(forms.ModelForm):
    def __init__(self, *args, user=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = user
        if user and not self.instance.pk:
            self.instance.owner = user

    class Meta:
        model = PayableCategory
        fields = [
            "name",
            "color",
        ]

    def clean_name(self):
        return self.cleaned_data["name"].strip()

    def save(self, commit=True):
        instance = super().save(commit=False)
        if self.user:
            instance.owner = self.user

        base_slug = slugify(instance.name) or "categoria"
        slug = base_slug
        counter = 2
        owner_id = instance.owner_id
        slug_queryset = PayableCategory.objects.filter(slug=slug, owner_id=owner_id).exclude(pk=instance.pk)
        while slug_queryset.exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
            slug_queryset = PayableCategory.objects.filter(slug=slug, owner_id=owner_id).exclude(pk=instance.pk)
        instance.slug = slug

        if commit:
            instance.save()
        return instance


class EventForm(forms.ModelForm):
    def __init__(self, *args, user=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = user
        if user and not self.instance.pk:
            self.instance.owner = user

    class Meta:
        model = Event
        fields = [
            "title",
            "creator_name",
            "starts_at",
            "ends_at",
            "description",
            "location",
            "color",
            "status",
            "importance",
            "reminder_minutes_before",
            "all_day",
        ]
        widgets = {
            "starts_at": forms.DateTimeInput(attrs={"type": "datetime-local"}),
            "ends_at": forms.DateTimeInput(attrs={"type": "datetime-local"}),
        }

    def clean_title(self):
        return self.cleaned_data["title"].strip()

    def clean_creator_name(self):
        return self.cleaned_data.get("creator_name", "").strip()

    def clean_description(self):
        return self.cleaned_data.get("description", "").strip()

    def clean_location(self):
        return self.cleaned_data.get("location", "").strip()

    def clean(self):
        cleaned_data = super().clean()
        starts_at = cleaned_data.get("starts_at")
        ends_at = cleaned_data.get("ends_at")
        if starts_at and ends_at and ends_at < starts_at:
            self.add_error("ends_at", "Fim nao pode ser anterior ao inicio.")

        if not cleaned_data.get("creator_name") and self.user:
            cleaned_data["creator_name"] = self.user.username

        return cleaned_data
