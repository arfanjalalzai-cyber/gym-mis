from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EquipmentViewSet

app_name = "inventory"

router = DefaultRouter()
router.register(r"equipment", EquipmentViewSet, basename="equipment")

urlpatterns = [
    path("", include(router.urls)),
]
