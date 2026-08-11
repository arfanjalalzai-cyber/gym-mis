from django.db import migrations


def seed_inventory_permissions(apps, schema_editor):
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
            module="inventory",
            action=action,
            defaults={"description": f"Can {action} inventory"},
        )
        created_permissions[action] = permission

    for role_name, actions in action_map.items():
        for action in actions:
            RolePermission.objects.get_or_create(
                role_name=role_name,
                permission=created_permissions[action],
            )


def reverse_seed_inventory_permissions(apps, schema_editor):
    Permission = apps.get_model("core", "Permission")
    RolePermission = apps.get_model("accounts", "RolePermission")

    inventory_permissions = Permission.objects.filter(module="inventory")
    RolePermission.objects.filter(permission__in=inventory_permissions).delete()
    inventory_permissions.delete()


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
        ("core", "0004_remove_trainers_module_choice"),
        ("inventory", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_inventory_permissions, reverse_seed_inventory_permissions),
    ]
