from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("staff", "0008_trainer_assigned_classes"),
    ]

    operations = [
        migrations.AlterField(
            model_name="staff",
            name="position",
            field=models.CharField(
                choices=[
                    ("trainer", "Trainer"),
                    ("manager", "Manager"),
                    ("cleaner", "Cleaner"),
                    ("other", "Other"),
                ],
                max_length=20,
            ),
        ),
    ]
