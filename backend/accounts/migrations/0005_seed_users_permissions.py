from django.db import migrations


def seed_users_permissions(apps, schema_editor):
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
            module="users",
            action=action,
            defaults={"description": f"Can {action} users"},
        )
        created_permissions[action] = permission

    for role_name, actions in action_map.items():
        for action in actions:
            RolePermission.objects.get_or_create(
                role_name=role_name,
                permission=created_permissions[action],
            )


def reverse_seed_users_permissions(apps, schema_editor):
    Permission = apps.get_model("core", "Permission")
    RolePermission = apps.get_model("accounts", "RolePermission")

    users_permissions = Permission.objects.filter(module="users")
    RolePermission.objects.filter(permission__in=users_permissions).delete()
    users_permissions.delete()


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_map_legacy_roles_to_canonical"),
        ("core", "0005_add_schedule_module_choice"),
    ]

    operations = [
        migrations.RunPython(seed_users_permissions, reverse_seed_users_permissions),
    ]
