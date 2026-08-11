from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from core.base_models import BaseModel


class Equipment(BaseModel):
    ITEM_TYPE_CHOICES = [
        ("machine", "Machine"),
        ("accessory", "Accessory"),
        ("consumable", "Consumable"),
    ]

    CATEGORY_CHOICES = [
        ("cardio", "Cardio"),
        ("strength", "Strength"),
        ("free_weight", "Free Weight"),
        ("functional", "Functional"),
        ("recovery", "Recovery"),
        ("hygiene", "Hygiene"),
        ("nutrition", "Nutrition"),
        ("other", "Other"),
    ]

    MACHINE_STATUS_CHOICES = [
        ("operational", "Operational"),
        ("in_use", "In Use"),
        ("maintenance", "Maintenance"),
        ("out_of_order", "Out of Order"),
        ("retired", "Retired"),
    ]

    equipment_code = models.CharField(max_length=10, unique=True, db_index=True, editable=False)
    name = models.CharField(max_length=150)
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="other")
    quantity_on_hand = models.PositiveIntegerField()
    quantity_in_service = models.PositiveIntegerField(default=0)
    machine_status = models.CharField(
        max_length=20, choices=MACHINE_STATUS_CHOICES, blank=True, null=True
    )
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "inventory_equipment"
        indexes = [
            models.Index(fields=["equipment_code"]),
            models.Index(fields=["name"]),
            models.Index(fields=["item_type"]),
            models.Index(fields=["category"]),
            models.Index(fields=["machine_status"]),
            models.Index(fields=["quantity_on_hand"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.equipment_code} - {self.name}"

    @property
    def is_low_stock(self) -> bool:
        return self.quantity_on_hand <= self.quantity_in_service

    @classmethod
    def generate_equipment_code(cls) -> str:
        latest_code = (
            cls.all_objects.filter(equipment_code__startswith="EQP-")
            .order_by("-equipment_code")
            .values_list("equipment_code", flat=True)
            .first()
        )

        next_number = 1
        if latest_code:
            try:
                next_number = int(latest_code.split("-")[1]) + 1
            except (IndexError, ValueError):
                next_number = 1

        while True:
            candidate = f"EQP-{next_number:06d}"
            if not cls.all_objects.filter(equipment_code=candidate).exists():
                return candidate
            next_number += 1

    def clean(self):
        errors = {}

        if self.quantity_on_hand <= 0:
            errors["quantity_on_hand"] = "Quantity on hand must be greater than 0."

        if self.quantity_in_service > self.quantity_on_hand:
            errors["quantity_in_service"] = "Quantity in service cannot exceed quantity on hand."

        if self.item_type == "machine":
            if not self.machine_status:
                errors["machine_status"] = "Machine status is required for machine items."
        elif self.machine_status:
            errors["machine_status"] = "Machine status is only allowed when item type is machine."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if not self.equipment_code:
            self.equipment_code = self.generate_equipment_code()

        self.full_clean()
        super().save(*args, **kwargs)


class EquipmentHistory(models.Model):
    EVENT_TYPE_CHOICES = [
        ("created", "Created"),
        ("updated", "Updated"),
        ("quantity_adjusted", "Quantity Adjusted"),
        ("status_changed", "Status Changed"),
        ("deleted", "Deleted"),
        ("restored", "Restored"),
    ]

    EVENT_SOURCE_CHOICES = [
        ("form_edit", "Form Edit"),
        ("adjustment_action", "Adjustment Action"),
        ("status_action", "Status Action"),
        ("system", "System"),
    ]

    equipment = models.ForeignKey(
        Equipment, on_delete=models.CASCADE, related_name="history_entries"
    )
    event_type = models.CharField(max_length=30, choices=EVENT_TYPE_CHOICES)
    event_source = models.CharField(max_length=30, choices=EVENT_SOURCE_CHOICES, default="system")
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="equipment_history_entries",
    )
    before_snapshot = models.JSONField(null=True, blank=True)
    after_snapshot = models.JSONField(null=True, blank=True)
    quantity_on_hand_delta = models.IntegerField(null=True, blank=True)
    quantity_in_service_delta = models.IntegerField(null=True, blank=True)
    note = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "inventory_equipment_history"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["equipment"]),
            models.Index(fields=["event_type"]),
            models.Index(fields=["event_source"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.equipment_id} - {self.event_type} - {self.created_at.isoformat()}"
