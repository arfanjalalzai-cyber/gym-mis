from django.urls import path

from .views import CardLookupAPIView

app_name = 'cards'

urlpatterns = [
    path('lookup/', CardLookupAPIView.as_view(), name='lookup'),
]

