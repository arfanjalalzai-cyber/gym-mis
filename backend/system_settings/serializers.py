from __future__ import annotations

from decimal import Decimal
import re
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from accounts.models import ActivityLog, ROLE_CHOICES, RolePermission, User
from core.models import Permission
from payments.models import MemberFeePlan

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
from .services import resolve_backup_directory_value

ROLE_ALIAS_TO_CANONICAL = {
    "receptionist": "manager",
    "viewer": "staff",
}
VALID_CANONICAL_ROLES = {"admin", "manager", "staff"}
AFGHAN_MOBILE_PATTERN = re.compile(r"^07\d{8}$")


def normalize_role_name(role_name: str) -> str:
    role_name = (role_name or "").strip().lower()
    return ROLE_ALIAS_TO_CANONICAL.get(role_name, role_name)


def role_name_for_storage(role_name: str) -> str:
    return normalize_role_name(role_name)


def role_name_for_response(role_name: str) -> str:
    return normalize_role_name(role_name)


class GymProfileSettingsSerializer(serializers.ModelSerializer):
    gym_logo_url = serializers.SerializerMethodField(read_only=True)
    login_page_image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = GymProfileSettings
        fields = [
            "gym_name",
            "gym_logo",
            "gym_logo_url",
            "login_page_image",
            "login_page_image_url",
            "address",
            "phone_number",
            "email",
            "website",
            "working_hours_json",
            "description",
        ]
        extra_kwargs = {
            "gym_logo": {"write_only": True, "required": False, "allow_null": True},
            "login_page_image": {"write_only": True, "required": False, "allow_null": True},
        }

    def get_gym_logo_url(self, obj):
        if not obj.gym_logo:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.gym_logo.url)
        return obj.gym_logo.url

    def get_login_page_image_url(self, obj):
        if not obj.login_page_image:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.login_page_image.url)
        return obj.login_page_image.url

    def validate_phone_number(self, value):
        normalized = (value or "").strip()
        if normalized in ("", None):
            return normalized
        if not AFGHAN_MOBILE_PATTERN.fullmatch(normalized):
            raise serializers.ValidationError(
                "Phone number must be exactly 10 digits and start with 07."
            )
        return normalized


class MembershipPlanTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipPlanTemplate
        fields = [
            "id",
            "name",
            "duration_type",
            "duration_months",
            "fee",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_fee(self, value):
        if value <= 0:
            raise serializers.ValidationError("Plan fee must be greater than 0.")
        return value

    def update(self, instance, validated_data):
        plan = super().update(instance, validated_data)
        sync_fields = {"billing_cycle": plan.duration_type, "cycle_fee_amount": plan.fee}
        MemberFeePlan.objects.filter(plan_template=plan).update(**sync_fields)
        return plan


class BillingSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillingSettings
        fields = [
            "default_currency",
            "payment_methods_json",
            "default_tax_percentage",
            "discount_mode",
            "discount_value",
            "invoice_prefix",
            "invoice_padding",
            "invoice_next_sequence",
        ]

    def validate_default_currency(self, value):
        if value != "AFN":
            raise serializers.ValidationError("Only AFN currency is supported in phase 1.")
        return value

    def validate_invoice_prefix(self, value):
        normalized = (value or "").strip()
        if not normalized:
            raise serializers.ValidationError("Invoice prefix is required.")
        return normalized

    def validate_discount_value(self, value):
        if value < 0:
            raise serializers.ValidationError("Discount value cannot be negative.")
        return value

    def validate_payment_methods_json(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("payment_methods_json must be a list.")
        supported = {"cash", "bank_transfer", "online"}
        invalid = [item for item in value if item not in supported]
        if invalid:
            raise serializers.ValidationError(f"Unsupported payment methods: {', '.join(invalid)}")
        return value

    def validate(self, attrs):
        prefix = attrs.get("invoice_prefix", getattr(self.instance, "invoice_prefix", "INV"))
        padding = attrs.get("invoice_padding", getattr(self.instance, "invoice_padding", 6))
        if len(prefix) + 1 + int(padding) > 24:
            raise serializers.ValidationError(
                {"invoice_padding": "Invoice prefix and padding must fit within 24 characters."}
            )

        discount_mode = attrs.get("discount_mode", getattr(self.instance, "discount_mode", "none"))
        discount_value = attrs.get("discount_value", getattr(self.instance, "discount_value", Decimal("0.00")))
        if discount_mode == "percentage" and discount_value > 100:
            raise serializers.ValidationError(
                {"discount_value": "Percentage discount cannot exceed 100."}
            )
        return attrs


class NotificationSettingsSerializer(serializers.ModelSerializer):
    smtp_password = serializers.CharField(required=False, allow_blank=True, write_only=True)
    sms_api_key = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = NotificationSettings
        fields = [
            "membership_expiry_alert_enabled",
            "membership_expiry_days_before",
            "payment_due_reminder_enabled",
            "payment_due_days_before",
            "sms_enabled",
            "sms_provider",
            "sms_sender_id",
            "sms_api_key",
            "email_enabled",
            "smtp_host",
            "smtp_port",
            "smtp_username",
            "smtp_password",
            "from_email",
        ]

    def update(self, instance, validated_data):
        smtp_password = validated_data.pop("smtp_password", None)
        sms_api_key = validated_data.pop("sms_api_key", None)
        if smtp_password not in [None, ""]:
            instance.smtp_password_encrypted = smtp_password
        if sms_api_key not in [None, ""]:
            instance.sms_api_key_encrypted = sms_api_key
        return super().update(instance, validated_data)


class SecuritySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SecuritySettings
        fields = [
            "min_password_length",
            "require_uppercase",
            "require_lowercase",
            "require_number",
            "require_special",
            "two_factor_enabled",
            "login_attempt_limit",
            "lockout_minutes",
        ]

    def validate_min_password_length(self, value):
        if value < 6 or value > 128:
            raise serializers.ValidationError("Minimum password length must be between 6 and 128.")
        return value

    def validate_login_attempt_limit(self, value):
        if value < 1 or value > 20:
            raise serializers.ValidationError("Login attempt limit must be between 1 and 20.")
        return value

    def validate_lockout_minutes(self, value):
        if value < 1 or value > 1440:
            raise serializers.ValidationError("Lockout minutes must be between 1 and 1440.")
        return value


class SystemPreferenceSettingsSerializer(serializers.ModelSerializer):
    SUPPORTED_CALENDAR_SYSTEMS = {"gregorian", "hijri_shamsi", "hijri_qamari"}
    SUPPORTED_DATE_FORMATS = {"YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"}
    SUPPORTED_TIME_FORMATS = {"24h", "12h"}

    class Meta:
        model = SystemPreferenceSettings
        fields = ["calendar_system", "date_format", "time_format", "timezone"]

    def validate_calendar_system(self, value):
        if value not in self.SUPPORTED_CALENDAR_SYSTEMS:
            raise serializers.ValidationError("Unsupported calendar system.")
        return value

    def validate_date_format(self, value):
        if value not in self.SUPPORTED_DATE_FORMATS:
            raise serializers.ValidationError("Unsupported date format.")
        return value

    def validate_time_format(self, value):
        if value not in self.SUPPORTED_TIME_FORMATS:
            raise serializers.ValidationError("Time format must be 12h or 24h.")
        return value

    def validate_timezone(self, value):
        normalized = (value or "").strip()
        try:
            ZoneInfo(normalized)
        except ZoneInfoNotFoundError:
            raise serializers.ValidationError("Timezone must be a valid IANA timezone.")
        return normalized


class BackupScheduleSettingsSerializer(serializers.ModelSerializer):
    resolved_backup_directory = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = BackupScheduleSettings
        fields = [
            "enabled",
            "frequency",
            "run_time",
            "weekday",
            "retention_count",
            "backup_directory",
            "resolved_backup_directory",
        ]

    def get_resolved_backup_directory(self, obj):
        return str(resolve_backup_directory_value(obj.backup_directory).resolve())

    def validate_backup_directory(self, value):
        normalized = (value or "").strip()
        if not normalized:
            return normalized

        path = resolve_backup_directory_value(normalized)

        try:
            path.mkdir(parents=True, exist_ok=True)
            test_file = path / ".gym_backup_write_test"
            test_file.write_text("ok", encoding="utf-8")
            test_file.unlink(missing_ok=True)
        except OSError as exc:
            raise serializers.ValidationError(
                f"Backup directory cannot be created or written to: {exc}"
            )

        return normalized


class BackupJobSerializer(serializers.ModelSerializer):
    triggered_by_username = serializers.CharField(source="triggered_by.username", read_only=True)

    class Meta:
        model = BackupJob
        fields = [
            "id",
            "job_type",
            "status",
            "file_path",
            "file_size_bytes",
            "started_at",
            "completed_at",
            "triggered_by",
            "triggered_by_username",
            "error_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class SettingsUserSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField()

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "username",
            "email",
            "phone",
            "role_name",
            "is_active",
            "last_login",
            "created_at",
        ]
        read_only_fields = ["id", "last_login", "created_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["role_name"] = role_name_for_response(data["role_name"])
        return data

    def validate_role_name(self, value):
        canonical = normalize_role_name(value)
        if canonical not in VALID_CANONICAL_ROLES:
            raise serializers.ValidationError("Role must be one of admin, manager, or staff.")
        return canonical

    def validate_phone(self, value):
        normalized = (value or "").strip()
        if normalized in ("", None):
            return normalized
        if not AFGHAN_MOBILE_PATTERN.fullmatch(normalized):
            raise serializers.ValidationError(
                "Phone number must be exactly 10 digits and start with 07."
            )
        return normalized

    def create(self, validated_data):
        request = self.context.get("request")
        role_name = validated_data.pop("role_name")
        password = validated_data.pop("password")

        if role_name == "admin" and request and request.user.role_name != "super_admin":
            raise serializers.ValidationError({"role_name": "Only superusers can create admin users."})

        gym = None
        if request and request.user.role_name != "super_admin":
            gym = request.user.gym
            if gym is None:
                raise serializers.ValidationError({"gym": "Your account is not assigned to a gym."})

        user = User.objects.create_user(
            role_name=role_name_for_storage(role_name),
            password=password,
            gym=gym,
            **validated_data,
        )
        return user

    def update(self, instance, validated_data):
        role_name = validated_data.pop("role_name", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if role_name is not None:
            instance.role_name = role_name_for_storage(role_name)
        instance.save()
        return instance


class SettingsUserCreateSerializer(SettingsUserSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta(SettingsUserSerializer.Meta):
        fields = SettingsUserSerializer.Meta.fields + ["password"]


class ChangeManagedUserPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(validators=[validate_password])


class PermissionAssignmentSerializer(serializers.Serializer):
    module = serializers.CharField()
    actions = serializers.ListField(child=serializers.ChoiceField(choices=["view", "add", "change", "delete"]))


class RolePermissionsUpdateSerializer(serializers.Serializer):
    role_name = serializers.CharField()
    permissions = PermissionAssignmentSerializer(many=True)

    def validate_role_name(self, value):
        canonical = normalize_role_name(value)
        if canonical not in VALID_CANONICAL_ROLES:
            raise serializers.ValidationError("Invalid role name.")
        return canonical


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            "id",
            "action",
            "table_name",
            "record_id",
            "old_values",
            "new_values",
            "ip_address",
            "user_agent",
            "timestamp",
            "user_name",
        ]

    def get_user_name(self, obj):
        full = obj.user.get_full_name().strip()
        return full or obj.user.username


class InvoicePreviewSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=Decimal("0.00"))
    invoice_prefix = serializers.CharField(required=False, allow_blank=False, max_length=20)
    invoice_padding = serializers.IntegerField(required=False, min_value=1, max_value=12)
    invoice_next_sequence = serializers.IntegerField(required=False, min_value=1)

    def validate(self, attrs):
        prefix = attrs.get("invoice_prefix")
        padding = attrs.get("invoice_padding")
        if prefix is not None and padding is not None and len(prefix.strip()) + 1 + padding > 24:
            raise serializers.ValidationError(
                {"invoice_padding": "Invoice prefix and padding must fit within 24 characters."}
            )
        return attrs


class RestoreBackupSerializer(serializers.Serializer):
    confirm = serializers.BooleanField()

    def validate_confirm(self, value):
        if not value:
            raise serializers.ValidationError("confirm must be true to restore backup.")
        return value


def get_available_roles_payload():
    role_codes = {choice[0] for choice in ROLE_CHOICES}
    canonical_roles = ["admin", "manager", "staff"]
    items = []
    for role in canonical_roles:
        storage_role = role_name_for_storage(role)
        if storage_role in role_codes:
            items.append({"name": role, "storage_role": storage_role})
    return items


def get_role_permissions_matrix(role_name: str):
    storage_role = role_name_for_storage(role_name)
    role_permissions = (
        RolePermission.objects.filter(role_name=storage_role)
        .select_related("permission")
        .order_by("permission__module", "permission__action")
    )
    modules = {}
    for entry in role_permissions:
        modules.setdefault(entry.permission.module, []).append(entry.permission.action)

    return [{"module": module, "actions": sorted(actions)} for module, actions in modules.items()]


def update_role_permissions_matrix(role_name: str, assignments: list[dict]):
    storage_role = role_name_for_storage(role_name)

    RolePermission.objects.filter(role_name=storage_role, permission__module="settings").delete()

    for item in assignments:
        module = item["module"]
        actions = set(item["actions"])

        permissions = Permission.objects.filter(module=module, action__in=actions)
        for permission in permissions:
            RolePermission.objects.get_or_create(role_name=storage_role, permission=permission)
