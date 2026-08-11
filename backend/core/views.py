from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from system_settings.models import GymProfileSettings, NotificationSettings

from .permissions import CanAccessSettings, PermissionMixin


class SettingsViewSet(PermissionMixin, viewsets.ViewSet):
    """Legacy compatibility wrapper around system_settings endpoints."""

    permission_classes = [IsAuthenticated, CanAccessSettings]

    @action(detail=False, methods=["get", "put"], url_path="shop")
    def shop_settings(self, request):
        gym = GymProfileSettings.get_solo()

        if request.method == "GET":
            return Response(
                {
                    "shop_name": gym.gym_name,
                    "phone_number": gym.phone_number,
                    "contact_email": gym.email,
                    "address": gym.address,
                }
            )

        gym.gym_name = request.data.get("shop_name", gym.gym_name or "")
        gym.phone_number = request.data.get("phone_number", gym.phone_number or "")
        gym.email = request.data.get("contact_email", gym.email or "")
        gym.address = request.data.get("address", gym.address or "")
        gym.save(update_fields=["gym_name", "phone_number", "email", "address", "updated_at"])

        return Response(
            {
                "shop_name": gym.gym_name,
                "phone_number": gym.phone_number,
                "contact_email": gym.email,
                "address": gym.address,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get", "put"], url_path="email")
    def email_settings(self, request):
        notification = NotificationSettings.get_solo()

        if request.method == "GET":
            return Response(
                {
                    "smtp_host": notification.smtp_host,
                    "smtp_port": notification.smtp_port,
                    "smtp_username": notification.smtp_username,
                    "smtp_password": None,
                    "from_email": notification.from_email,
                }
            )

        notification.smtp_host = request.data.get("smtp_host", notification.smtp_host or "")
        notification.smtp_port = request.data.get("smtp_port", notification.smtp_port or 587)
        notification.smtp_username = request.data.get("smtp_username", notification.smtp_username or "")
        smtp_password = request.data.get("smtp_password")
        if smtp_password not in [None, ""]:
            notification.smtp_password_encrypted = smtp_password
        notification.from_email = request.data.get("from_email", notification.from_email or "")
        notification.email_enabled = bool(notification.smtp_host and notification.from_email)
        notification.save(
            update_fields=[
                "smtp_host",
                "smtp_port",
                "smtp_username",
                "smtp_password_encrypted",
                "from_email",
                "email_enabled",
                "updated_at",
            ]
        )

        return Response(
            {
                "smtp_host": notification.smtp_host,
                "smtp_port": notification.smtp_port,
                "smtp_username": notification.smtp_username,
                "smtp_password": None,
                "from_email": notification.from_email,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get", "put"], url_path="logo", parser_classes=[MultiPartParser])
    def logo_settings(self, request):
        gym = GymProfileSettings.get_solo()

        if request.method == "GET":
            if gym.gym_logo:
                logo_url = request.build_absolute_uri(gym.gym_logo.url)
            else:
                logo_url = None
            return Response({"logo": logo_url, "shop_name": gym.gym_name}, status=200)

        file = request.FILES.get("logo")
        if not file:
            return Response({"error": "No file uploaded"}, status=400)

        gym.gym_logo = file
        gym.save(update_fields=["gym_logo", "updated_at"])
        logo_url = request.build_absolute_uri(gym.gym_logo.url)
        return Response({"logo": logo_url}, status=200)


class InitializeView(PermissionMixin, APIView):
    def get(self, request):
        return Response(_get_initial_data(request))


def _get_initial_data(request):
    return {"settings": _get_settings(request)}


def _get_settings(request):
    gym = GymProfileSettings.get_solo()
    notification = NotificationSettings.get_solo()

    if gym.gym_logo:
        logo_url = request.build_absolute_uri(gym.gym_logo.url)
    else:
        logo_url = None

    if gym.login_page_image:
        login_page_image_url = request.build_absolute_uri(gym.login_page_image.url)
    else:
        login_page_image_url = None

    return {
        "shop_settings": {
            "shop_name": gym.gym_name,
            "phone_number": gym.phone_number,
            "contact_email": gym.email,
            "address": gym.address,
        },
        "logo_settings": {"logo": logo_url},
        "login_page_image_settings": {"login_page_image": login_page_image_url},
        "email_settings": {
            "smtp_host": notification.smtp_host,
            "smtp_port": notification.smtp_port,
            "smtp_username": notification.smtp_username,
            "smtp_password": None,
            "from_email": notification.from_email,
        },
    }
