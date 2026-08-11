from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("system_settings", "0003_remove_systempreferencesettings_language"),
    ]

    operations = [
        migrations.AddField(
            model_name="systempreferencesettings",
            name="calendar_system",
            field=models.CharField(
                choices=[
                    ("gregorian", "Gregorian"),
                    ("hijri_shamsi", "Hijri Shamsi"),
                    ("hijri_qamari", "Hijri Qamari"),
                ],
                default="gregorian",
                max_length=20,
            ),
        ),
    ]
