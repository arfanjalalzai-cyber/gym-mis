from django.db import migrations


def map_legacy_roles_to_canonical(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    RolePermission = apps.get_model("accounts", "RolePermission")

    User.objects.filter(role_name="receptionist").update(role_name="manager")
    User.objects.filter(role_name="viewer").update(role_name="staff")

    for old_role, new_role in (("receptionist", "manager"), ("viewer", "staff")):
        for role_perm in RolePermission.objects.filter(role_name=old_role):
            RolePermission.objects.get_or_create(
                role_name=new_role,
                permission_id=role_perm.permission_id,
            )


def reverse_map_roles(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    RolePermission = apps.get_model("accounts", "RolePermission")

    User.objects.filter(role_name="manager").update(role_name="receptionist")
    User.objects.filter(role_name="staff").update(role_name="viewer")

    for old_role, new_role in (("receptionist", "manager"), ("viewer", "staff")):
        RolePermission.objects.filter(role_name=new_role).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_alter_rolepermission_role_name_alter_user_role_name"),
    ]

    operations = [
        migrations.RunPython(map_legacy_roles_to_canonical, reverse_map_roles),
    ]
