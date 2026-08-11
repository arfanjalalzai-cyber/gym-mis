from django.db import models

from core.base_models import BaseModel


class Bill(BaseModel):
    PAYMENT_STATUS_CHOICES = [
        ("unpaid", "Unpaid"),
        ("partial", "Partial"),
        ("paid", "Paid"),
    ]

    bill_number = models.CharField(max_length=24, unique=True, db_index=True)
    member = models.ForeignKey(
        "members.Member", on_delete=models.CASCADE, related_name="bills"
    )
    cycle = models.OneToOneField(
        "payments.MemberFeeCycle", on_delete=models.PROTECT, related_name="bill"
    )
    schedule_class = models.ForeignKey(
        "schedule.ScheduleClass",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="bills",
    )

    billing_date = models.DateField()
    cycle_month = models.DateField()
    member_code_snapshot = models.CharField(max_length=32, blank=True, default="")
    member_name_snapshot = models.CharField(max_length=255, blank=True, default="")
    original_fee_amount = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    final_amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    remaining_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_status = models.CharField(
        max_length=10, choices=PAYMENT_STATUS_CHOICES, default="unpaid"
    )
    currency = models.CharField(max_length=10, default="AFN")
    is_locked = models.BooleanField(default=False)

    member_full_name_snapshot = models.CharField(max_length=220)
    member_status_snapshot = models.CharField(max_length=20, blank=True, default="")
    class_name_snapshot = models.CharField(max_length=120, blank=True, default="")
    plan_label_snapshot = models.CharField(max_length=120, blank=True, default="")

    class Meta:
        db_table = "billing_bills"
        ordering = ["-billing_date", "-created_at", "-id"]
        indexes = [
            models.Index(fields=["bill_number"], name="bill_number_idx"),
            models.Index(fields=["member", "billing_date"], name="bill_member_date_idx"),
            models.Index(fields=["payment_status"], name="bill_status_idx"),
            models.Index(fields=["billing_date"], name="bill_date_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.bill_number} - {self.member_full_name_snapshot}"
