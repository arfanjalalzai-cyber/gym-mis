"""Create the deployment superuser once, using environment variables."""

import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


class Command(BaseCommand):
    help = "Create or repair the default superuser from DJANGO_SUPERUSER_* variables."

    def add_arguments(self, parser):
        parser.add_argument(
            "--update-password",
            action="store_true",
            help="Update the password when the configured user already exists.",
        )

    def handle(self, *args, **options):
        username = os.getenv("DJANGO_SUPERUSER_USERNAME")
        password = os.getenv("DJANGO_SUPERUSER_PASSWORD")
        email = os.getenv("DJANGO_SUPERUSER_EMAIL", "")

        if not username or not password:
            raise CommandError(
                "DJANGO_SUPERUSER_USERNAME and DJANGO_SUPERUSER_PASSWORD must be set."
            )

        User = get_user_model()
        username_field = User.USERNAME_FIELD
        lookup = {username_field: username}
        update_password = options["update_password"] or (
            os.getenv("DEFAULT_SUPERUSER_UPDATE_PASSWORD", "false").lower() == "true"
        )

        with transaction.atomic():
            user = User._base_manager.filter(**lookup).first()
            if user is None:
                user = User.objects.create_superuser(
                    username=username,
                    email=email,
                    password=password,
                )
                self.stdout.write(self.style.SUCCESS(f"Created superuser '{username}'."))
                return

            changed_fields = []
            for field, value in {
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
                "role_name": "admin",
                "email_verified": True,
            }.items():
                if any(model_field.name == field for model_field in User._meta.fields):
                    if getattr(user, field) != value:
                        setattr(user, field, value)
                        changed_fields.append(field)

            if email and user.email != email:
                user.email = email
                changed_fields.append("email")
            if update_password:
                user.set_password(password)
                changed_fields.append("password")
            if changed_fields:
                user.save(update_fields=changed_fields)

        self.stdout.write(
            self.style.SUCCESS(f"Superuser '{username}' already exists and is ready.")
        )
