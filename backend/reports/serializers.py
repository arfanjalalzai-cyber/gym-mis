from datetime import date, timedelta
from decimal import Decimal

from rest_framework import serializers
from django.utils.text import slugify

from members.models import Member
from payments.models import MemberFeePayment

from .models import Expense, ExpenseCategory


class RecentExpenseQuerySerializer(serializers.Serializer):
    limit = serializers.IntegerField(required=False, default=10, min_value=1, max_value=100)


class MonthsQuerySerializer(serializers.Serializer):
    months = serializers.IntegerField(required=False, default=12)

    def validate_months(self, value: int):
        if value not in {6, 12, 24}:
            raise serializers.ValidationError("months must be one of 6, 12 or 24.")
        return value


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = ["id", "name", "slug", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "slug", "is_active", "created_at", "updated_at"]

    def validate_name(self, value: str):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Category name is required.")
        slug = slugify(name, allow_unicode=True)[:60]
        if not slug:
            raise serializers.ValidationError("Category name must contain letters or numbers.")
        if ExpenseCategory.objects.filter(slug=slug).exists():
            raise serializers.ValidationError("This category already exists.")
        return name


class ExpenseSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = Expense
        fields = [
            "id",
            "expense_name",
            "amount",
            "expense_date",
            "category",
            "transaction_type",
            "note",
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
        ]

    def validate_amount(self, value: Decimal):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0.")
        return value

    def validate_category(self, value: str):
        if not ExpenseCategory.objects.filter(slug=value, is_active=True).exists():
            raise serializers.ValidationError("Select a valid expense category.")
        return value


class ExpenseRecentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = [
            "id",
            "expense_name",
            "amount",
            "expense_date",
            "category",
            "transaction_type",
            "note",
        ]
        read_only_fields = fields


class ActiveMemberReportSerializer(serializers.ModelSerializer):
    member_id = serializers.IntegerField(source="id", read_only=True)
    member_name = serializers.SerializerMethodField()
    membership_plan = serializers.SerializerMethodField()
    membership_expiry_date = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = [
            "member_id",
            "member_code",
            "member_name",
            "membership_plan",
            "membership_expiry_date",
        ]
        read_only_fields = fields

    def get_member_name(self, obj: Member):
        return f"{obj.first_name} {obj.last_name}".strip()

    def get_membership_plan(self, obj: Member):
        plan = getattr(obj, "fee_plan", None)
        if not plan:
            return "No Plan"
        return f"{plan.get_billing_cycle_display()} Membership"

    def get_membership_expiry_date(self, obj: Member):
        latest_paid_cycle_month = getattr(obj, "latest_paid_cycle_month", None)
        if latest_paid_cycle_month is None:
            return None

        if hasattr(latest_paid_cycle_month, "date"):
            latest_paid_cycle_month = latest_paid_cycle_month.date()

        if not isinstance(latest_paid_cycle_month, date):
            return None

        month_start = latest_paid_cycle_month.replace(day=1)
        next_month_start = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
        return next_month_start - timedelta(days=1)


class UnpaidMemberReportSerializer(serializers.ModelSerializer):
    member_id = serializers.IntegerField(source="id", read_only=True)
    member_name = serializers.SerializerMethodField()
    remaining_balance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    outstanding_cycles_count = serializers.IntegerField(read_only=True)
    oldest_unpaid_cycle_month = serializers.DateField(read_only=True)

    class Meta:
        model = Member
        fields = [
            "member_id",
            "member_code",
            "member_name",
            "remaining_balance",
            "outstanding_cycles_count",
            "oldest_unpaid_cycle_month",
        ]
        read_only_fields = fields

    def get_member_name(self, obj: Member):
        return f"{obj.first_name} {obj.last_name}".strip()


