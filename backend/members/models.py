from datetime import date

from django.db import models

from core.base_models import BaseModel


class Member(BaseModel):
    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
        ("prefer_not_to_say", "Prefer not to say"),
    ]

    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
    ]

    BLOOD_GROUP_CHOICES = [
        ("A+", "A+"),
        ("A-", "A-"),
        ("B+", "B+"),
        ("B-", "B-"),
        ("AB+", "AB+"),
        ("AB-", "AB-"),
        ("O+", "O+"),
        ("O-", "O-"),
    ]

    member_code = models.CharField(max_length=10, unique=True, db_index=True, editable=False)
    id_card_number = models.CharField(max_length=50, unique=True, blank=True, null=True, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    address = models.TextField(blank=True, default="")
    email = models.EmailField(blank=True, null=True)
    blood_group = models.CharField(max_length=5, choices=BLOOD_GROUP_CHOICES, blank=True, null=True)
    profile_picture = models.ImageField(upload_to="members/profile_pictures/", blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, blank=True, null=True)
    emergency_contact_name = models.CharField(max_length=120, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True, null=True)
    height_cm = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    weight_kg = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    join_date = models.DateField(default=date.today)
    membership_plan_template = models.ForeignKey(
        "system_settings.MembershipPlanTemplate",
        on_delete=models.SET_NULL,
        related_name="members",
        blank=True,
        null=True,
    )
    schedule_class = models.ForeignKey(
        "schedule.ScheduleClass",
        on_delete=models.SET_NULL,
        related_name="members",
        blank=True,
        null=True,
    )
    schedule_slot = models.ForeignKey(
        "schedule.ScheduleSlot",
        on_delete=models.SET_NULL,
        related_name="scheduled_members",
        blank=True,
        null=True,
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="active")
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "members"
        indexes = [
            models.Index(fields=["member_code"]),
            models.Index(fields=["status"]),
            models.Index(fields=["phone"]),
            models.Index(fields=["last_name"]),
            models.Index(fields=["schedule_class"]),
            models.Index(fields=["schedule_slot"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.member_code} - {self.first_name} {self.last_name}"

    @classmethod
    def generate_member_code(cls) -> str:
        latest_code = (
            cls.all_objects.filter(member_code__startswith="MEM-")
            .order_by("-member_code")
            .values_list("member_code", flat=True)
            .first()
        )

        next_number = 1
        if latest_code:
            try:
                next_number = int(latest_code.split("-")[1]) + 1
            except (IndexError, ValueError):
                next_number = 1

        while True:
            candidate = f"MEM-{next_number:06d}"
            if not cls.all_objects.filter(member_code=candidate).exists():
                return candidate
            next_number += 1

    def save(self, *args, **kwargs):
        if not self.member_code:
            self.member_code = self.generate_member_code()
        if self.schedule_slot_id:
            self.schedule_class = self.schedule_slot.schedule_class
        super().save(*args, **kwargs)


class MemberBodyMetricHistory(BaseModel):
    BMI_CATEGORY_CHOICES = [
        ("underweight", "Underweight"),
        ("normal", "Normal"),
        ("overweight", "Overweight"),
        ("obese", "Obese"),
    ]

    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="body_metric_history")
    measurement_date = models.DateField(default=date.today, db_index=True)
    height_cm = models.DecimalField(max_digits=5, decimal_places=2)
    weight_kg = models.DecimalField(max_digits=6, decimal_places=2)
    bmi = models.DecimalField(max_digits=4, decimal_places=1)
    bmi_category = models.CharField(max_length=20, choices=BMI_CATEGORY_CHOICES)

    class Meta:
        db_table = "member_body_metric_history"
        indexes = [
            models.Index(fields=["member", "-measurement_date"]),
            models.Index(fields=["created_at"]),
        ]
        ordering = ["-measurement_date", "-created_at"]

    def __str__(self) -> str:
        return f"{self.member.member_code} - {self.measurement_date} - BMI {self.bmi}"
