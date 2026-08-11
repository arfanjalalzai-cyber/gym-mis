from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0005_seed_users_permissions"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="user",
            name="language_preference",
        ),
    ]
