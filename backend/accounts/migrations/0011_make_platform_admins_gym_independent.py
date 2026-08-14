from django.db import migrations


def separate_platform_admins(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.filter(is_superuser=True).update(role_name="super_admin", gym=None)
    User.objects.filter(role_name="super_admin").update(gym=None)


class Migration(migrations.Migration):
    dependencies = [("accounts", "0010_backfill_existing_records_to_default_gym")]

    operations = [migrations.RunPython(separate_platform_admins, migrations.RunPython.noop)]
