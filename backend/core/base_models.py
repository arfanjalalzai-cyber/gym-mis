
from django.db import models
from .managers import SoftDeleteManager, TenantAllObjectsManager, get_current_gym
from django.utils import timezone


class BaseModel(models.Model):
    """Base model with common fields"""
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    gym = models.ForeignKey(
        "accounts.Gym",
        on_delete=models.PROTECT,
        related_name="%(app_label)s_%(class)s_records",
        null=True,
        blank=True,
        db_index=True,
    )
    
    objects = SoftDeleteManager()
    all_objects = TenantAllObjectsManager()  # Manager that includes soft-deleted objects
    
    class Meta:
        abstract = True
    
    def soft_delete(self):
        """Soft delete the object"""
        self.deleted_at = timezone.now()
        self.save()

    def save(self, *args, **kwargs):
        if not self.gym_id:
            gym = get_current_gym()
            if gym is None:
                from accounts.models import Gym

                active_gyms = Gym.objects.filter(is_active=True)
                if active_gyms.count() == 1:
                    gym = active_gyms.first()
            if gym is not None:
                self.gym = gym
        super().save(*args, **kwargs)
    
    def restore(self):
        """Restore soft-deleted object"""
        self.deleted_at = None
        self.save()
