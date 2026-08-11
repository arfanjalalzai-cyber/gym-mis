from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("system_settings", "0002_seed_permissions_and_migrate_legacy_settings"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="systempreferencesettings",
            name="language",
        ),
    ]
