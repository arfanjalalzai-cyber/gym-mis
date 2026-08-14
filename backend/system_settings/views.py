from __future__ import annotations

import os
import re
import string
from pathlib import Path

from PIL import Image, UnidentifiedImageError

from django.db import transaction
from django.db.models import Q, Value
from django.db.models.functions import Concat
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import ActivityLog, RolePermission, User
from core.models import Permission
from core.pagination import StandardResultsSetPagination

from .models import (
    BackupJob,
    BackupScheduleSettings,
    BillingSettings,
    GymProfileSettings,
    MembershipPlanTemplate,
    NotificationSettings,
    SecuritySettings,
    SystemPreferenceSettings,
)
from .permissions import require_settings_admin, require_settings_permission, require_users_permission
from .serializers import (
    ActivityLogSerializer,
    BackupJobSerializer,
    BackupScheduleSettingsSerializer,
    BillingSettingsSerializer,
    ChangeManagedUserPasswordSerializer,
    GymProfileSettingsSerializer,
    InvoicePreviewSerializer,
    MembershipPlanTemplateSerializer,
    NotificationSettingsSerializer,
    RestoreBackupSerializer,
    RolePermissionsUpdateSerializer,
    SecuritySettingsSerializer,
    SettingsUserCreateSerializer,
    SettingsUserSerializer,
    SystemPreferenceSettingsSerializer,
    get_available_roles_payload,
    get_role_permissions_matrix,
    normalize_role_name,
    role_name_for_storage,
)
from .services import (
    create_manual_sqlite_backup,
    get_system_logs,
    mark_stale_backup_jobs_failed,
    resolve_backup_directory_value,
    restore_sqlite_backup,
)


