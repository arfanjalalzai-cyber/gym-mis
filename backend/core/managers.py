from django.db import models
from django.contrib.auth.models import UserManager


_tenant_context = {}


def set_current_tenant(*, gym=None, is_super_admin=False):
    _tenant_context["gym"] = gym
    _tenant_context["is_super_admin"] = is_super_admin


def clear_current_tenant():
    _tenant_context.clear()


def get_current_gym():
    return _tenant_context.get("gym")


class SoftDeleteManager(models.Manager):
    """Manager that excludes soft-deleted objects by default"""
    def get_queryset(self):
        queryset = super().get_queryset()
        if hasattr(self.model, "gym_id") and not _tenant_context.get("is_super_admin"):
            gym = get_current_gym()
            if gym is not None:
                queryset = queryset.filter(gym=gym)
        if hasattr(self.model, 'deleted_at'):
            return queryset.filter(deleted_at__isnull=True)
        return queryset


class TenantAllObjectsManager(models.Manager):
    """Includes soft-deleted records but never crosses an active gym context."""

    def get_queryset(self):
        queryset = super().get_queryset()
        if hasattr(self.model, "gym_id") and not _tenant_context.get("is_super_admin"):
            gym = get_current_gym()
            if gym is not None:
                queryset = queryset.filter(gym=gym)
        return queryset
