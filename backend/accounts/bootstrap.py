"""Deployment-only bootstrap tasks that must also work with Railpack commands."""

import os

from django.db import IntegrityError, OperationalError, ProgrammingError, transaction


def ensure_default_superuser() -> None:
    """Create or repair the configured admin when the database is available.

    This runs only when explicitly enabled. It deliberately tolerates a database
    that has not been migrated yet; the next application worker will retry after
    migrations are complete.
    """
    if os.getenv("CREATE_DEFAULT_SUPERUSER", "false").lower() != "true":
        return

    username = os.getenv("DJANGO_SUPERUSER_USERNAME")
    password = os.getenv("DJANGO_SUPERUSER_PASSWORD")
    if not username or not password:
        return

    try:
        from .models import User

        with transaction.atomic():
            user = User._base_manager.filter(username=username).first()
            if user is None:
                try:
                    User.objects.create_superuser(
                        username=username,
                        email=os.getenv("DJANGO_SUPERUSER_EMAIL", ""),
                        password=password,
                    )
                    return
                except IntegrityError:
                    # Another Gunicorn worker created it at the same time.
                    user = User._base_manager.get(username=username)

            changed_fields = []
            for field, value in {
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
                "role_name": "admin",
                "email_verified": True,
            }.items():
                if getattr(user, field) != value:
                    setattr(user, field, value)
                    changed_fields.append(field)

            if os.getenv("DEFAULT_SUPERUSER_UPDATE_PASSWORD", "false").lower() == "true":
                user.set_password(password)
                changed_fields.append("password")
            if changed_fields:
                user.save(update_fields=changed_fields)
    except (OperationalError, ProgrammingError):
        # Database migrations have not created the users table yet.
        return
