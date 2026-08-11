from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

from django.conf import settings
from django.db import connections
from django.utils import timezone

from accounts.models import ActivityLog

from .models import BackupJob, BackupScheduleSettings

STALE_BACKUP_JOB_MINUTES = 60
USER_FOLDER_ALIASES = {"desktop", "documents", "downloads"}


def _default_backup_dir() -> Path:
    return Path(settings.BASE_DIR) / "backups"


def resolve_backup_directory_value(value: str | None) -> Path:
    configured = (value or "").strip()
    if not configured:
        return _default_backup_dir()

    configured_path = Path(configured).expanduser()
    if configured_path.is_absolute():
        return configured_path

    first_part = configured_path.parts[0].lower() if configured_path.parts else ""
    if first_part in USER_FOLDER_ALIASES:
        return Path.home() / configured_path

    return Path(settings.BASE_DIR) / configured_path


def _resolve_configured_backup_dir() -> Path:
    schedule = BackupScheduleSettings.get_solo()
    return resolve_backup_directory_value(schedule.backup_directory)
    return _default_backup_dir()


def resolve_backup_path(job: BackupJob) -> Path:
    return Path(job.file_path).resolve()


def validate_sqlite_backup_file(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError("Backup file does not exist.")
    if not path.is_file():
        raise ValueError("Backup path is not a file.")

    connection = sqlite3.connect(str(path))
    try:
        result = connection.execute("PRAGMA integrity_check;").fetchone()
    finally:
        connection.close()

    if not result or result[0] != "ok":
        raise ValueError("Backup file integrity check failed.")


def _copy_sqlite_database(source_path: Path, target_path: Path) -> None:
    source = sqlite3.connect(f"file:{source_path}?mode=ro", uri=True)
    target = sqlite3.connect(str(target_path))
    try:
        source.backup(target)
    finally:
        target.close()
        source.close()


def _sqlite_datetime(value) -> str:
    if value is None:
        return ""
    return value.isoformat(sep=" ")


def _sync_backup_job_record_inside_backup_file(job: BackupJob, backup_path: Path) -> None:
    connection = sqlite3.connect(str(backup_path))
    try:
        cursor = connection.execute(
            """
            UPDATE system_settings_backup_jobs
            SET status = ?,
                file_path = ?,
                file_size_bytes = ?,
                completed_at = ?,
                error_message = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                job.status,
                job.file_path,
                job.file_size_bytes,
                _sqlite_datetime(job.completed_at),
                job.error_message,
                _sqlite_datetime(timezone.now()),
                job.id,
            ),
        )
        if cursor.rowcount == 0:
            connection.execute(
                """
                INSERT INTO system_settings_backup_jobs (
                    id,
                    job_type,
                    status,
                    file_path,
                    file_size_bytes,
                    started_at,
                    completed_at,
                    error_message,
                    created_at,
                    updated_at,
                    deleted_at,
                    triggered_by_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    job.id,
                    job.job_type,
                    job.status,
                    job.file_path,
                    job.file_size_bytes,
                    _sqlite_datetime(job.started_at),
                    _sqlite_datetime(job.completed_at),
                    job.error_message,
                    _sqlite_datetime(job.created_at),
                    _sqlite_datetime(timezone.now()),
                    None,
                    job.triggered_by_id,
                ),
            )
        connection.commit()
    finally:
        connection.close()


def _apply_backup_retention() -> None:
    schedule = BackupScheduleSettings.get_solo()
    keep_count = max(1, schedule.retention_count or 1)
    old_jobs = BackupJob.objects.filter(
        job_type__in=["manual", "scheduled"],
        status="success",
    ).order_by("-created_at")[keep_count:]

    for old_job in old_jobs:
        old_path = Path(old_job.file_path)
        try:
            if old_path.exists() and old_path.is_file():
                old_path.unlink()
        except OSError:
            pass
        old_job.soft_delete()


def mark_stale_backup_jobs_failed() -> int:
    cutoff = timezone.now() - timedelta(minutes=STALE_BACKUP_JOB_MINUTES)
    stale_jobs = BackupJob.objects.filter(
        status__in=["pending", "running"],
        created_at__lt=cutoff,
    )
    count = stale_jobs.count()
    stale_jobs.update(
        status="failed",
        error_message="Backup job did not complete and was marked failed by maintenance cleanup.",
        completed_at=timezone.now(),
    )
    return count


def create_sqlite_backup(*, job_type: str = "manual", triggered_by=None) -> BackupJob:
    db_name = settings.DATABASES["default"]["NAME"]
    db_path = Path(db_name).resolve()
    if not db_path.exists() or not db_path.is_file():
        raise FileNotFoundError("SQLite database file does not exist.")

    backup_dir = _resolve_configured_backup_dir()
    backup_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    target_file = backup_dir / f"gym_backup_{stamp}.sqlite3"

    job = BackupJob.objects.create(
        job_type=job_type,
        status="running",
        started_at=timezone.now(),
        triggered_by=triggered_by,
    )

    try:
        _copy_sqlite_database(db_path, target_file)
        validate_sqlite_backup_file(target_file)
        file_size = target_file.stat().st_size
        job.file_path = str(target_file)
        job.file_size_bytes = file_size
        job.status = "success"
        job.completed_at = timezone.now()
        job.save(update_fields=["file_path", "file_size_bytes", "status", "completed_at", "updated_at"])
        _sync_backup_job_record_inside_backup_file(job, target_file)
        _apply_backup_retention()
    except Exception as exc:
        job.status = "failed"
        job.error_message = str(exc)
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "error_message", "completed_at", "updated_at"])
        raise

    return job


