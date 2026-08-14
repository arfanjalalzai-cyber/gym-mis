from django.db import migrations


def remove_global_access_from_gym_roles(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.exclude(role_name="super_admin").filter(is_superuser=True).update(is_superuser=False)


class Migration(migrations.Migration):
    dependencies = [("accounts", "0011_make_platform_admins_gym_independent")]

    operations = [migrations.RunPython(remove_global_access_from_gym_roles, migrations.RunPython.noop)]
