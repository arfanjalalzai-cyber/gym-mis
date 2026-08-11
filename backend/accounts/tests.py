from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from .models import User


class AccountCreationPermissionTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_user = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="AdminPass123!",
            role_name="admin",
        )
        cls.manager_user = User.objects.create_user(
            username="manager",
            email="manager@example.com",
            password="ManagerPass123!",
            role_name="manager",
        )
        cls.staff_user = User.objects.create_user(
            username="staff",
            email="staff@example.com",
            password="StaffPass123!",
            role_name="staff",
        )
        cls.signup_url = reverse("accounts:auth-signup")
        cls.verify_admin_password_url = reverse("accounts:auth-verify-admin-password")
        cls.users_url = reverse("accounts:user-list")

    def signup_payload(self, username="newstaff", email="newstaff@example.com"):
        return {
            "first_name": "New",
            "last_name": "Staff",
            "username": username,
            "email": email,
            "phone": "0700000001",
            "password": "NewStaff123!",
            "confirm_password": "NewStaff123!",
            "admin_password": "AdminPass123!",
            "role_name": "staff",
        }

    def create_user_payload(self, username="createduser", email="created@example.com"):
        return {
            "first_name": "Created",
            "last_name": "User",
            "username": username,
            "email": email,
            "phone": "0700000002",
            "password": "CreatedUser123!",
            "role_name": "staff",
        }

    def test_anonymous_user_cannot_create_account_through_signup(self):
        response = self.client.post(self.signup_url, self.signup_payload(), format="json")

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )
        self.assertFalse(User.objects.filter(username="newstaff").exists())

    def test_staff_user_cannot_create_account_through_signup(self):
        self.client.force_authenticate(user=self.staff_user)

        response = self.client.post(self.signup_url, self.signup_payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(User.objects.filter(username="newstaff").exists())

    def test_admin_user_can_create_account_through_signup(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(self.signup_url, self.signup_payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="newstaff", role_name="staff").exists())

    def test_admin_password_is_required_for_signup(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = self.signup_payload()
        payload["admin_password"] = "WrongPass123!"

        response = self.client.post(self.signup_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("admin_password", response.data)
        self.assertFalse(User.objects.filter(username="newstaff").exists())

    def test_admin_user_can_verify_admin_password_before_signup(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            self.verify_admin_password_url,
            {"admin_password": "AdminPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])

    def test_wrong_admin_password_cannot_open_signup_form(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            self.verify_admin_password_url,
            {"admin_password": "WrongPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("admin_password", response.data)

    def test_manager_user_cannot_create_account_through_users_endpoint(self):
        self.client.force_authenticate(user=self.manager_user)

        response = self.client.post(self.users_url, self.create_user_payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(User.objects.filter(username="createduser").exists())

    def test_admin_user_can_create_account_through_users_endpoint(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(self.users_url, self.create_user_payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="createduser", role_name="staff").exists())
