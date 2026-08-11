from django.db import migrations


def seed_schedule_permissions(apps, schema_editor):
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
            module="schedule",
            action=action,
            defaults={"description": f"Can {action} schedule"},
        )
        created_permissions[action] = permission

    for role_name, actions in action_map.items():
        for action in actions:
            RolePermission.objects.get_or_create(
                role_name=role_name,
                permission=created_permissions[action],
            )


def reverse_seed_schedule_permissions(apps, schema_editor):
    Permission = apps.get_model("core", "Permission")
    RolePermission = apps.get_model("accounts", "RolePermission")

    schedule_permissions = Permission.objects.filter(module="schedule")
    RolePermission.objects.filter(permission__in=schedule_permissions).delete()
    schedule_permissions.delete()


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
        ("core", "0005_add_schedule_module_choice"),
        ("schedule", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_schedule_permissions, reverse_seed_schedule_permissions),
    ]
