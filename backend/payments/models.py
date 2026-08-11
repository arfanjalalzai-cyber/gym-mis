from datetime import date
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from core.base_models import BaseModel


def first_day_of_month(value: date) -> date:
    return value.replace(day=1)


class MemberFeePlan(BaseModel):
    BILLING_CYCLE_CHOICES = [
        ("monthly", "Monthly"),
        ("quarterly", "Quarterly"),
        ("yearly", "Yearly"),
    ]

    member = models.OneToOneField(
        "members.Member", on_delete=models.CASCADE, related_name="fee_plan"
    )
    plan_template = models.ForeignKey(
        "system_settings.MembershipPlanTemplate",
        on_delete=models.SET_NULL,
        related_name="member_fee_plans",
        blank=True,
        null=True,
    )
    billing_cycle = models.CharField(
        max_length=20, choices=BILLING_CYCLE_CHOICES, default="monthly"
    )
    cycle_fee_amount = models.DecimalField(max_digits=10, decimal_places=2)
    default_cycle_discount_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00")
    )
    currency = models.CharField(max_length=10, default="AFN")
    effective_from = models.DateField(default=date.today)
    effective_to = models.DateField(blank=True, null=True)

    class Meta:
        db_table = "payments_member_fee_plans"
        indexes = [
            models.Index(fields=["member"], name="pay_mfp_member_idx"),
            models.Index(fields=["effective_from"], name="pay_mfp_from_idx"),
            models.Index(fields=["effective_to"], name="pay_mfp_to_idx"),
            models.Index(fields=["currency"], name="pay_mfp_curr_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.member_id} - {self.billing_cycle} - {self.cycle_fee_amount}"

    def clean(self):
        errors = {}

        if self.cycle_fee_amount is None or self.cycle_fee_amount <= 0:
            errors["cycle_fee_amount"] = "Cycle fee amount must be greater than 0."

        if (
            self.default_cycle_discount_amount is None
            or self.default_cycle_discount_amount < 0
        ):
            errors["default_cycle_discount_amount"] = (
                "Default cycle discount amount must be greater than or equal to 0."
            )

        if (
            self.cycle_fee_amount is not None
            and self.default_cycle_discount_amount is not None
            and self.default_cycle_discount_amount > self.cycle_fee_amount
        ):
            errors["default_cycle_discount_amount"] = (
                "Default cycle discount amount cannot exceed cycle fee amount."
            )

        if self.currency != "AFN":
            errors["currency"] = "Only AFN currency is supported in v1."

        if self.effective_to and self.effective_to < self.effective_from:
            errors["effective_to"] = "Effective end date cannot be before effective start date."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class MemberFeeCycle(BaseModel):
    STATUS_CHOICES = [
        ("unpaid", "Unpaid"),
        ("partial", "Partial"),
        ("paid", "Paid"),
    ]

    member = models.ForeignKey(
        "members.Member", on_delete=models.CASCADE, related_name="fee_cycles"
    )
    plan = models.ForeignKey(
        MemberFeePlan,
        on_delete=models.SET_NULL,
        related_name="cycles",
        blank=True,
        null=True,
    )
    cycle_month = models.DateField()
    base_due_amount = models.DecimalField(max_digits=10, decimal_places=2)
    cycle_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_due_amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    remaining_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="unpaid")

    class Meta:
        db_table = "payments_member_fee_cycles"
        unique_together = ["member", "cycle_month"]
        indexes = [
            models.Index(fields=["member", "cycle_month"], name="pay_mfc_member_month_idx"),
            models.Index(fields=["status"], name="pay_mfc_status_idx"),
            models.Index(fields=["cycle_month"], name="pay_mfc_month_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.member_id} - {self.cycle_month.isoformat()} - {self.status}"

    def clean(self):
        errors = {}
        if self.cycle_month and self.cycle_month != first_day_of_month(self.cycle_month):
            errors["cycle_month"] = "Cycle month must be set to first day of month."

        if self.base_due_amount is not None and self.base_due_amount <= 0:
            errors["base_due_amount"] = "Base due amount must be greater than 0."

        if self.cycle_discount_amount is not None and self.cycle_discount_amount < 0:
            errors["cycle_discount_amount"] = (
                "Cycle discount amount must be greater than or equal to 0."
            )

        if (
            self.base_due_amount is not None
            and self.cycle_discount_amount is not None
            and self.cycle_discount_amount > self.base_due_amount
        ):
            errors["cycle_discount_amount"] = "Cycle discount amount cannot exceed base due amount."

        if self.net_due_amount is not None and self.net_due_amount < 0:
            errors["net_due_amount"] = "Net due amount cannot be negative."

        if self.remaining_amount is not None and self.remaining_amount < 0:
            errors["remaining_amount"] = "Remaining amount cannot be negative."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class MemberFeePayment(BaseModel):
    PAYMENT_METHOD_CHOICES = [
        ("cash", "Cash"),
        ("bank_transfer", "Bank Transfer"),
        ("online", "Online"),
        ("card", "Card"),
        ("other", "Other"),
    ]

    member = models.ForeignKey(
        "members.Member", on_delete=models.CASCADE, related_name="fee_payments"
    )
    cycle = models.ForeignKey(
        MemberFeeCycle, on_delete=models.PROTECT, related_name="payments"
    )
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    paid_at = models.DateTimeField()
    note = models.TextField(blank=True, null=True)
    is_reversal = models.BooleanField(default=False)
    reversal_of = models.OneToOneField(
        "self",
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        related_name="reversal_entry",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="member_fee_payments_created",
    )

    class Meta:
        db_table = "payments_member_fee_payments"
        ordering = ["-paid_at", "-id"]
        indexes = [
            models.Index(fields=["member"], name="pay_mfpmt_member_idx"),
            models.Index(fields=["cycle"], name="pay_mfpmt_cycle_idx"),
            models.Index(fields=["paid_at"], name="pay_mfpmt_paid_at_idx"),
            models.Index(fields=["payment_method"], name="pay_mfpmt_method_idx"),
            models.Index(fields=["is_reversal"], name="pay_mfpmt_rev_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.member_id} - {self.amount_paid} - {self.paid_at.isoformat()}"

    def clean(self):
        errors = {}
        if self.discount_amount is not None and self.discount_amount == 0 and self.amount_paid == 0:
            errors["amount_paid"] = "Amount paid and discount amount cannot both be zero."
        if errors:
            raise ValidationError(errors)


class StaffSalaryPeriod(BaseModel):
    STATUS_CHOICES = [
        ("unpaid", "Unpaid"),
        ("partial", "Partial"),
        ("paid", "Paid"),
    ]

    staff = models.ForeignKey(
        "staff.Staff", on_delete=models.CASCADE, related_name="salary_periods"
    )
    period_month = models.DateField()
    gross_salary_amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    remaining_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="unpaid")
    currency = models.CharField(max_length=10, default="AFN")

    class Meta:
        db_table = "payments_staff_salary_periods"
        unique_together = ["staff", "period_month"]
        indexes = [
            models.Index(fields=["staff", "period_month"], name="pay_ssp_staff_month_idx"),
            models.Index(fields=["status"], name="pay_ssp_status_idx"),
            models.Index(fields=["period_month"], name="pay_ssp_month_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.staff_id} - {self.period_month.isoformat()} - {self.status}"

    def clean(self):
        errors = {}
        if self.period_month and self.period_month != first_day_of_month(self.period_month):
            errors["period_month"] = "Period month must be set to first day of month."

        if self.gross_salary_amount is None or self.gross_salary_amount < 0:
            errors["gross_salary_amount"] = "Gross salary amount cannot be negative."

        if self.remaining_amount is not None and self.remaining_amount < 0:
            errors["remaining_amount"] = "Remaining amount cannot be negative."

        if self.currency != "AFN":
            errors["currency"] = "Only AFN currency is supported in v1."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class StaffSalaryPayment(BaseModel):
    PAYMENT_METHOD_CHOICES = [
        ("cash", "Cash"),
        ("bank_transfer", "Bank Transfer"),
        ("online", "Online"),
        ("card", "Card"),
        ("other", "Other"),
    ]

    staff = models.ForeignKey(
        "staff.Staff", on_delete=models.CASCADE, related_name="salary_payments"
    )
    period = models.ForeignKey(
        StaffSalaryPeriod, on_delete=models.PROTECT, related_name="payments"
    )
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    paid_at = models.DateTimeField()
    note = models.TextField(blank=True, null=True)
    is_reversal = models.BooleanField(default=False)
    reversal_of = models.OneToOneField(
        "self",
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        related_name="reversal_entry",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="staff_salary_payments_created",
    )

    class Meta:
        db_table = "payments_staff_salary_payments"
        ordering = ["-paid_at", "-id"]
        indexes = [
            models.Index(fields=["staff"], name="pay_sspmt_staff_idx"),
            models.Index(fields=["period"], name="pay_sspmt_period_idx"),
            models.Index(fields=["paid_at"], name="pay_sspmt_paid_at_idx"),
            models.Index(fields=["payment_method"], name="pay_sspmt_method_idx"),
            models.Index(fields=["is_reversal"], name="pay_sspmt_rev_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.staff_id} - {self.amount_paid} - {self.paid_at.isoformat()}"
