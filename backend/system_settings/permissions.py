from __future__ import annotations

from rest_framework.exceptions import PermissionDenied

from core.permissions import _user_has_permission

from .serializers import normalize_role_name


def can_access_settings(user, action: str = "view") -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True

    normalized_role = normalize_role_name(getattr(user, "role_name", ""))

    if normalized_role == "admin":
        return True

    return _user_has_permission(user, "settings", action)


def require_settings_permission(request, action: str = "view"):
    if not can_access_settings(request.user, action):
        raise PermissionDenied("You do not have permission to access settings.")


def can_manage_users(user, action: str = "view") -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return _user_has_permission(user, "users", action)


def require_users_permission(request, action: str = "view"):
    if not can_manage_users(request.user, action):
        raise PermissionDenied("You do not have permission to manage users.")


def require_settings_admin(request):
    user = getattr(request, "user", None)
    if not user or not user.is_authenticated:
        raise PermissionDenied("Authentication required.")
    if user.is_superuser:
        return
    normalized_role = normalize_role_name(getattr(user, "role_name", ""))
    if normalized_role != "admin":
        raise PermissionDenied("Only admins can run backup and restore operations.")
