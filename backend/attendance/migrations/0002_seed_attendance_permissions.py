from django.db import migrations


def seed_attendance_permissions(apps, schema_editor):
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
            module="attendance",
            action=action,
            defaults={"description": f"Can {action} attendance"},
        )
        created_permissions[action] = permission

    for role_name, actions in action_map.items():
        for action in actions:
            RolePermission.objects.get_or_create(
                role_name=role_name,
                permission=created_permissions[action],
            )


def reverse_seed_attendance_permissions(apps, schema_editor):
    Permission = apps.get_model("core", "Permission")
    RolePermission = apps.get_model("accounts", "RolePermission")

    attendance_permissions = Permission.objects.filter(module="attendance")
    RolePermission.objects.filter(permission__in=attendance_permissions).delete()
    attendance_permissions.delete()


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
        ("attendance", "0001_initial"),
        ("core", "0005_add_schedule_module_choice"),
    ]

    operations = [
        migrations.RunPython(seed_attendance_permissions, reverse_seed_attendance_permissions),
    ]

