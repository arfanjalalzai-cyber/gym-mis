from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from core.base_models import BaseModel


class AttendancePolicy(BaseModel):
    SALARY_BASIS_CALENDAR_DAYS = "calendar_days"
    SALARY_BASIS_CHOICES = [
        (SALARY_BASIS_CALENDAR_DAYS, "Calendar Days"),
    ]

    singleton_key = models.PositiveSmallIntegerField(default=1, unique=True, editable=False)
    # Legacy compatibility for existing databases.
    late_counts_as_half_day_legacy = models.BooleanField(
        default=True,
        db_column="late_counts_as_half_day",
    )
    block_future_dates = models.BooleanField(default=True)
    late_deduction_enabled = models.BooleanField(default=True)
    late_deduction_fraction = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=Decimal("0.50"),
    )
    absent_deduction_fraction = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=Decimal("1.00"),
    )
    leave_is_paid = models.BooleanField(default=True)
    monthly_paid_leave_days = models.PositiveSmallIntegerField(default=3)
    missing_as_absent = models.BooleanField(default=False)
    salary_basis = models.CharField(
        max_length=30,
        choices=SALARY_BASIS_CHOICES,
        default=SALARY_BASIS_CALENDAR_DAYS,
    )

    class Meta:
        db_table = "attendance_policy"

    def __str__(self) -> str:
        return "Attendance Policy"

    def clean(self):
        errors = {}
        if self.late_deduction_fraction is None:
            errors["late_deduction_fraction"] = "Late deduction fraction is required."
        elif self.late_deduction_fraction < Decimal("0") or self.late_deduction_fraction > Decimal("1"):
            errors["late_deduction_fraction"] = "Late deduction fraction must be between 0 and 1."
        if self.absent_deduction_fraction is None:
            errors["absent_deduction_fraction"] = "Absent deduction fraction is required."
        elif self.absent_deduction_fraction < Decimal("0") or self.absent_deduction_fraction > Decimal("1"):
            errors["absent_deduction_fraction"] = "Absent deduction fraction must be between 0 and 1."
        if self.monthly_paid_leave_days > 31:
            errors["monthly_paid_leave_days"] = "Monthly paid leave days cannot be more than 31."
        if self.salary_basis != self.SALARY_BASIS_CALENDAR_DAYS:
            errors["salary_basis"] = "Only calendar_days salary basis is supported in v1."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.singleton_key = 1
        self.full_clean()
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        policy, _ = cls.objects.get_or_create(singleton_key=1)
        return policy


class AttendanceRecord(BaseModel):
    STATUS_PRESENT = "present"
    STATUS_ABSENT = "absent"
    STATUS_LATE = "late"
    STATUS_LEAVE = "leave"
    STATUS_CHOICES = [
        (STATUS_PRESENT, "Present"),
        (STATUS_ABSENT, "Absent"),
        (STATUS_LATE, "Late"),
        (STATUS_LEAVE, "Leave"),
    ]

    staff = models.ForeignKey(
        "staff.Staff",
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    attendance_date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    note = models.TextField(blank=True, null=True)
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_marked_records",
    )

    class Meta:
        db_table = "attendance_records"
        ordering = ["-attendance_date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["staff", "attendance_date"],
                condition=Q(deleted_at__isnull=True),
                name="att_rec_unique_staff_date_active",
            )
        ]
        indexes = [
            models.Index(fields=["attendance_date"], name="att_date_idx"),
            models.Index(fields=["staff", "attendance_date"], name="att_staff_date_idx"),
            models.Index(fields=["status"], name="att_status_idx"),
            models.Index(fields=["created_at"], name="att_created_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.staff_id} | {self.attendance_date.isoformat()} | {self.status}"
