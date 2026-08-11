from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AttendanceMonthlyReportAPIView, AttendancePolicyAPIView, AttendanceRecordViewSet

app_name = "attendance"

router = DefaultRouter()
router.register(r"records", AttendanceRecordViewSet, basename="attendance-records")

urlpatterns = [
    path("", include(router.urls)),
    path("reports/monthly/", AttendanceMonthlyReportAPIView.as_view(), name="attendance-monthly-report"),
    path("policy/", AttendancePolicyAPIView.as_view(), name="attendance-policy"),
]

