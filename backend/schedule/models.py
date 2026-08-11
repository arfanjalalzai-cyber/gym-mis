from datetime import date

from django.core.exceptions import ValidationError
from django.db import models

from core.base_models import BaseModel


class ScheduleClass(BaseModel):
    class_code = models.CharField(max_length=10, unique=True, db_index=True, editable=False)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True, null=True)
    default_duration_minutes = models.PositiveIntegerField(default=60)
    max_capacity = models.PositiveIntegerField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "schedule_classes"
        indexes = [
            models.Index(fields=["class_code"], name="schcls_code_idx"),
            models.Index(fields=["name"], name="schcls_name_idx"),
            models.Index(fields=["is_active"], name="schcls_active_idx"),
            models.Index(fields=["created_at"], name="schcls_created_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.class_code} - {self.name}"

    @classmethod
    def generate_class_code(cls) -> str:
        latest_code = (
            cls.all_objects.filter(class_code__startswith="CLS-")
            .order_by("-class_code")
            .values_list("class_code", flat=True)
            .first()
        )

        next_number = 1
        if latest_code:
            try:
                next_number = int(latest_code.split("-")[1]) + 1
            except (IndexError, ValueError):
                next_number = 1

        while True:
            candidate = f"CLS-{next_number:06d}"
            if not cls.all_objects.filter(class_code=candidate).exists():
                return candidate
            next_number += 1

    def clean(self):
        errors = {}

        if not self.name or not str(self.name).strip():
            errors["name"] = "Class name is required."

        if self.default_duration_minutes <= 0:
            errors["default_duration_minutes"] = "Default duration must be greater than 0."

        if self.max_capacity is not None and self.max_capacity <= 0:
            errors["max_capacity"] = "Max capacity must be greater than 0."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if not self.class_code:
            self.class_code = self.generate_class_code()
        self.full_clean()
        super().save(*args, **kwargs)


class ScheduleSlot(BaseModel):
    WEEKDAY_CHOICES = [
        (0, "Monday"),
        (1, "Tuesday"),
        (2, "Wednesday"),
        (3, "Thursday"),
        (4, "Friday"),
        (5, "Saturday"),
        (6, "Sunday"),
    ]

    schedule_class = models.ForeignKey(
        ScheduleClass, on_delete=models.PROTECT, related_name="slots"
    )
    trainer = models.ForeignKey(
        "staff.Trainer", on_delete=models.PROTECT, related_name="schedule_slots"
    )
    weekday = models.PositiveSmallIntegerField(choices=WEEKDAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    effective_from = models.DateField(blank=True, null=True)
    effective_to = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "schedule_slots"
        indexes = [
            models.Index(fields=["weekday", "start_time"], name="schslot_week_start_idx"),
            models.Index(fields=["trainer"], name="schslot_trainer_idx"),
            models.Index(fields=["schedule_class"], name="schslot_class_idx"),
            models.Index(fields=["is_active"], name="schslot_active_idx"),
            models.Index(fields=["created_at"], name="schslot_created_idx"),
        ]
        ordering = ["weekday", "start_time"]

    def __str__(self) -> str:
        return (
            f"{self.schedule_class.name} ({self.get_weekday_display()} "
            f"{self.start_time.strftime('%H:%M')}-{self.end_time.strftime('%H:%M')})"
        )

    @staticmethod
    def date_ranges_overlap(
        existing_from: date | None,
        existing_to: date | None,
        incoming_from: date | None,
        incoming_to: date | None,
    ) -> bool:
        start_a = existing_from or date.min
        end_a = existing_to or date.max
        start_b = incoming_from or date.min
        end_b = incoming_to or date.max
        return start_a <= end_b and start_b <= end_a

    def clean(self):
        errors = {}

        if self.weekday not in {0, 1, 2, 3, 4, 5, 6}:
            errors["weekday"] = "Weekday must be between 0 (Monday) and 6 (Sunday)."

        if self.end_time <= self.start_time:
            errors["end_time"] = "End time must be after start time."

        if self.effective_from and self.effective_to and self.effective_to < self.effective_from:
            errors["effective_to"] = "Effective end date cannot be before effective start date."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
