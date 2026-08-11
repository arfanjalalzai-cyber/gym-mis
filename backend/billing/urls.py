from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BillViewSet

app_name = "billing"

router = DefaultRouter()
router.register(r"bills", BillViewSet, basename="bills")

urlpatterns = [
    path("", include(router.urls)),
]

