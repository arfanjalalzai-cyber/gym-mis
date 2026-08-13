from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import BasePermission, IsAuthenticated
from django.conf import settings
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import update_session_auth_hash
from core.models import Permission
from django.db.models import Count
from core.permissions import PermissionMixin
from .models import ActivityLog, Gym, User, UserPermission
from .serializers import (
    ActivityLogSerializer, UserListSerializer, UserProfileSerializer,
    ChangePasswordSerializer, LoginSerializer,
    CreateUserSerializer, ForgotPasswordSerializer,
    VerifyResetCodeSerializer, ResetPasswordSerializer, VerifyEmailSerializer,
    ResendVerificationSerializer, SignUpSerializer, GymSerializer
)
from .utils import get_security_policy

from django_filters.rest_framework import DjangoFilterBackend, FilterSet, CharFilter, DateFilter


class IsAdminAccountCreator(BasePermission):
    """Allow account creation only for authenticated admins."""

    message = "Admin permission is required to create a new account."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or user.role_name in {"super_admin", "admin"})
            and (user.is_superuser or user.role_name == "super_admin" or user.gym_id)
        )


def _set_refresh_cookie(response, refresh_token: str):
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=getattr(settings, "JWT_COOKIE_SECURE", False),
        samesite=getattr(settings, "JWT_COOKIE_SAMESITE", "Lax"),
        max_age=7 * 24 * 60 * 60,
    )


