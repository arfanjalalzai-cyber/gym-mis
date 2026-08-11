from django.db import migrations


def sync_legacy_role_permissions(apps, schema_editor):
    RolePermission = apps.get_model("accounts", "RolePermission")

    for legacy_role, canonical_role in (("receptionist", "manager"), ("viewer", "staff")):
        legacy_permissions = list(
            RolePermission.objects.filter(role_name=legacy_role).values_list("permission_id", flat=True)
        )
        if legacy_permissions:
            RolePermission.objects.filter(role_name=canonical_role).delete()
            for permission_id in legacy_permissions:
                RolePermission.objects.get_or_create(
                    role_name=canonical_role,
                    permission_id=permission_id,
                )
        RolePermission.objects.filter(role_name=legacy_role).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0006_remove_user_language_preference"),
    ]

    operations = [
        migrations.RunPython(sync_legacy_role_permissions, migrations.RunPython.noop),
    ]
