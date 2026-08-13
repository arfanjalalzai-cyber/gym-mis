from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from core.models import Permission
from core.base_models import BaseModel
from .managers import UserManager
from django.contrib.auth.models import UserManager as BaseUserManager

ROLE_CHOICES = [
    ("super_admin", "Super Administrator"),
    ("admin", "Administrator" ),
    ("manager", "Manager"),
    ("staff", "Staff"),
    # Temporary compatibility aliases during role migration window.
    ("receptionist", "Receptionist" ),
    ("viewer", "Viewer" ),
]


class Gym(models.Model):
    """A customer gym (tenant) that owns its users and operational data."""

    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=80, unique=True)
    is_active = models.BooleanField(default=True)
    contact_name = models.CharField(max_length=150, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "gyms"
        ordering = ["name"]

    def __str__(self):
        return self.name


class User(AbstractUser, BaseModel):
    """Extended user model"""
    phone = models.CharField(max_length=20, blank=True, null=True)
    gym = models.ForeignKey(
        Gym,
        on_delete=models.PROTECT,
        related_name="users",
        null=True,
        blank=True,
    )
    profile_picture = models.ImageField(
        upload_to="users/profile_pictures/",
        blank=True,
        null=True,
    )


    role_name = models.CharField(
        max_length=50,
        choices=ROLE_CHOICES,
    )
    theme = models.CharField(
        max_length=20,
        default='light',
        choices=[
            ('light', 'Light'),
            ('dark', 'Dark'),
            ('system', 'System Default')
        ]
    )

    # Authentication enhancement fields
    email_verified = models.BooleanField(default=False, help_text="Whether email is verified")
    email_verification_token = models.CharField(max_length=255, null=True, blank=True)
    email_verification_sent_at = models.DateTimeField(null=True, blank=True)
    password_reset_code = models.CharField(max_length=6, null=True, blank=True, help_text="6-digit verification code")
    password_reset_sent_at = models.DateTimeField(null=True, blank=True)
    password_reset_attempts = models.IntegerField(default=0, help_text="Number of failed code verification attempts")
    failed_login_attempts = models.IntegerField(default=0)
    account_locked_until = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    last_login_user_agent = models.TextField(null=True, blank=True)

    objects = UserManager()
    all_objects = BaseUserManager()
    

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.username} ({self.get_full_name()})"

    def save(self, *args, **kwargs):
        # Preserve a smooth upgrade path for the former single-gym installation.
        # API-created users always receive their gym explicitly.
        if not self.gym_id and self.role_name != "super_admin":
            gyms = Gym.objects.filter(is_active=True)
            if gyms.count() == 1:
                self.gym = gyms.first()
        super().save(*args, **kwargs)

    @property
    def is_deleted(self):
        return self.deleted_at is not None

    def soft_delete(self):
        """Soft delete the user"""
        self.deleted_at = timezone.now()
        self.is_active = False
        self.save()

    def restore(self):
        """Restore soft deleted user"""
        self.deleted_at = None
        self.is_active = True
        self.save()


class UserPermission(models.Model):
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name="users_permissions")
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)
    allow = models.BooleanField(default=True)
    class Meta:
        db_table = 'user_permissions'
        unique_together = ['user', 'permission']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['permission']),
        ]

    
class RolePermission(models.Model):
    """Role-based permissions"""
    
    role_name = models.CharField(max_length=50, choices=ROLE_CHOICES)
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)

    class Meta:
        db_table = 'role_permissions'
        unique_together = ['role_name', 'permission']
        indexes = [
            models.Index(fields=['role_name']),
            models.Index(fields=['permission']),
        ]

    def __str__(self):
        return f"{self.get_role_name_display()} - {self.permission.module}"


class ActivityLog(BaseModel):
    ACTIONS = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('view', 'View'),
        ('login', 'Login'),
        ('logout', 'Logout'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_logs')
    action = models.CharField(max_length=20, choices=ACTIONS)
    table_name = models.CharField(max_length=100, blank=True)
    record_id = models.PositiveIntegerField(null=True, blank=True)
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    session_id = models.CharField(max_length=40, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'activity_logs'
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['table_name', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.action} - {self.timestamp}"
    
    
