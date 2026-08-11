from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    MemberFeeCycleViewSet,
    MemberFeePaymentViewSet,
    MemberFeePlanViewSet,
    StaffSalaryPaymentViewSet,
    StaffSalaryPeriodViewSet,
)

app_name = "payments"

router = DefaultRouter()
router.register(r"member-fee-plans", MemberFeePlanViewSet, basename="member-fee-plans")
router.register(r"member-fee-cycles", MemberFeeCycleViewSet, basename="member-fee-cycles")
router.register(r"member-fee-payments", MemberFeePaymentViewSet, basename="member-fee-payments")
router.register(r"staff-salary-periods", StaffSalaryPeriodViewSet, basename="staff-salary-periods")
router.register(r"staff-salary-payments", StaffSalaryPaymentViewSet, basename="staff-salary-payments")

urlpatterns = [
    path("", include(router.urls)),
]