class PaymentHistoryReportSerializer(serializers.ModelSerializer):
    payment_id = serializers.IntegerField(source="id", read_only=True)
    member_id = serializers.IntegerField(source="member.id", read_only=True)
    member_name = serializers.SerializerMethodField()
    amount = serializers.DecimalField(source="amount_paid", max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = MemberFeePayment
        fields = [
            "payment_id",
            "member_id",
            "member_name",
            "amount",
            "paid_at",
            "payment_method",
            "is_reversal",
        ]
        read_only_fields = fields

    def get_member_name(self, obj: MemberFeePayment):
        return f"{obj.member.first_name} {obj.member.last_name}".strip()


class DashboardActivityQuerySerializer(serializers.Serializer):
    limit = serializers.IntegerField(required=False, default=5, min_value=1, max_value=20)


class DashboardAlertsQuerySerializer(serializers.Serializer):
    limit = serializers.IntegerField(required=False, default=5, min_value=1, max_value=50)


class DashboardKeyStatisticsSerializer(serializers.Serializer):
    total_members = serializers.IntegerField()
    active_members = serializers.IntegerField()
    inactive_members = serializers.IntegerField()
    unpaid_members = serializers.IntegerField()
    expired_members = serializers.IntegerField()
    total_staff = serializers.IntegerField()
    monthly_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    monthly_expense = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_monthly_profit = serializers.DecimalField(max_digits=12, decimal_places=2)
    today_attendance = serializers.IntegerField()


class DashboardPendingPaymentsSerializer(serializers.Serializer):
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    member_count = serializers.IntegerField()


class DashboardFinancialOverviewSerializer(serializers.Serializer):
    today_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    monthly_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    pending_payments = DashboardPendingPaymentsSerializer()


class DashboardMemberGrowthPointSerializer(serializers.Serializer):
    month = serializers.CharField()
    new_members = serializers.IntegerField()
    cumulative_members = serializers.IntegerField()


class DashboardMonthlyIncomePointSerializer(serializers.Serializer):
    month = serializers.CharField()
    value = serializers.DecimalField(max_digits=12, decimal_places=2)


class DashboardExpenseVsIncomePointSerializer(serializers.Serializer):
    month = serializers.CharField()
    income = serializers.DecimalField(max_digits=12, decimal_places=2)
    expense = serializers.DecimalField(max_digits=12, decimal_places=2)


class DashboardChartsSerializer(serializers.Serializer):
    member_growth = DashboardMemberGrowthPointSerializer(many=True)
    monthly_income = DashboardMonthlyIncomePointSerializer(many=True)
    expense_vs_income = DashboardExpenseVsIncomePointSerializer(many=True)


class DashboardOverviewSerializer(serializers.Serializer):
    generated_at = serializers.DateTimeField()
    currency = serializers.CharField()
    key_statistics = DashboardKeyStatisticsSerializer()
    financial_overview = DashboardFinancialOverviewSerializer()
    charts = DashboardChartsSerializer()


class DashboardRecentMemberRegistrationSerializer(serializers.Serializer):
    member_id = serializers.IntegerField()
    member_code = serializers.CharField()
    member_name = serializers.CharField()
    join_date = serializers.DateField()
    created_at = serializers.DateTimeField()


class DashboardRecentPaymentSerializer(serializers.Serializer):
    payment_id = serializers.IntegerField()
    member_id = serializers.IntegerField()
    member_name = serializers.CharField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payment_method = serializers.CharField()
    is_reversal = serializers.BooleanField()
    paid_at = serializers.DateTimeField()


class DashboardRecentStaffAttendanceSerializer(serializers.Serializer):
    record_id = serializers.IntegerField()
    staff_id = serializers.IntegerField()
    staff_code = serializers.CharField()
    staff_name = serializers.CharField()
    attendance_date = serializers.DateField()
    status = serializers.CharField()
    marked_by_username = serializers.CharField(allow_null=True)
    updated_at = serializers.DateTimeField()


class DashboardActivitySerializer(serializers.Serializer):
    recent_member_registrations = DashboardRecentMemberRegistrationSerializer(many=True)
    recent_payments = DashboardRecentPaymentSerializer(many=True)
    recent_staff_attendance = DashboardRecentStaffAttendanceSerializer(many=True)


class DashboardExpiredMembershipAlertSerializer(serializers.Serializer):
    member_id = serializers.IntegerField()
    member_code = serializers.CharField()
    member_name = serializers.CharField()
    membership_expiry_date = serializers.DateField(allow_null=True)
    days_overdue = serializers.IntegerField(allow_null=True)


class DashboardPaymentDueAlertSerializer(serializers.Serializer):
    member_id = serializers.IntegerField()
    member_code = serializers.CharField()
    member_name = serializers.CharField()
    remaining_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    oldest_unpaid_cycle_month = serializers.DateField(allow_null=True)
    outstanding_cycles_count = serializers.IntegerField()


class DashboardAlertsTotalsSerializer(serializers.Serializer):
    expired_memberships = serializers.IntegerField()
    payment_due_members = serializers.IntegerField()


class DashboardAlertsSerializer(serializers.Serializer):
    expired_membership_alerts = DashboardExpiredMembershipAlertSerializer(many=True)
    payment_due_alerts = DashboardPaymentDueAlertSerializer(many=True)
    totals = DashboardAlertsTotalsSerializer()
