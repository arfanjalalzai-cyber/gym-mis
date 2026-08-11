from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("schedule", "0004_alter_scheduleslot_trainer"),
        ("members", "0007_assign_default_plan_to_unplanned_members"),
    ]

    operations = [
        migrations.AddField(
            model_name="member",
            name="schedule_class",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="members",
                to="schedule.scheduleclass",
            ),
        ),
        migrations.AddIndex(
            model_name="member",
            index=models.Index(fields=["schedule_class"], name="members_schedule_class_id_idx"),
        ),
    ]