class UserViewSet(PermissionMixin, viewsets.ModelViewSet):
    """ViewSet for User management"""
    serializer_class = UserProfileSerializer
    permission_module = 'users'
    parser_classes = [MultiPartParser, FormParser, JSONParser] 

    def get_permissions(self):
        if self.action == "create":
            return [IsAdminAccountCreator()]
        return super().get_permissions()
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.role_name == "super_admin":
            return User.objects.all()
        if user.role_name == "admin":
            return User.objects.filter(gym=user.gym)
        return User.objects.filter(id=user.id)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateUserSerializer
        elif self.action == "list":
            return UserListSerializer
        return UserProfileSerializer
        
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate user"""
        user = self.get_object()
        user.is_active = False
        user.save()
        return Response({'message': 'User deactivated successfully'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def activate(self, request, pk=None):
        """Activate user"""
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({'message': 'User activated successfully'})

    @action(detail=False, methods=['get', 'patch'], permission_module=None)
    def me(self, request):
        if request.method.lower() == "get":
            """Get current user profile"""
            serializer = self.get_serializer(request.user, context={'request': request})
            return Response(serializer.data)

        """Update current user profile"""
        serializer = self.get_serializer(
            request.user, 
            data=request.data, 
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=True,
        methods=["post"],
        url_path="upload-photo",
        parser_classes=[MultiPartParser, FormParser],
        permission_classes=[IsAuthenticated],
    )
    def upload_photo(self, request, pk=None):
        user: User = self.get_object()
        if request.user.id != user.id and request.user.role_name != "admin":
            return Response(
                {"error": "You can only upload your own photo."},
                status=status.HTTP_403_FORBIDDEN,
            )

        photo = request.FILES.get("photo") or request.FILES.get("profile_picture")
        if not photo:
            return Response(
                {"error": "No photo uploaded."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.profile_picture:
            user.profile_picture.delete(save=False)

        user.profile_picture = photo
        user.save(update_fields=["profile_picture", "updated_at"])

        serializer = self.get_serializer(user, context={"request": request})
        return Response({"avatar_url": serializer.data.get("profile_picture_url")})

    @action(
        detail=True,
        methods=["delete"],
        url_path="delete-photo",
        permission_classes=[IsAuthenticated],
    )
    def delete_photo(self, request, pk=None):
        user: User = self.get_object()
        if request.user.id != user.id and request.user.role_name != "admin":
            return Response(
                {"error": "You can only delete your own photo."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if user.profile_picture:
            user.profile_picture.delete(save=False)
            user.profile_picture = None
            user.save(update_fields=["profile_picture", "updated_at"])

        return Response({"avatar_url": None})

    @action(detail=True, methods=['put'])
    def permissions(self, request, pk=None):
        if not (request.user.is_superuser or request.user.role_name in {"super_admin", "admin"}):
            return Response({"detail": "Admin permission is required."}, status=status.HTTP_403_FORBIDDEN)
        user: User = self.get_object()
        selected_modules = set(request.data.get("permissions", []))

        if not selected_modules:
            return Response({"details": "Permissions Not Provided!"}, status=status.HTTP_400_BAD_REQUEST)

        # Clear all previous permissions (start clean)
        UserPermission.objects.filter(user=user).delete()

        # Apply permission per module (override role)
        for module, _ in Permission.MODULES:
            permissions = Permission.objects.filter(module=module)
            allow = module in selected_modules

            for p in permissions:
                UserPermission.objects.create(user=user, permission=p, allow=allow)

        return Response({"message": "Permissions set successfully"}, status=200)


class IsSuperAdmin(BasePermission):
    message = "Super administrator permission is required."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_superuser or user.role_name == "super_admin"))


class GymViewSet(viewsets.ModelViewSet):
    queryset = Gym.objects.all()
    serializer_class = GymSerializer
    permission_classes = [IsSuperAdmin]
    search_fields = ["name", "slug", "contact_name", "contact_email"]
    filterset_fields = ["is_active"]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]


class AuthViewSet(viewsets.ViewSet):
    """Authentication viewset"""
    from django.core.handlers.wsgi import WSGIRequest

    @action(
        detail=False,
        methods=["post"],
        url_path="verify-admin-password",
        permission_classes=[IsAdminAccountCreator],
        parser_classes=[JSONParser],
    )
    def verify_admin_password(self, request):
        """Verify the current admin password before showing account creation."""
        admin_password = request.data.get("admin_password", "")
        admin_user = request.user

        if not admin_password:
            return Response(
                {"admin_password": "Admin password is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not admin_user.check_password(admin_password):
            return Response(
                {"admin_password": "Admin password is incorrect"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"success": True, "message": "Admin password verified"}
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="signup",
        permission_classes=[IsAdminAccountCreator],
        parser_classes=[MultiPartParser, FormParser, JSONParser],
    )
    def signup(self, request):
        """Admin-only endpoint for creating a staff account."""
        serializer = SignUpSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                {
                    "success": True,
                    "message": "Account created successfully. You can now sign in.",
                    "user_id": str(user.id),
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def login(self, request: WSGIRequest):
        """User login with attempt tracking and lockout"""
        from datetime import timedelta

        username = request.data.get('username', '')
        security_policy = get_security_policy()
        max_attempts = max(1, int(security_policy.login_attempt_limit))
        lockout_minutes = max(1, int(security_policy.lockout_minutes))

        # Check if account is locked
        user_check = User.objects.filter(username=username).first()
        if user_check:
            now = timezone.now()
            if user_check.account_locked_until and now < user_check.account_locked_until:
                seconds_remaining = max(
                    0,
                    int((user_check.account_locked_until - now).total_seconds()),
                )
                minutes_remaining = max(1, (seconds_remaining + 59) // 60)
                return Response({
                    "detail": f"Account is locked. Try again in {minutes_remaining} minutes.",
                    "locked_until": user_check.account_locked_until.isoformat(),
                    "minutes_remaining": minutes_remaining,
                    "attempts_remaining": 0
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            # Unlock if lock period expired
            if user_check.account_locked_until and now >= user_check.account_locked_until:
                user_check.account_locked_until = None
                user_check.failed_login_attempts = 0
                user_check.save(update_fields=['account_locked_until', 'failed_login_attempts'])

        serializer = LoginSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            # Track failed login attempt
            if user_check:
                user_check.failed_login_attempts += 1

                # Lock account after policy threshold failed attempts
                if user_check.failed_login_attempts >= max_attempts:
                    user_check.account_locked_until = timezone.now() + timedelta(minutes=lockout_minutes)
                    user_check.save(update_fields=['failed_login_attempts', 'account_locked_until'])
                    return Response({
                        "detail": f"Account locked due to too many failed login attempts. Try again in {lockout_minutes} minutes.",
                        "locked_until": user_check.account_locked_until.isoformat(),
                        "minutes_remaining": lockout_minutes,
                        "attempts_remaining": 0
                    }, status=status.HTTP_429_TOO_MANY_REQUESTS)
                else:
                    user_check.save(update_fields=['failed_login_attempts'])
                    attempts_remaining = max_attempts - user_check.failed_login_attempts
                    return Response({
                        "detail": "Invalid credentials.",
                        "attempts_remaining": attempts_remaining
                    }, status=status.HTTP_400_BAD_REQUEST)

            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data["user"]
        user.failed_login_attempts = 0
        user.account_locked_until = None
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        # Get client IP address
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR')

        user.last_login = timezone.now()
        user.last_login_ip = ip_address
        user.last_login_user_agent = request.META.get('HTTP_USER_AGENT', '')
        user.save(update_fields=[
            "last_login", "failed_login_attempts",
            "account_locked_until", "last_login_ip", "last_login_user_agent"
        ])
        res = Response({
            "access": access_token,
            "user": UserProfileSerializer(user, context={"request": request}).data,
            "message": "Login successful"
        })
        _set_refresh_cookie(res, refresh_token)

        return res
        
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        """User logout"""
        try:
            refresh_token = request.COOKIES.get("refresh_token")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()

            response = Response({"detail": "Logged out"})
            response.delete_cookie("refresh_token")
            return response
        except Exception:
            return Response({"detail": "Invalid token"}, status=400)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Get current user info"""
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='change-password')
    def change_password(self, request):
        """Change user password"""
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()

            # Keep user logged in after password change
            update_session_auth_hash(request, user)

            return Response({
                'message': 'Password changed successfully'
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='forgot-password')
    def forgot_password(self, request):
        """Send password reset verification code to email"""
        import random
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings
        from django.template.loader import render_to_string
        from datetime import datetime

        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email_or_username = serializer.validated_data['email_or_username']
        user = User.objects.filter(username=email_or_username).first() or \
               User.objects.filter(email=email_or_username).first()

        if user:
            # Check if user has an email
            if not user.email:
                return Response({
                    'success': False,
                    'message': 'This account does not have an email address associated with it. Please contact support for assistance.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Generate 6-digit verification code
            verification_code = str(random.randint(100000, 999999))
            user.password_reset_code = verification_code
            user.password_reset_sent_at = timezone.now()
            user.password_reset_attempts = 0  # Reset attempts counter
            user.save(update_fields=['password_reset_code', 'password_reset_sent_at', 'password_reset_attempts'])

            # Mask email for privacy (e.g., s*****@gmail.com)
            email_parts = user.email.split('@')
            masked_local = email_parts[0][0] + '*' * (len(email_parts[0]) - 1) if len(email_parts[0]) > 1 else email_parts[0]
            masked_email = f"{masked_local}@{email_parts[1]}"

            # Send verification code email
            context = {
                'user': user,
                'verification_code': verification_code,
                'current_year': datetime.now().year
            }

            try:
                html_content = render_to_string('emails/password_reset_code.html', context)
                text_content = f'Your password reset verification code is: {verification_code}\n\nThis code will expire in 15 minutes.\n\nIf you did not request this, please ignore this email.'

                email = EmailMultiAlternatives(
                    subject='Password Reset Verification Code - Gym MIS',
                    body=text_content,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[user.email]
                )
                email.attach_alternative(html_content, "text/html")
                email.send(fail_silently=False)

                return Response({
                    'success': True,
                    'message': f'A verification code has been sent to {masked_email}',
                    'masked_email': masked_email
                })
            except Exception as e:
                print(f"Failed to send email: {e}")
                return Response(
                    {'success': False, 'message': 'Failed to send verification code. Please try again later.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            # User not found - return generic message to prevent user enumeration
            return Response({
                'success': True,
                'message': 'If an account exists, a verification code has been sent to the associated email.'
            })

    @action(detail=False, methods=['post'], url_path='verify-reset-code')
    def verify_reset_code(self, request):
        """Verify the password reset code"""
        from datetime import timedelta

        serializer = VerifyResetCodeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email_or_username = serializer.validated_data['email_or_username']
        code = serializer.validated_data['code']

        user = User.objects.filter(username=email_or_username).first() or \
               User.objects.filter(email=email_or_username).first()

        if not user or not user.password_reset_code:
            return Response(
                {'success': False, 'message': 'Invalid verification code'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if code is expired (15 minutes)
        if user.password_reset_sent_at:
            expiry_time = user.password_reset_sent_at + timedelta(minutes=15)
            if timezone.now() > expiry_time:
                user.password_reset_code = None
                user.password_reset_sent_at = None
                user.password_reset_attempts = 0
                user.save(update_fields=['password_reset_code', 'password_reset_sent_at', 'password_reset_attempts'])
                return Response(
                    {'success': False, 'message': 'Verification code has expired. Please request a new one.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Check attempts (max 5 attempts)
        if user.password_reset_attempts >= 5:
            user.password_reset_code = None
            user.password_reset_sent_at = None
            user.password_reset_attempts = 0
            user.save(update_fields=['password_reset_code', 'password_reset_sent_at', 'password_reset_attempts'])
            return Response(
                {'success': False, 'message': 'Too many failed attempts. Please request a new code.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify code
        if user.password_reset_code != code:
            user.password_reset_attempts += 1
            user.save(update_fields=['password_reset_attempts'])
            attempts_left = 5 - user.password_reset_attempts
            return Response(
                {'success': False, 'message': f'Invalid code. {attempts_left} attempts remaining.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Code is valid
        return Response({
            'success': True,
            'message': 'Verification code is valid'
        })

    @action(detail=False, methods=['post'], url_path='reset-password')
    def reset_password(self, request):
        """Reset password with verification code"""
        from datetime import timedelta

        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email_or_username = serializer.validated_data['email_or_username']
        code = serializer.validated_data['code']
        new_password = serializer.validated_data['new_password']

        user = User.objects.filter(username=email_or_username).first() or \
               User.objects.filter(email=email_or_username).first()

        if not user or not user.password_reset_code:
            return Response(
                {'success': False, 'message': 'Invalid verification code'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if code is expired (15 minutes)
        if user.password_reset_sent_at:
            expiry_time = user.password_reset_sent_at + timedelta(minutes=15)
            if timezone.now() > expiry_time:
                user.password_reset_code = None
                user.password_reset_sent_at = None
                user.password_reset_attempts = 0
                user.save(update_fields=['password_reset_code', 'password_reset_sent_at', 'password_reset_attempts'])
                return Response(
                    {'success': False, 'message': 'Verification code has expired'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Verify code
        if user.password_reset_code != code:
            user.password_reset_attempts += 1
            user.save(update_fields=['password_reset_attempts'])
            return Response(
                {'success': False, 'message': 'Invalid verification code'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Reset password
        user.set_password(new_password)
        user.password_reset_code = None
        user.password_reset_sent_at = None
        user.password_reset_attempts = 0
        user.failed_login_attempts = 0
        user.account_locked_until = None
        user.save()

        return Response({
            'success': True,
            'message': 'Password reset successfully'
        })

    @action(detail=False, methods=['post'], url_path='verify-email')
    def verify_email(self, request):
        """Verify user email with token"""
        serializer = VerifyEmailSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token = serializer.validated_data['token']
        user = User.objects.filter(email_verification_token=token).first()

        if not user:
            return Response(
                {'error': 'Invalid or expired verification token'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if token is expired (24 hours)
        from datetime import timedelta
        if user.email_verification_sent_at:
            expiry_time = user.email_verification_sent_at + timedelta(hours=24)
            if timezone.now() > expiry_time:
                return Response(
                    {'error': 'Verification token has expired. Please request a new one.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Verify email
        user.email_verified = True
        user.email_verification_token = None
        user.email_verification_sent_at = None
        user.save()

        return Response({
            'message': 'Email verified successfully'
        })

    @action(detail=False, methods=['post'], url_path='resend-verification')
    def resend_verification(self, request):
        """Resend email verification"""
        import secrets
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings
        from django.template.loader import render_to_string
        from datetime import datetime

        serializer = ResendVerificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        user = User.objects.filter(email=email).first()

        if user and not user.email_verified:
            # Generate verification token
            token = secrets.token_urlsafe(32)
            user.email_verification_token = token
            user.email_verification_sent_at = timezone.now()
            user.save(update_fields=['email_verification_token', 'email_verification_sent_at'])

            # Send email with HTML template
            verification_url = f"{settings.FRONTEND_URL}/auth/verify-email/{token}"
            context = {
                'user': user,
                'verification_url': verification_url,
                'current_year': datetime.now().year
            }

            try:
                html_content = render_to_string('emails/email_verification.html', context)
                text_content = f'Click the link below to verify your email:\n\n{verification_url}\n\nThis link will expire in 24 hours.'

                email_msg = EmailMultiAlternatives(
                    subject='Email Verification - Gym MIS',
                    body=text_content,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[user.email]
                )
                email_msg.attach_alternative(html_content, "text/html")
                email_msg.send(fail_silently=False)
            except Exception as e:
                return Response(
                    {'error': 'Failed to send email. Please try again later.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        return Response({
            'message': 'Verification email sent successfully'
        })

    @action(detail=False, methods=['post'], url_path='refresh-session', permission_classes=[IsAuthenticated])
    def refresh_session(self, request):
        """Refresh user session (keep-alive)"""
        user = request.user
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])

        return Response({
            'message': 'Session refreshed successfully'
        })

    @action(detail=False, methods=['get'], url_path='login-attempts/(?P<username>[^/.]+)')
    def login_attempts(self, request, username=None):
        """Get login attempt information for a user"""
        security_policy = get_security_policy()
        max_attempts = max(1, int(security_policy.login_attempt_limit))
        user = User.objects.filter(username=username).first()

        if not user:
            return Response({
                'failed_attempts': 0,
                'is_locked': False,
                'attempts_remaining': max_attempts
            })

        is_locked = False
        locked_until = None

        if user.account_locked_until:
            if timezone.now() < user.account_locked_until:
                is_locked = True
                locked_until = user.account_locked_until.isoformat()
            else:
                # Unlock if period expired
                user.account_locked_until = None
                user.failed_login_attempts = 0
                user.save(update_fields=['account_locked_until', 'failed_login_attempts'])

        return Response({
            'failed_attempts': user.failed_login_attempts,
            'is_locked': is_locked,
            'locked_until': locked_until,
            'attempts_remaining': max(0, max_attempts - user.failed_login_attempts)
        })


class ActivityLogFilter(FilterSet):
    action = CharFilter(exact=True)
    table_name = CharFilter(lookup_expr='icontains')
    user = CharFilter(field_name='user__username', lookup_expr='icontains')
    date_from = DateFilter(field_name='timestamp', lookup_expr='gte')
    date_to = DateFilter(field_name='timestamp', lookup_expr='lte')
    ip_address = CharFilter(exact=True)

    class Meta:
        model = ActivityLog
        fields = ['action', 'table_name', 'user', 'ip_address']


class ActivityLogViewSet(PermissionMixin, viewsets.ReadOnlyModelViewSet):
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = ActivityLogFilter
    ordering_fields = ['timestamp', 'action', 'user']
    ordering = ['-timestamp']

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get activity statistics for dashboard"""
        from datetime import timedelta
        
        now = timezone.now()
        today = now.date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        queryset = self.get_queryset()
        
        stats = {
            'today': queryset.filter(timestamp__date=today).count(),
            'this_week': queryset.filter(timestamp__date__gte=week_ago).count(),
            'this_month': queryset.filter(timestamp__date__gte=month_ago).count(),
            'by_action': list(queryset.values('action').annotate(count=Count('id')).order_by('-count')[:5]),
            'by_user': list(queryset.values('user__username', 'user__first_name', 'user__last_name')
                          .annotate(count=Count('id')).order_by('-count')[:5]),
            'recent_activities': ActivityLogSerializer(
                queryset[:10], many=True, context={'request': request}
            ).data
        }
        
        return Response(stats)

    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export activity logs (simplified - returns data for now)"""
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        
        # In a real implementation, you'd generate CSV/Excel file
        return Response({
            'count': queryset.count(),
            'data': serializer.data[:1000]  # Limit for performance
        })
        
  
from rest_framework_simplejwt.views import TokenRefreshView

class CookieTokenRefreshView(TokenRefreshView):
    """
    Refresh access token using refresh token from httpOnly cookie.
    Also, sets the new rotated refresh token in the cookie.
    """
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            return Response({"detail": "Refresh token not found in cookie."}, status=status.HTTP_401_UNAUTHORIZED)

        # We are using the default serializer, which expects the refresh token in the body.
        # So we pass it in the data dictionary.
        serializer = self.get_serializer(data={"refresh": refresh_token})

        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            # The token is invalid or expired
            return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        
        # The serializer.validated_data contains the new access and refresh tokens
        access_token = serializer.validated_data["access"]
        new_refresh_token = serializer.validated_data["refresh"]

        res = Response({"access": access_token, "message": "Token refreshed successfully"})
        _set_refresh_cookie(res, new_refresh_token)
        
        return res

