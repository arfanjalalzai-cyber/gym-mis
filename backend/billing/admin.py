from django.contrib import admin

from .models import Bill


@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = (
        "bill_number",
        "member_full_name_snapshot",
        "billing_date",
        "final_amount",
        "payment_status",
        "currency",
    )
    list_filter = ("payment_status", "billing_date", "currency")
    search_fields = ("bill_number", "member_full_name_snapshot", "member__member_code")
    ordering = ("-billing_date", "-id")

