from django.db import models

from core.base_models import BaseModel


class Staff(BaseModel):
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

    POSITION_CHOICES = [
        ("trainer", "Trainer"),
        ("manager", "Manager"),
        ("cleaner", "Cleaner"),
        ("other", "Other"),
    ]

    EMPLOYMENT_STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("on_leave", "On Leave"),
        ("resigned", "Resigned"),
    ]

    SALARY_STATUS_CHOICES = [
        ("paid", "Paid"),
        ("unpaid", "Unpaid"),
        ("partial", "Partial"),
    ]

    staff_code = models.CharField(max_length=10, unique=True, db_index=True, editable=False)
    position = models.CharField(max_length=20, choices=POSITION_CHOICES)
    position_other = models.CharField(max_length=120, blank=True, null=True)

    id_card_number = models.CharField(max_length=50, unique=True, blank=True, null=True, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    father_name = models.CharField(max_length=120, blank=True, null=True)
    mobile_number = models.CharField(max_length=20)
    whatsapp_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, default="")
    email = models.EmailField(blank=True, null=True)
    blood_group = models.CharField(max_length=5, choices=BLOOD_GROUP_CHOICES, blank=True, null=True)
    profile_picture = models.ImageField(upload_to="staff/profile_pictures/", blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)

    date_hired = models.DateField()
    monthly_salary = models.DecimalField(max_digits=10, decimal_places=2)
    salary_currency = models.CharField(max_length=10, default="AFN")
    salary_status = models.CharField(max_length=10, choices=SALARY_STATUS_CHOICES, default="unpaid")
    employment_status = models.CharField(
        max_length=10, choices=EMPLOYMENT_STATUS_CHOICES, default="active"
    )
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "staff"
        indexes = [
            models.Index(fields=["staff_code"], name="staff_code_idx"),
            models.Index(fields=["position"], name="staff_pos_idx"),
            models.Index(fields=["employment_status"], name="staff_emp_st_idx"),
            models.Index(fields=["salary_status"], name="staff_sal_st_idx"),
            models.Index(fields=["mobile_number"], name="staff_mobile_idx"),
            models.Index(fields=["last_name"], name="staff_lname_idx"),
            models.Index(fields=["date_hired"], name="staff_hired_idx"),
            models.Index(fields=["created_at"], name="staff_created_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.staff_code} - {self.first_name} {self.last_name}"

    @classmethod
    def generate_staff_code(cls) -> str:
        latest_code = (
            cls.all_objects.filter(staff_code__startswith="STF-")
            .order_by("-staff_code")
            .values_list("staff_code", flat=True)
            .first()
        )

        next_number = 1
        if latest_code:
            try:
                next_number = int(latest_code.split("-")[1]) + 1
            except (IndexError, ValueError):
                next_number = 1

        while True:
            candidate = f"STF-{next_number:06d}"
            if not cls.all_objects.filter(staff_code=candidate).exists():
                return candidate
            next_number += 1

    def save(self, *args, **kwargs):
        if not self.staff_code:
            self.staff_code = self.generate_staff_code()
        super().save(*args, **kwargs)


class Trainer(BaseModel):
    staff = models.OneToOneField(Staff, on_delete=models.CASCADE, related_name="trainer_profile")
    trainer_code = models.CharField(max_length=10, unique=True, db_index=True, editable=False)
    assigned_classes = models.ManyToManyField(
        "schedule.ScheduleClass",
        related_name="assigned_trainers",
        blank=True,
    )

    class Meta:
        db_table = "staff_trainers"
        indexes = [
            models.Index(fields=["trainer_code"], name="stftr_code_idx"),
            models.Index(fields=["staff"], name="stftr_staff_idx"),
            models.Index(fields=["created_at"], name="stftr_created_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.trainer_code} - {self.staff.first_name} {self.staff.last_name}"

    @classmethod
    def generate_trainer_code(cls) -> str:
        latest_code = (
            cls.all_objects.filter(trainer_code__startswith="TRN-")
            .order_by("-trainer_code")
            .values_list("trainer_code", flat=True)
            .first()
        )

        next_number = 1
        if latest_code:
            try:
                next_number = int(latest_code.split("-")[1]) + 1
            except (IndexError, ValueError):
                next_number = 1

        while True:
            candidate = f"TRN-{next_number:06d}"
            if not cls.all_objects.filter(trainer_code=candidate).exists():
                return candidate
            next_number += 1

    def save(self, *args, **kwargs):
        if not self.trainer_code:
            self.trainer_code = self.generate_trainer_code()
        super().save(*args, **kwargs)
