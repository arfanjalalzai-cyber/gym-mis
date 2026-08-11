from __future__ import annotations

from django.core.exceptions import ValidationError

from accounts.utils import validate_password_against_security_policy


class SecurityPolicyPasswordValidator:
    """Runtime password policy validator sourced from SecuritySettings singleton."""

    def validate(self, password: str, user=None) -> None:
        validate_password_against_security_policy(password)

    def get_help_text(self) -> str:
        return "Password must satisfy the configured security policy."
