from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("staff", "0006_remove_staff_staff_att_st_idx_alter_staff_position_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="staff",
            name="address",
            field=models.TextField(blank=True, default=""),
        ),
    ]
