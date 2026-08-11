from django.db import migrations


def seed_reports_permissions(apps, schema_editor):
    Permission = apps.get_model("core", "Permission")
    RolePermission = apps.get_model("accounts", "RolePermission")

    action_map = {
        "admin": ["all"],
        "receptionist": ["view", "add", "change"],
        "viewer": ["view"],
    }

    created_permissions = {}
    for action in ["view", "add", "change", "delete", "all"]:
        permission, _ = Permission.objects.get_or_create(
            module="reports",
            action=action,
            defaults={"description": f"Can {action} reports"},
        )
        created_permissions[action] = permission

    for role_name, actions in action_map.items():
        for action in actions:
            RolePermission.objects.get_or_create(
                role_name=role_name,
                permission=created_permissions[action],
            )


def reverse_seed_reports_permissions(apps, schema_editor):
    Permission = apps.get_model("core", "Permission")
    RolePermission = apps.get_model("accounts", "RolePermission")

    reports_permissions = Permission.objects.filter(module="reports")
    RolePermission.objects.filter(permission__in=reports_permissions).delete()
    reports_permissions.delete()


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
        ("core", "0005_add_schedule_module_choice"),
        ("reports", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_reports_permissions, reverse_seed_reports_permissions),
    ]

