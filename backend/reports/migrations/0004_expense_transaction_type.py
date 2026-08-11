from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("reports", "0003_expensecategory_alter_expense_category"),
    ]

    operations = [
        migrations.AddField(
            model_name="expense",
            name="transaction_type",
            field=models.CharField(
                choices=[
                    ("expense", "Expense"),
                    ("return", "Return"),
                ],
                default="expense",
                max_length=20,
            ),
        ),
    ]
