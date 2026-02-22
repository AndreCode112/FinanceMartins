from django.contrib import admin

from .models import Bank, Event, Payable, PayableCategory, Transaction, UserDashboardLayout


@admin.register(Bank)
class BankAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "color")
    search_fields = ("name", "slug")


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("title", "transaction_type", "amount", "bank", "transaction_date")
    list_filter = ("transaction_type", "bank", "transaction_date")
    search_fields = ("title", "description")


@admin.register(Payable)
class PayableAdmin(admin.ModelAdmin):
    list_display = ("title", "payable_type", "status", "amount", "due_date", "is_recurring")
    list_filter = ("payable_type", "status", "due_date", "is_recurring")
    search_fields = ("title", "description")


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "starts_at", "importance", "status", "creator_name", "owner")
    list_filter = ("importance", "status", "all_day", "starts_at")
    search_fields = ("title", "description", "location", "creator_name", "owner__username")


@admin.register(PayableCategory)
class PayableCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "color", "owner")
    search_fields = ("name", "slug", "owner__username", "owner__email")


@admin.register(UserDashboardLayout)
class UserDashboardLayoutAdmin(admin.ModelAdmin):
    list_display = ("user", "updated_at")
    search_fields = ("user__username", "user__email")
