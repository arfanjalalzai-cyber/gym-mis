from django.apps import AppConfig
import os
import sys


class SystemSettingsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "system_settings"

    def ready(self):
        management_commands = {"makemigrations", "migrate", "test", "collectstatic", "shell"}
        if any(command in sys.argv for command in management_commands):
            return
        if os.environ.get("RUN_MAIN") not in {None, "true"}:
            return

        from .scheduler import start_backup_scheduler

        start_backup_scheduler()
