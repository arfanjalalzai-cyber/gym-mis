from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ScheduleClassViewSet, ScheduleSlotViewSet

app_name = "schedule"

router = DefaultRouter()
router.register(r"classes", ScheduleClassViewSet, basename="classes")
router.register(r"slots", ScheduleSlotViewSet, basename="slots")

urlpatterns = [
    path("", include(router.urls)),
]
