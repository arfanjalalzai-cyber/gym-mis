from django.db import migrations, models


DEFAULT_CATEGORIES = [
    ("rent", "Rent"),
    ("utilities", "Utilities"),
    ("salary", "Salary"),
    ("equipment", "Equipment"),
    ("maintenance", "Maintenance"),
    ("marketing", "Marketing"),
    ("other", "Other"),
]


def seed_expense_categories(apps, schema_editor):
    Expense = apps.get_model("reports", "Expense")
    ExpenseCategory = apps.get_model("reports", "ExpenseCategory")

    for slug, name in DEFAULT_CATEGORIES:
        ExpenseCategory.objects.get_or_create(
            slug=slug,
            defaults={"name": name, "is_active": True},
        )

    existing_categories = (
        Expense.objects.exclude(category__isnull=True)
        .exclude(category="")
        .values_list("category", flat=True)
        .distinct()
    )
    default_slugs = {slug for slug, _ in DEFAULT_CATEGORIES}
    for slug in existing_categories:
        if slug in default_slugs:
            continue
        ExpenseCategory.objects.get_or_create(
            slug=slug,
            defaults={
                "name": str(slug).replace("_", " ").title(),
                "is_active": True,
            },
        )


def unseed_expense_categories(apps, schema_editor):
    ExpenseCategory = apps.get_model("reports", "ExpenseCategory")
    ExpenseCategory.objects.filter(slug__in=[slug for slug, _ in DEFAULT_CATEGORIES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("reports", "0002_seed_reports_permissions"),
    ]

    operations = [
        migrations.CreateModel(
            name="ExpenseCategory",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True, db_index=True)),
                ("deleted_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("name", models.CharField(max_length=100, unique=True)),
                ("slug", models.CharField(max_length=60, unique=True)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={
                "db_table": "reports_expense_categories",
                "ordering": ["name"],
            },
        ),
        migrations.AlterField(
            model_name="expense",
            name="category",
            field=models.CharField(default="other", max_length=60),
        ),
        migrations.AddIndex(
            model_name="expensecategory",
            index=models.Index(fields=["slug"], name="rep_exp_cat_slug_idx"),
        ),
        migrations.AddIndex(
            model_name="expensecategory",
            index=models.Index(fields=["is_active"], name="rep_exp_cat_active_idx"),
        ),
        migrations.RunPython(seed_expense_categories, unseed_expense_categories),
    ]
