from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.text import slugify

from core.base_models import BaseModel


class ExpenseCategory(BaseModel):
    DEFAULT_CATEGORIES = [
        ("rent", "Rent"),
        ("utilities", "Utilities"),
        ("salary", "Salary"),
        ("equipment", "Equipment"),
        ("maintenance", "Maintenance"),
        ("marketing", "Marketing"),
        ("other", "Other"),
    ]

    name = models.CharField(max_length=100, unique=True)
    slug = models.CharField(max_length=60, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "reports_expense_categories"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["slug"], name="rep_exp_cat_slug_idx"),
            models.Index(fields=["is_active"], name="rep_exp_cat_active_idx"),
        ]

    def __str__(self) -> str:
        return self.name

    def clean(self):
        if not self.name or not self.name.strip():
            raise ValidationError({"name": "Category name is required."})
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True)[:60]
        if not self.slug:
            raise ValidationError({"name": "Category name must contain letters or numbers."})

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True)[:60]
        self.full_clean()
        super().save(*args, **kwargs)


class Expense(BaseModel):
    TRANSACTION_EXPENSE = "expense"
    TRANSACTION_RETURN = "return"
    TRANSACTION_TYPE_CHOICES = [
        (TRANSACTION_EXPENSE, "Expense"),
        (TRANSACTION_RETURN, "Return"),
    ]

    expense_name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    expense_date = models.DateField()
    category = models.CharField(max_length=60, default="other")
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPE_CHOICES,
        default=TRANSACTION_EXPENSE,
    )
    note = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses_created",
    )

    class Meta:
        db_table = "reports_expenses"
        ordering = ["-expense_date", "-id"]
        indexes = [
            models.Index(fields=["expense_date"], name="rep_exp_date_idx"),
            models.Index(fields=["category"], name="rep_exp_cat_idx"),
            models.Index(fields=["created_at"], name="rep_exp_created_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.expense_name} ({self.amount})"

    def clean(self):
        if self.amount is None or self.amount <= 0:
            raise ValidationError({"amount": "Amount must be greater than 0."})
        if self.category and not ExpenseCategory.objects.filter(
            slug=self.category,
            is_active=True,
        ).exists():
            raise ValidationError({"category": "Select a valid expense category."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
