from django.db import migrations, models


GYM_MODULES = [
    ("users", "Users"),
    ("members", "Members"),
    ("staff", "Staff"),
    ("inventory", "Inventory"),
    ("schedule", "Schedule"),
    ("attendance", "Attendance"),
    ("fees", "Payments and Billing"),
    ("reports", "Reports"),
    ("settings", "Settings"),
    ("cards", "Cards"),
]

GYM_MODULE_NAMES = [name for name, _ in GYM_MODULES]
CRUD_ACTIONS = ["view", "add", "change", "delete"]


def cleanup_and_seed_gym_permissions(apps, schema_editor):
    Permission = apps.get_model("core", "Permission")
    RolePermission = apps.get_model("accounts", "RolePermission")
    UserPermission = apps.get_model("accounts", "UserPermission")

    legacy_permissions = Permission.objects.exclude(module__in=GYM_MODULE_NAMES)
    RolePermission.objects.filter(permission__in=legacy_permissions).delete()
    UserPermission.objects.filter(permission__in=legacy_permissions).delete()
    legacy_permissions.delete()

    for module in GYM_MODULE_NAMES:
        for action in CRUD_ACTIONS:
            Permission.objects.get_or_create(
                module=module,
                action=action,
                defaults={"description": f"Can {action} {module}"},
            )

    role_actions = {
        "admin": CRUD_ACTIONS,
        "manager": ["view", "add", "change"],
        "staff": ["view"],
    }

    for role_name, actions in role_actions.items():
        for module in GYM_MODULE_NAMES:
            for action in actions:
                permission = Permission.objects.filter(module=module, action=action).first()
                if permission:
                    RolePermission.objects.get_or_create(
                        role_name=role_name,
                        permission=permission,
                    )


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0005_add_schedule_module_choice"),
        ("accounts", "0005_seed_users_permissions"),
    ]

    operations = [
        migrations.AlterField(
            model_name="permission",
            name="module",
            field=models.CharField(choices=GYM_MODULES, max_length=50),
        ),
        migrations.RunPython(cleanup_and_seed_gym_permissions, migrations.RunPython.noop),
    ]
