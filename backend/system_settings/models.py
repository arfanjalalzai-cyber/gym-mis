from __future__ import annotations

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.base_models import BaseModel


class SingletonSettingsModel(BaseModel):
    """For settings tables that should only have one row."""

    singleton_pk = 1

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        from core.managers import get_current_gym

        gym = get_current_gym()
        if gym is None:
            from accounts.models import Gym

            active_gyms = Gym.objects.filter(is_active=True)
            if active_gyms.count() == 1:
                gym = active_gyms.first()
        lookup = {"gym": gym} if gym is not None else {"gym__isnull": True}
        obj, _ = cls.all_objects.get_or_create(**lookup)
        if obj.deleted_at is not None:
            obj.deleted_at = None
            obj.save(update_fields=["deleted_at", "updated_at"])
        return obj


class GymProfileSettings(SingletonSettingsModel):
    gym_name = models.CharField(max_length=255, default="Gym MIS")
    gym_logo = models.ImageField(upload_to="settings/gym_logo/", blank=True, null=True)
    login_page_image = models.ImageField(upload_to="settings/login_page/", blank=True, null=True)
    address = models.TextField(blank=True, default="")
    phone_number = models.CharField(max_length=20, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    website = models.URLField(blank=True, default="")
    working_hours_json = models.JSONField(default=dict, blank=True)
    description = models.TextField(blank=True, default="")

    class Meta:
        db_table = "system_settings_gym_profile"


class MembershipPlanTemplate(BaseModel):
    DURATION_TYPE_CHOICES = [
        ("monthly", "Monthly"),
        ("quarterly", "Quarterly"),
        ("yearly", "Yearly"),
    ]

    name = models.CharField(max_length=120)
    duration_type = models.CharField(max_length=20, choices=DURATION_TYPE_CHOICES)
    duration_months = models.PositiveSmallIntegerField()
    fee = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "system_settings_membership_plan_templates"
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["is_active"]),
        ]


class BillingSettings(SingletonSettingsModel):
    DISCOUNT_MODE_CHOICES = [
        ("none", "No default discount"),
        ("percentage", "Percentage"),
        ("fixed", "Fixed amount"),
    ]

    default_currency = models.CharField(max_length=10, default="AFN")
    payment_methods_json = models.JSONField(default=list, blank=True)
    default_tax_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    discount_mode = models.CharField(max_length=20, choices=DISCOUNT_MODE_CHOICES, default="none")
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    invoice_prefix = models.CharField(max_length=20, default="INV")
    invoice_padding = models.PositiveSmallIntegerField(default=6)
    invoice_next_sequence = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = "system_settings_billing"


class NotificationSettings(SingletonSettingsModel):
    membership_expiry_alert_enabled = models.BooleanField(default=True)
    membership_expiry_days_before = models.PositiveSmallIntegerField(default=7)
    payment_due_reminder_enabled = models.BooleanField(default=True)
    payment_due_days_before = models.PositiveSmallIntegerField(default=3)

    sms_enabled = models.BooleanField(default=False)
    sms_provider = models.CharField(max_length=100, blank=True, default="")
    sms_sender_id = models.CharField(max_length=100, blank=True, default="")
    sms_api_key_encrypted = models.TextField(blank=True, default="")

    email_enabled = models.BooleanField(default=False)
    smtp_host = models.CharField(max_length=255, blank=True, default="")
    smtp_port = models.PositiveIntegerField(default=587)
    smtp_username = models.CharField(max_length=255, blank=True, default="")
    smtp_password_encrypted = models.TextField(blank=True, default="")
    from_email = models.EmailField(blank=True, default="")

    class Meta:
        db_table = "system_settings_notifications"


class SecuritySettings(SingletonSettingsModel):
    min_password_length = models.PositiveSmallIntegerField(default=8)
    require_uppercase = models.BooleanField(default=True)
    require_lowercase = models.BooleanField(default=True)
    require_number = models.BooleanField(default=True)
    require_special = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    login_attempt_limit = models.PositiveSmallIntegerField(default=5)
    lockout_minutes = models.PositiveSmallIntegerField(default=30)

    class Meta:
        db_table = "system_settings_security"


class SystemPreferenceSettings(SingletonSettingsModel):
    CALENDAR_SYSTEM_CHOICES = [
        ("gregorian", "Gregorian"),
        ("hijri_shamsi", "Hijri Shamsi"),
        ("hijri_qamari", "Hijri Qamari"),
    ]

    calendar_system = models.CharField(
        max_length=20,
        choices=CALENDAR_SYSTEM_CHOICES,
        default="gregorian",
    )
    date_format = models.CharField(max_length=30, default="YYYY-MM-DD")
    time_format = models.CharField(max_length=20, default="24h")
    timezone = models.CharField(max_length=64, default="Asia/Kabul")

    class Meta:
        db_table = "system_settings_preferences"


class BackupScheduleSettings(SingletonSettingsModel):
    FREQUENCY_CHOICES = [
        ("daily", "Daily"),
        ("weekly", "Weekly"),
        ("monthly", "Monthly"),
    ]

    enabled = models.BooleanField(default=False)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default="daily")
    run_time = models.TimeField(default="02:00")
    weekday = models.PositiveSmallIntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(6)])
    retention_count = models.PositiveSmallIntegerField(default=7)
    backup_directory = models.CharField(max_length=500, blank=True, default="")

    class Meta:
        db_table = "system_settings_backup_schedule"


class BackupJob(BaseModel):
    JOB_TYPE_CHOICES = [
        ("manual", "Manual"),
        ("scheduled", "Scheduled"),
        ("restore", "Restore"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("running", "Running"),
        ("success", "Success"),
        ("failed", "Failed"),
    ]

    job_type = models.CharField(max_length=20, choices=JOB_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    file_path = models.CharField(max_length=1000, blank=True, default="")
    file_size_bytes = models.BigIntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="settings_backup_jobs",
    )
    error_message = models.TextField(blank=True, default="")

    class Meta:
        db_table = "system_settings_backup_jobs"
        indexes = [
            models.Index(fields=["job_type", "status"]),
            models.Index(fields=["created_at"]),
        ]
