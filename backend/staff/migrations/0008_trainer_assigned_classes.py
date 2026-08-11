from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("schedule", "0004_alter_scheduleslot_trainer"),
        ("staff", "0007_staff_address"),
    ]

    operations = [
        migrations.AddField(
            model_name="trainer",
            name="assigned_classes",
            field=models.ManyToManyField(
                blank=True,
                related_name="assigned_trainers",
                to="schedule.scheduleclass",
            ),
        ),
    ]
