from django.contrib import admin

from .models import (
    BackupJob,
    BackupScheduleSettings,
    BillingSettings,
    GymProfileSettings,
    MembershipPlanTemplate,
    NotificationSettings,
    SecuritySettings,
    SystemPreferenceSettings,
)


@admin.register(GymProfileSettings)
class GymProfileSettingsAdmin(admin.ModelAdmin):
    list_display = ("gym_name", "email", "phone_number", "updated_at")


@admin.register(MembershipPlanTemplate)
class MembershipPlanTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "duration_type", "duration_months", "fee", "is_active")
    list_filter = ("duration_type", "is_active")
    search_fields = ("name",)


@admin.register(BillingSettings)
class BillingSettingsAdmin(admin.ModelAdmin):
    list_display = ("default_currency", "invoice_prefix", "invoice_next_sequence", "updated_at")


@admin.register(NotificationSettings)
class NotificationSettingsAdmin(admin.ModelAdmin):
    list_display = ("email_enabled", "sms_enabled", "updated_at")


@admin.register(SecuritySettings)
class SecuritySettingsAdmin(admin.ModelAdmin):
    list_display = ("min_password_length", "login_attempt_limit", "two_factor_enabled", "updated_at")


@admin.register(SystemPreferenceSettings)
class SystemPreferenceSettingsAdmin(admin.ModelAdmin):
    list_display = ("date_format", "time_format", "timezone", "updated_at")


@admin.register(BackupScheduleSettings)
class BackupScheduleSettingsAdmin(admin.ModelAdmin):
    list_display = ("enabled", "frequency", "run_time", "weekday", "retention_count")


@admin.register(BackupJob)
class BackupJobAdmin(admin.ModelAdmin):
    list_display = ("id", "job_type", "status", "triggered_by", "file_size_bytes", "created_at")
    list_filter = ("job_type", "status")
    search_fields = ("file_path", "error_message")
