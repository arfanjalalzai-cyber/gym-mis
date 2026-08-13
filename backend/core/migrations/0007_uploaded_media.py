from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("core", "0006_gym_permission_modules")]

    operations = [
        migrations.CreateModel(
            name="UploadedMedia",
            fields=[
                ("name", models.CharField(max_length=500, primary_key=True, serialize=False)),
                ("content_type", models.CharField(blank=True, default="", max_length=100)),
                ("content", models.BinaryField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "uploaded_media"},
        ),
    ]
