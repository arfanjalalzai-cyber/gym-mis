from django.db import migrations


def seed_permissions_and_migrate_legacy_settings(apps, schema_editor):
    CoreSettings = apps.get_model("core", "Settings")
    Permission = apps.get_model("core", "Permission")
    RolePermission = apps.get_model("accounts", "RolePermission")

    GymProfileSettings = apps.get_model("system_settings", "GymProfileSettings")
    NotificationSettings = apps.get_model("system_settings", "NotificationSettings")
    BillingSettings = apps.get_model("system_settings", "BillingSettings")
    SecuritySettings = apps.get_model("system_settings", "SecuritySettings")
    SystemPreferenceSettings = apps.get_model("system_settings", "SystemPreferenceSettings")
    BackupScheduleSettings = apps.get_model("system_settings", "BackupScheduleSettings")
    MembershipPlanTemplate = apps.get_model("system_settings", "MembershipPlanTemplate")

    gym_profile, _ = GymProfileSettings.objects.get_or_create(pk=1)
    notification, _ = NotificationSettings.objects.get_or_create(pk=1)
    BillingSettings.objects.get_or_create(
        pk=1,
        defaults={
            "default_currency": "AFN",
            "payment_methods_json": ["cash", "bank_transfer", "online"],
            "discount_mode": "none",
            "discount_value": 0,
            "invoice_prefix": "INV",
            "invoice_padding": 6,
            "invoice_next_sequence": 1,
        },
    )
    SecuritySettings.objects.get_or_create(pk=1)
    SystemPreferenceSettings.objects.get_or_create(pk=1)
    BackupScheduleSettings.objects.get_or_create(pk=1)

    # Migrate legacy key-value settings if present.
    key_map = {
        "shop_name": "gym_name",
        "address": "address",
        "phone_number": "phone_number",
        "contact_email": "email",
    }

    for old_key, new_field in key_map.items():
        legacy = CoreSettings.objects.filter(setting_key=old_key).first()
        if legacy and legacy.setting_value:
            setattr(gym_profile, new_field, legacy.setting_value)

    legacy_logo = CoreSettings.objects.filter(setting_key="shop_logo", setting_type="image").first()
    if legacy_logo and legacy_logo.setting_image:
        gym_profile.gym_logo = legacy_logo.setting_image

    gym_profile.save()

    smtp_map = {
        "smtp_host": "smtp_host",
        "smtp_port": "smtp_port",
        "smtp_username": "smtp_username",
        "smtp_password": "smtp_password_encrypted",
        "from_email": "from_email",
    }

    for old_key, new_field in smtp_map.items():
        legacy = CoreSettings.objects.filter(setting_key=old_key).first()
        if legacy and legacy.setting_value not in [None, ""]:
            if old_key == "smtp_port":
                try:
                    setattr(notification, new_field, int(legacy.setting_value))
                except ValueError:
                    pass
            else:
                setattr(notification, new_field, legacy.setting_value)

    if notification.smtp_host and notification.from_email:
        notification.email_enabled = True
    notification.save()

    for plan in (
        {"name": "Basic", "duration_type": "monthly", "duration_months": 1, "fee": "1500.00", "description": "Basic monthly membership"},
        {"name": "Premium", "duration_type": "quarterly", "duration_months": 3, "fee": "4000.00", "description": "Premium quarterly membership"},
        {"name": "VIP", "duration_type": "yearly", "duration_months": 12, "fee": "14000.00", "description": "VIP yearly membership"},
    ):
        MembershipPlanTemplate.objects.get_or_create(
            name=plan["name"],
            duration_type=plan["duration_type"],
            defaults={
                "duration_months": plan["duration_months"],
                "fee": plan["fee"],
                "description": plan["description"],
                "is_active": True,
            },
        )

    created_permissions = {}
    for action in ("view", "add", "change", "delete"):
        permission, _ = Permission.objects.get_or_create(
            module="settings",
            action=action,
            defaults={"description": f"Can {action} settings"},
        )
        created_permissions[action] = permission

    role_actions = {
        "admin": ["view", "add", "change", "delete"],
        "manager": ["view", "add", "change"],
        "staff": ["view"],
    }

    for role_name, actions in role_actions.items():
        for action in actions:
            RolePermission.objects.get_or_create(
                role_name=role_name,
                permission_id=created_permissions[action].id,
            )


def reverse_seed_permissions_and_legacy_data(apps, schema_editor):
    Permission = apps.get_model("core", "Permission")
    RolePermission = apps.get_model("accounts", "RolePermission")

    permissions = Permission.objects.filter(module="settings")
    RolePermission.objects.filter(permission__in=permissions).delete()
    permissions.delete()


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_add_schedule_module_choice"),
        ("accounts", "0004_map_legacy_roles_to_canonical"),
        ("system_settings", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_permissions_and_migrate_legacy_settings, reverse_seed_permissions_and_legacy_data),
    ]
