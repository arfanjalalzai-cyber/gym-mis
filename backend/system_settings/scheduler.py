from __future__ import annotations

import logging
import threading
import time
from datetime import date

from django.db import close_old_connections
from django.utils import timezone

from .models import BackupJob, BackupScheduleSettings
from .services import create_scheduled_sqlite_backup, mark_stale_backup_jobs_failed

logger = logging.getLogger(__name__)

_scheduler_started = False


def _today_has_scheduled_backup(today: date) -> bool:
    return BackupJob.objects.filter(
        job_type="scheduled",
        status="success",
        created_at__date=today,
    ).exists()


def _should_run_now(settings_obj: BackupScheduleSettings) -> bool:
    now = timezone.localtime()
    today = now.date()

    if now.time().replace(second=0, microsecond=0) < settings_obj.run_time:
        return False
    if _today_has_scheduled_backup(today):
        return False
    if settings_obj.frequency == "weekly" and now.weekday() != settings_obj.weekday:
        return False
    if settings_obj.frequency == "monthly" and now.day != 1:
        return False
    return True


def _scheduler_loop() -> None:
    while True:
        try:
            close_old_connections()
            mark_stale_backup_jobs_failed()
            settings_obj = BackupScheduleSettings.get_solo()
            if settings_obj.enabled and _should_run_now(settings_obj):
                create_scheduled_sqlite_backup()
        except Exception:
            logger.exception("Scheduled backup check failed")
        finally:
            close_old_connections()
            time.sleep(60)


def start_backup_scheduler() -> None:
    global _scheduler_started
    if _scheduler_started:
        return

    _scheduler_started = True
    thread = threading.Thread(
        target=_scheduler_loop,
        name="system-settings-backup-scheduler",
        daemon=True,
    )
    thread.start()
