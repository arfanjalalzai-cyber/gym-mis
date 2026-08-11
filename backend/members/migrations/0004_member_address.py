from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("members", "0003_member_profile_blood_idcard"),
    ]

    operations = [
        migrations.AddField(
            model_name="member",
            name="address",
            field=models.TextField(blank=True, default=""),
        ),
    ]