class GymProfileSettingsAPIView(APIView):
    permission_classes = []

    def get(self, request):
        settings_obj = GymProfileSettings.get_solo()
        serializer = GymProfileSettingsSerializer(settings_obj, context={"request": request})
        return Response(serializer.data)

    def put(self, request):
        if not request.user or not request.user.is_authenticated:
            from rest_framework.exceptions import NotAuthenticated

            raise NotAuthenticated("Authentication required.")
        require_settings_permission(request, "change")
        settings_obj = GymProfileSettings.get_solo()
        serializer = GymProfileSettingsSerializer(
            settings_obj,
            data=request.data,
            partial=False,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class GymImageUploadMixin:
    allowed_image_content_types = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
    svg_content_type = "image/svg+xml"
    max_image_size_mb = 5
    max_image_size_bytes = max_image_size_mb * 1024 * 1024

    def validate_image_file(self, file, label, allow_svg=False):
        if not file:
            return Response({"detail": f"No {label} file uploaded."}, status=status.HTTP_400_BAD_REQUEST)
        allowed_types = set(self.allowed_image_content_types)
        is_svg_filename = file.name.lower().endswith(".svg")
        if allow_svg:
            allowed_types.add(self.svg_content_type)
        is_safe_svg = allow_svg and is_svg_filename and self._is_safe_svg(file)
        is_valid_raster = self._is_valid_raster_image(file)
        if file.content_type not in allowed_types and not is_safe_svg and not is_valid_raster:
            allowed_label = "JPEG, PNG, WEBP" + (", SVG" if allow_svg else "")
            return Response(
                {"detail": f"Invalid image file type. Allowed types: {allowed_label}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if file.size > self.max_image_size_bytes:
            return Response(
                {"detail": f"Image size must be {self.max_image_size_mb}MB or less."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if allow_svg and (file.content_type == self.svg_content_type or is_svg_filename) and not is_safe_svg:
            return Response(
                {"detail": "Invalid SVG logo file."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return None

    @staticmethod
    def _is_valid_raster_image(file):
        """Accept a real image even when a browser supplies a generic MIME type."""
        try:
            image = Image.open(file)
            image.verify()
            return True
        except (UnidentifiedImageError, OSError, ValueError):
            return False
        finally:
            file.seek(0)

    @staticmethod
    def _is_safe_svg(file):
        """Allow normal logo SVGs but reject executable or externally loaded content."""
        try:
            content = file.read().decode("utf-8")
            file.seek(0)
        except (UnicodeDecodeError, OSError):
            return False

        forbidden = r"<\s*(script|foreignObject|iframe|object|embed)\b|\bon\w+\s*=|\b(?:href|xlink:href)\s*=|url\s*\(|<!DOCTYPE|<!ENTITY"
        return bool(re.search(r"<svg\b", content, re.IGNORECASE)) and not re.search(
            forbidden, content, re.IGNORECASE
        )


class GymLogoAPIView(GymImageUploadMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        require_settings_permission(request, "change")
        settings_obj = GymProfileSettings.get_solo()
        file = request.FILES.get("gym_logo") or request.FILES.get("logo")
        validation_error = self.validate_image_file(file, "logo", allow_svg=True)
        if validation_error:
            return validation_error

        settings_obj.gym_logo = file
        settings_obj.save(update_fields=["gym_logo", "updated_at"])
        serializer = GymProfileSettingsSerializer(settings_obj, context={"request": request})
        return Response(serializer.data)

    def delete(self, request):
        require_settings_permission(request, "change")
        settings_obj = GymProfileSettings.get_solo()
        if settings_obj.gym_logo:
            settings_obj.gym_logo.delete(save=False)
        settings_obj.gym_logo = None
        settings_obj.save(update_fields=["gym_logo", "updated_at"])
        serializer = GymProfileSettingsSerializer(settings_obj, context={"request": request})
        return Response(serializer.data)


class LoginPageImageAPIView(GymImageUploadMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        require_settings_permission(request, "change")
        settings_obj = GymProfileSettings.get_solo()
        file = request.FILES.get("login_page_image") or request.FILES.get("image")
        validation_error = self.validate_image_file(file, "login page image")
        if validation_error:
            return validation_error

        settings_obj.login_page_image = file
        settings_obj.save(update_fields=["login_page_image", "updated_at"])
        serializer = GymProfileSettingsSerializer(settings_obj, context={"request": request})
        return Response(serializer.data)

    def delete(self, request):
        require_settings_permission(request, "change")
        settings_obj = GymProfileSettings.get_solo()
        if settings_obj.login_page_image:
            settings_obj.login_page_image.delete(save=False)
        settings_obj.login_page_image = None
        settings_obj.save(update_fields=["login_page_image", "updated_at"])
        serializer = GymProfileSettingsSerializer(settings_obj, context={"request": request})
        return Response(serializer.data)


class SettingsUsersViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = User.objects.all().order_by("-created_at")
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active"]
    search_fields = ["first_name", "last_name", "username", "email", "phone"]
    ordering_fields = ["created_at", "username", "first_name", "last_name"]
    ordering = ["-created_at"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_permissions(self):
        return [permission() for permission in self.permission_classes]

    def get_queryset(self):
        requester = self.request.user
        if requester.role_name == "super_admin":
            queryset = super().get_queryset()
        elif requester.gym_id:
            queryset = User.objects.filter(gym=requester.gym).exclude(
                role_name="super_admin"
            ).order_by("-created_at")
        else:
            queryset = User.objects.none()
        role_param = self.request.query_params.get("role")
        if role_param:
            normalized = normalize_role_name(role_param)
            queryset = queryset.filter(role_name=role_name_for_storage(normalized))
        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return SettingsUserCreateSerializer
        return SettingsUserSerializer

    def list(self, request, *args, **kwargs):
        require_users_permission(request, "view")
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        require_users_permission(request, "view")
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        require_users_permission(request, "add")
        return super().create(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        require_users_permission(request, "change")
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="disable")
    def disable(self, request, pk=None):
        require_users_permission(request, "change")
        user = self.get_object()
        if user.id == request.user.id:
            return Response({"detail": "You cannot disable your own account."}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = False
        user.save(update_fields=["is_active"])
        return Response({"detail": "User disabled successfully."})

    @action(detail=True, methods=["post"], url_path="enable")
    def enable(self, request, pk=None):
        require_users_permission(request, "change")
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=["is_active"])
        return Response({"detail": "User enabled successfully."})

    @action(detail=True, methods=["post"], url_path="change-password")
    def change_password(self, request, pk=None):
        require_users_permission(request, "change")
        user = self.get_object()
        serializer = ChangeManagedUserPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password changed successfully."})


class RolesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_settings_admin(request)
        payload = []
        for role in get_available_roles_payload():
            payload.append(
                {
                    "name": role["name"],
                    "permissions": get_role_permissions_matrix(role["name"]),
                }
            )
        return Response(payload)


class RolePermissionsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, role_name):
        require_settings_admin(request)
        serializer = RolePermissionsUpdateSerializer(
            data={
                "role_name": role_name,
                "permissions": request.data.get("permissions", []),
            }
        )
        serializer.is_valid(raise_exception=True)

        normalized_role = serializer.validated_data["role_name"]
        assignments = serializer.validated_data["permissions"]

        storage_role = role_name_for_storage(normalized_role)
        legacy_roles = {
            "manager": ["receptionist"],
            "staff": ["viewer"],
        }.get(storage_role, [])

        with transaction.atomic():
            RolePermission.objects.filter(role_name__in=[storage_role, *legacy_roles]).delete()
            for assignment in assignments:
                module = assignment["module"]
                for action_name in set(assignment["actions"]):
                    permission = Permission.objects.filter(module=module, action=action_name).first()
                    if permission:
                        RolePermission.objects.get_or_create(
                            role_name=storage_role,
                            permission=permission,
                        )

        return Response(
            {
                "name": normalized_role,
                "permissions": get_role_permissions_matrix(normalized_role),
            }
        )


class ModulesActionsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_settings_admin(request)
        modules = []
        default_actions = ["view", "add", "change", "delete"]

        for module, label in Permission.MODULES:
            actions = list(
                Permission.objects.filter(module=module)
                .values_list("action", flat=True)
                .distinct()
            )
            if not actions:
                actions = default_actions
            modules.append(
                {
                    "module": module,
                    "label": label,
                    "actions": sorted(actions),
                }
            )

        return Response(modules)


class MembershipPlanTemplateViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = MembershipPlanTemplate.objects.order_by("name", "duration_months")
    serializer_class = MembershipPlanTemplateSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["duration_type", "is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "fee", "duration_months", "created_at"]
    ordering = ["name"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def list(self, request, *args, **kwargs):
        require_settings_permission(request, "view")
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        require_settings_permission(request, "view")
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        require_settings_permission(request, "add")
        return super().create(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        require_settings_permission(request, "change")
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        require_settings_permission(request, "change")
        instance = self.get_object()
        instance.is_active = True
        instance.save(update_fields=["is_active", "updated_at"])
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        require_settings_permission(request, "change")
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        return Response(self.get_serializer(instance).data)


class BillingSettingsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_settings_permission(request, "view")
        settings_obj = BillingSettings.get_solo()
        serializer = BillingSettingsSerializer(settings_obj)
        return Response(serializer.data)

    def put(self, request):
        require_settings_permission(request, "change")
        settings_obj = BillingSettings.get_solo()
        serializer = BillingSettingsSerializer(settings_obj, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class InvoiceSequencePreviewAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        require_settings_permission(request, "view")
        serializer = InvoicePreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        settings_obj = BillingSettings.get_solo()
        invoice_prefix = serializer.validated_data.get("invoice_prefix", settings_obj.invoice_prefix)
        invoice_padding = serializer.validated_data.get("invoice_padding", settings_obj.invoice_padding)
        invoice_next_sequence = serializer.validated_data.get(
            "invoice_next_sequence",
            settings_obj.invoice_next_sequence,
        )
        next_seq = str(invoice_next_sequence).zfill(invoice_padding)
        invoice_number = f"{invoice_prefix}-{next_seq}"

        return Response(
            {
                "invoice_number": invoice_number,
                "next_sequence": invoice_next_sequence,
                "currency": settings_obj.default_currency,
            }
        )


class NotificationSettingsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_settings_permission(request, "view")
        settings_obj = NotificationSettings.get_solo()
        serializer = NotificationSettingsSerializer(settings_obj)
        return Response(serializer.data)

    def put(self, request):
        require_settings_permission(request, "change")
        settings_obj = NotificationSettings.get_solo()
        serializer = NotificationSettingsSerializer(settings_obj, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class NotificationTestEmailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        require_settings_permission(request, "change")
        settings_obj = NotificationSettings.get_solo()

        if not settings_obj.email_enabled:
            return Response({"success": False, "detail": "Email notifications are disabled."}, status=400)
        if not settings_obj.smtp_host or not settings_obj.from_email:
            return Response({"success": False, "detail": "Email configuration is incomplete."}, status=400)

        return Response({"success": True, "detail": "Email configuration looks valid."})


class NotificationTestSMSAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        require_settings_permission(request, "change")
        settings_obj = NotificationSettings.get_solo()

        if not settings_obj.sms_enabled:
            return Response({"success": False, "detail": "SMS notifications are disabled."}, status=400)
        if not settings_obj.sms_provider or not settings_obj.sms_api_key_encrypted:
            return Response({"success": False, "detail": "SMS configuration is incomplete."}, status=400)

        return Response({"success": True, "detail": "SMS configuration looks valid."})


class SecuritySettingsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_settings_permission(request, "view")
        settings_obj = SecuritySettings.get_solo()
        serializer = SecuritySettingsSerializer(settings_obj)
        return Response(serializer.data)

    def put(self, request):
        require_settings_permission(request, "change")
        settings_obj = SecuritySettings.get_solo()
        serializer = SecuritySettingsSerializer(settings_obj, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class SecurityActivityLogsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_settings_permission(request, "view")
        queryset = ActivityLog.objects.select_related("user").order_by("-timestamp")

        action_value = request.query_params.get("action")
        user_value = request.query_params.get("user")
        if action_value:
            queryset = queryset.filter(action=action_value)
        if user_value:
            queryset = queryset.annotate(
                user_full_name=Concat("user__first_name", Value(" "), "user__last_name")
            ).filter(
                Q(user__username__icontains=user_value)
                | Q(user__first_name__icontains=user_value)
                | Q(user__last_name__icontains=user_value)
                | Q(user_full_name__icontains=user_value)
            )

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = ActivityLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class SystemPreferenceSettingsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_settings_permission(request, "view")
        settings_obj = SystemPreferenceSettings.get_solo()
        serializer = SystemPreferenceSettingsSerializer(settings_obj)
        return Response(serializer.data)

    def put(self, request):
        require_settings_permission(request, "change")
        settings_obj = SystemPreferenceSettings.get_solo()
        serializer = SystemPreferenceSettingsSerializer(settings_obj, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class BackupManualAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        require_settings_permission(request, "change")
        require_settings_admin(request)
        try:
            backup_job = create_manual_sqlite_backup(triggered_by=request.user)
            return Response(BackupJobSerializer(backup_job).data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class BackupJobsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_settings_permission(request, "view")
        mark_stale_backup_jobs_failed()
        queryset = BackupJob.objects.all().order_by("-created_at")
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = BackupJobSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class BackupRestoreAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, job_id):
        require_settings_permission(request, "change")
        require_settings_admin(request)
        serializer = RestoreBackupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        source_job = BackupJob.objects.filter(pk=job_id).first()
        if not source_job:
            return Response({"detail": "Backup job not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            restored_job = restore_sqlite_backup(backup_job=source_job, triggered_by=request.user)
            return Response(BackupJobSerializer(restored_job).data, status=status.HTTP_201_CREATED)
        except FileNotFoundError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class BackupScheduleAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_settings_permission(request, "view")
        settings_obj = BackupScheduleSettings.get_solo()
        serializer = BackupScheduleSettingsSerializer(settings_obj)
        return Response(serializer.data)

    def put(self, request):
        require_settings_permission(request, "change")
        settings_obj = BackupScheduleSettings.get_solo()
        serializer = BackupScheduleSettingsSerializer(settings_obj, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class BackupDirectoryBrowseAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_settings_permission(request, "view")
        raw_path = request.query_params.get("path")

        if raw_path:
            current_path = resolve_backup_directory_value(raw_path)
        else:
            current_path = Path.home()

        current_path = current_path.expanduser().resolve()
        if not current_path.exists() or not current_path.is_dir():
            return Response({"detail": "Directory not found."}, status=status.HTTP_404_NOT_FOUND)

        directories = []
        try:
            for child in current_path.iterdir():
                if child.is_dir():
                    directories.append(
                        {
                            "name": child.name,
                            "path": str(child.resolve()),
                        }
                    )
        except OSError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        drives = []
        if os.name == "nt":
            for letter in string.ascii_uppercase:
                drive = Path(f"{letter}:\\")
                if drive.exists():
                    drives.append({"name": f"{letter}:\\", "path": str(drive)})
        else:
            drives.append({"name": "/", "path": "/"})

        desktop_path = Path.home() / "Desktop"
        quick_locations = [
            {"name": "Home", "path": str(Path.home())},
        ]
        if desktop_path.exists():
            quick_locations.append({"name": "Desktop", "path": str(desktop_path.resolve())})

        return Response(
            {
                "path": str(current_path),
                "parent": str(current_path.parent) if current_path.parent != current_path else None,
                "directories": sorted(directories, key=lambda item: item["name"].lower()),
                "drives": drives,
                "quick_locations": quick_locations,
            }
        )


class SystemLogsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_settings_permission(request, "view")
        limit = int(request.query_params.get("limit", 200))
        limit = max(1, min(limit, 1000))
        logs = get_system_logs(limit=limit)
        serializer = ActivityLogSerializer(logs, many=True)
        return Response({"count": len(serializer.data), "results": serializer.data, "generated_at": timezone.now()})