def create_manual_sqlite_backup(*, triggered_by=None) -> BackupJob:
    return create_sqlite_backup(job_type="manual", triggered_by=triggered_by)


def create_scheduled_sqlite_backup() -> BackupJob:
    return create_sqlite_backup(job_type="scheduled", triggered_by=None)


def restore_sqlite_backup(*, backup_job: BackupJob, triggered_by=None) -> BackupJob:
    if backup_job.job_type == "restore":
        raise ValueError("Restore jobs cannot be restored.")
    if backup_job.status != "success":
        raise ValueError("Only successful backup jobs can be restored.")
    if not backup_job.file_path:
        raise ValueError("Backup job does not have a file path.")

    source_path = resolve_backup_path(backup_job)
    db_name = settings.DATABASES["default"]["NAME"]
    db_path = Path(db_name).resolve()

    restore_job = BackupJob.objects.create(
        job_type="restore",
        status="running",
        file_path=str(source_path),
        file_size_bytes=source_path.stat().st_size if source_path.exists() else 0,
        started_at=timezone.now(),
        triggered_by=triggered_by,
    )

    try:
        validate_sqlite_backup_file(source_path)
        connections.close_all()
        _copy_sqlite_database(source_path, db_path)
        restore_job.status = "success"
        restore_job.completed_at = timezone.now()
        BackupJob.all_objects.update_or_create(
            pk=restore_job.pk,
            defaults={
                "job_type": restore_job.job_type,
                "status": restore_job.status,
                "file_path": restore_job.file_path,
                "file_size_bytes": restore_job.file_size_bytes,
                "started_at": restore_job.started_at,
                "completed_at": restore_job.completed_at,
                "triggered_by": triggered_by,
                "error_message": "",
            },
        )
    except Exception as exc:
        restore_job.status = "failed"
        restore_job.error_message = str(exc)
        restore_job.completed_at = timezone.now()
        BackupJob.all_objects.update_or_create(
            pk=restore_job.pk,
            defaults={
                "job_type": restore_job.job_type,
                "status": restore_job.status,
                "file_path": restore_job.file_path,
                "file_size_bytes": restore_job.file_size_bytes,
                "started_at": restore_job.started_at,
                "completed_at": restore_job.completed_at,
                "triggered_by": triggered_by,
                "error_message": restore_job.error_message,
            },
        )
        raise

    return restore_job


def get_system_logs(*, limit: int = 200):
    queryset = ActivityLog.objects.select_related("user").order_by("-timestamp")[:limit]
    return queryset
