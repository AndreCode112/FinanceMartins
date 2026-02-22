from django.contrib.auth import views as auth_views
from django.urls import path

from .views import (
    bank_create,
    bank_delete,
    dashboard_layout_save,
    dashboard_home,
    payable_create,
    payable_bulk_action,
    payable_category_create,
    payable_category_delete,
    payable_delete,
    payable_installment_bulk_update,
    payable_receipt_delete,
    payable_receipt_upload,
    payable_receipt_view,
    payable_history_list,
    payable_status_update,
    payable_update,
    report_export,
    event_create,
    event_delete,
    event_list,
    event_update,
    transaction_create,
    transaction_delete,
    transaction_update,
    # import_events_json
)

urlpatterns = [
    path(
        "login/",
        auth_views.LoginView.as_view(template_name="registration/login.html"),
        name="login",
    ),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
    path("", dashboard_home, name="dashboard_home"),
    path("api/dashboard/layout/", dashboard_layout_save, name="dashboard_layout_save"),
    path("api/events/", event_list, name="event_list"),
    path("api/events/create/", event_create, name="event_create"),
    path("api/events/<int:event_id>/update/", event_update, name="event_update"),
    path("api/events/<int:event_id>/delete/", event_delete, name="event_delete"),
    path("api/banks/create/", bank_create, name="bank_create"),
    path("api/banks/<int:bank_id>/delete/", bank_delete, name="bank_delete"),
    path("api/transactions/create/", transaction_create, name="transaction_create"),
    path(
        "api/transactions/<int:transaction_id>/update/",
        transaction_update,
        name="transaction_update",
    ),
    path(
        "api/transactions/<int:transaction_id>/delete/",
        transaction_delete,
        name="transaction_delete",
    ),
    path("api/payables/create/", payable_create, name="payable_create"),
    path("api/payables/bulk-action/", payable_bulk_action, name="payable_bulk_action"),
    path(
        "api/payable-categories/create/",
        payable_category_create,
        name="payable_category_create",
    ),
    path(
        "api/payable-categories/<int:category_id>/delete/",
        payable_category_delete,
        name="payable_category_delete",
    ),
    path(
        "api/payables/<int:payable_id>/update/",
        payable_update,
        name="payable_update",
    ),
    path(
        "api/payables/<int:payable_id>/delete/",
        payable_delete,
        name="payable_delete",
    ),
    path(
        "api/payables/<int:payable_id>/status/",
        payable_status_update,
        name="payable_status_update",
    ),
    path(
        "api/payables/<int:payable_id>/installments/bulk/",
        payable_installment_bulk_update,
        name="payable_installment_bulk_update",
    ),
    path(
        "api/payables/<int:payable_id>/receipt/upload/",
        payable_receipt_upload,
        name="payable_receipt_upload",
    ),
    path(
        "api/payables/<int:payable_id>/receipt/delete/",
        payable_receipt_delete,
        name="payable_receipt_delete",
    ),
    path(
        "api/payables/<int:payable_id>/receipt/view/",
        payable_receipt_view,
        name="payable_receipt_view",
    ),
    path(
        "api/payables/<int:payable_id>/history/",
        payable_history_list,
        name="payable_history_list",
    ),
    path(
        "api/reports/export/",
        report_export,
        name="report_export",
    ),
    #  path("events/importar-json/", import_events_json, name="import_events_json"),
]
