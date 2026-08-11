from django.db import migrations


def remove_manager_staff_default_write_permissions(apps, schema_editor):
    RolePermission = apps.get_model("accounts", "RolePermission")
    RolePermission.objects.filter(
        role_name__in=["manager", "staff", "receptionist", "viewer"],
        permission__action__in=["add", "change", "delete", "all"],
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0007_sync_legacy_role_permissions"),
    ]

    operations = [
        migrations.RunPython(remove_manager_staff_default_write_permissions, migrations.RunPython.noop),
    ]
