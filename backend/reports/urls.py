from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ActiveMembersReportAPIView,
    AnalyticsOverviewReportAPIView,
    DashboardActivityAPIView,
    DashboardAlertsAPIView,
    DashboardOverviewAPIView,
    ExpenseCategoryViewSet,
    ExpenseViewSet,
    MonthlyIncomeReportAPIView,
    PaymentHistoryReportAPIView,
    ReportsSummaryAPIView,
    UnpaidMembersReportAPIView,
)

app_name = "reports"

router = DefaultRouter()
router.register(r"expenses", ExpenseViewSet, basename="expenses")
router.register(r"expense-categories", ExpenseCategoryViewSet, basename="expense-categories")

urlpatterns = [
    path("", include(router.urls)),
    path("members/active/", ActiveMembersReportAPIView.as_view(), name="active-members-report"),
    path("members/unpaid/", UnpaidMembersReportAPIView.as_view(), name="unpaid-members-report"),
    path("payments/history/", PaymentHistoryReportAPIView.as_view(), name="payment-history-report"),
    path("income/monthly/", MonthlyIncomeReportAPIView.as_view(), name="monthly-income-report"),
    path("analytics/overview/", AnalyticsOverviewReportAPIView.as_view(), name="analytics-overview-report"),
    path("dashboard/overview/", DashboardOverviewAPIView.as_view(), name="dashboard-overview"),
    path("dashboard/activity/", DashboardActivityAPIView.as_view(), name="dashboard-activity"),
    path("dashboard/alerts/", DashboardAlertsAPIView.as_view(), name="dashboard-alerts"),
    path("summary/", ReportsSummaryAPIView.as_view(), name="reports-summary"),
]
