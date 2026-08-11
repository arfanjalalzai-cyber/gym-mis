"""
URL configuration for foundation project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path,include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/core/', include('core.urls')),
    path('api/accounts/', include('accounts.urls')),
    path('api/members/', include('members.urls')),
    path('api/staff/', include('staff.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/schedule/', include('schedule.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/billing/', include('billing.urls')),
    path('api/attendance/', include('attendance.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/cards/', include('cards.urls')),
    path('api/settings/', include('system_settings.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
