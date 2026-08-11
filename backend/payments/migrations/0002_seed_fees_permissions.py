from django.db import migrations


def seed_fees_permissions(apps, schema_editor):
    Permission = apps.get_model("core", "Permission")
    RolePermission = apps.get_model("accounts", "RolePermission")

    action_map = {
        "admin": ["all"],
        "manager": ["view", "add", "change"],
        "staff": ["view"],
        "receptionist": ["view", "add", "change"],
        "viewer": ["view"],
    }

    created_permissions = {}
    for action in ["view", "add", "change", "delete", "all"]:
        permission, _ = Permission.objects.get_or_create(
            module="fees",
            action=action,
            defaults={"description": f"Can {action} fees and billing"},
        )
        created_permissions[action] = permission

    for role_name, actions in action_map.items():
        for action in actions:
            RolePermission.objects.get_or_create(
                role_name=role_name,
                permission=created_permissions[action],
            )


def reverse_seed_fees_permissions(apps, schema_editor):
    Permission = apps.get_model("core", "Permission")
    RolePermission = apps.get_model("accounts", "RolePermission")

    fees_permissions = Permission.objects.filter(module="fees")
    RolePermission.objects.filter(permission__in=fees_permissions).delete()
    fees_permissions.delete()


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_map_legacy_roles_to_canonical"),
        ("core", "0005_add_schedule_module_choice"),
        ("payments", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_fees_permissions, reverse_seed_fees_permissions),
    ]
