from __future__ import annotations

from dataclasses import dataclass

from django.core.exceptions import ValidationError


@dataclass(frozen=True)
class SecurityPolicy:
    min_password_length: int = 8
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_number: bool = True
    require_special: bool = False
    login_attempt_limit: int = 5
    lockout_minutes: int = 30


def get_security_policy() -> SecurityPolicy:
    try:
        from system_settings.models import SecuritySettings

        settings_obj = SecuritySettings.get_solo()
        return SecurityPolicy(
            min_password_length=settings_obj.min_password_length,
            require_uppercase=settings_obj.require_uppercase,
            require_lowercase=settings_obj.require_lowercase,
            require_number=settings_obj.require_number,
            require_special=settings_obj.require_special,
            login_attempt_limit=settings_obj.login_attempt_limit,
            lockout_minutes=settings_obj.lockout_minutes,
        )
    except Exception:
        return SecurityPolicy()


def validate_password_against_security_policy(password: str) -> None:
    policy = get_security_policy()
    errors: list[str] = []

    if len(password) < policy.min_password_length:
        errors.append(f"Password must be at least {policy.min_password_length} characters long.")
    if policy.require_uppercase and not any(ch.isupper() for ch in password):
        errors.append("Password must contain at least one uppercase letter.")
    if policy.require_lowercase and not any(ch.islower() for ch in password):
        errors.append("Password must contain at least one lowercase letter.")
    if policy.require_number and not any(ch.isdigit() for ch in password):
        errors.append("Password must contain at least one number.")
    if policy.require_special and not any(not ch.isalnum() for ch in password):
        errors.append("Password must contain at least one special character.")

    if errors:
        raise ValidationError(errors)
