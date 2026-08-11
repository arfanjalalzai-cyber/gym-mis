from django.core.exceptions import ValidationError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import ROLE_CHOICES, RolePermission, User
from core.models import Permission

from .models import Equipment, EquipmentHistory


class EquipmentModelTests(APITestCase):
    def test_equipment_code_is_auto_generated(self):
        equipment_1 = Equipment.objects.create(
            name="Treadmill A",
            item_type="machine",
            category="cardio",
            quantity_on_hand=2,
            quantity_in_service=1,
            machine_status="operational",
        )
        equipment_2 = Equipment.objects.create(
            name="Yoga Mat",
            item_type="accessory",
            category="functional",
            quantity_on_hand=15,
            quantity_in_service=5,
        )

        self.assertTrue(equipment_1.equipment_code.startswith("EQP-"))
        self.assertTrue(equipment_2.equipment_code.startswith("EQP-"))
        self.assertNotEqual(equipment_1.equipment_code, equipment_2.equipment_code)

    def test_machine_validation_rules(self):
        with self.assertRaises(ValidationError):
            Equipment.objects.create(
                name="Invalid Machine",
                item_type="machine",
                category="cardio",
                quantity_on_hand=1,
                quantity_in_service=0,
                machine_status=None,
            )

        with self.assertRaises(ValidationError):
            Equipment.objects.create(
                name="Invalid Accessory",
                item_type="accessory",
                category="functional",
                quantity_on_hand=5,
                quantity_in_service=1,
                machine_status="operational",
            )

    def test_quantity_constraints(self):
        with self.assertRaises(ValidationError):
            Equipment.objects.create(
                name="Bad Quantity",
                item_type="consumable",
                category="nutrition",
                quantity_on_hand=0,
                quantity_in_service=0,
            )

        with self.assertRaises(ValidationError):
            Equipment.objects.create(
                name="Service Exceeds Stock",
                item_type="consumable",
                category="nutrition",
                quantity_on_hand=1,
                quantity_in_service=2,
            )


class EquipmentAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls._seed_inventory_permissions()
        cls.admin_user = User.objects.create_user(
            username="inventory_admin",
            password="pass12345",
            role_name="admin",
        )
        cls.receptionist_user = User.objects.create_user(
            username="inventory_rec",
            password="pass12345",
            role_name="receptionist",
        )
        cls.viewer_user = User.objects.create_user(
            username="inventory_viewer",
            password="pass12345",
            role_name="viewer",
        )

    @classmethod
    def _seed_inventory_permissions(cls):
        actions = ["view", "add", "change", "delete", "all"]
        permissions = {}
        for action in actions:
            permission, _ = Permission.objects.get_or_create(
                module="inventory",
                action=action,
                defaults={"description": f"Can {action} inventory"},
            )
            permissions[action] = permission

        role_action_map = {
            "admin": ["all"],
            "receptionist": ["view", "add", "change"],
            "viewer": ["view"],
        }

        allowed_roles = {role for role, _ in ROLE_CHOICES}
        for role_name, role_actions in role_action_map.items():
            if role_name not in allowed_roles:
                continue
            for action in role_actions:
                RolePermission.objects.get_or_create(
                    role_name=role_name,
                    permission=permissions[action],
                )

    def setUp(self):
        self.list_url = reverse("inventory:equipment-list")
        self.equipment = Equipment.objects.create(
            name="Elliptical",
            item_type="machine",
            category="cardio",
            quantity_on_hand=6,
            quantity_in_service=4,
            machine_status="operational",
        )

    def test_admin_can_create_equipment(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "name": "Resistance Band Pack",
            "item_type": "accessory",
            "category": "functional",
            "quantity_on_hand": 20,
            "quantity_in_service": 5,
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("equipment_code", response.data)

        created_id = response.data["id"]
        self.assertTrue(
            EquipmentHistory.objects.filter(
                equipment_id=created_id,
                event_type="created",
            ).exists()
        )

    def test_viewer_is_read_only(self):
        self.client.force_authenticate(user=self.viewer_user)
        create_response = self.client.post(
            self.list_url,
            {
                "name": "Blocked Item",
                "item_type": "consumable",
                "category": "nutrition",
                "quantity_on_hand": 10,
                "quantity_in_service": 0,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

        list_response = self.client.get(self.list_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)

    def test_receptionist_cannot_delete(self):
        self.client.force_authenticate(user=self.receptionist_user)
        detail_url = reverse("inventory:equipment-detail", kwargs={"pk": self.equipment.id})
        delete_response = self.client.delete(detail_url)
        self.assertEqual(delete_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_soft_delete_and_restore(self):
        self.client.force_authenticate(user=self.admin_user)
        detail_url = reverse("inventory:equipment-detail", kwargs={"pk": self.equipment.id})
        delete_response = self.client.delete(detail_url)
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

        self.assertFalse(Equipment.objects.filter(id=self.equipment.id).exists())
        self.assertTrue(Equipment.all_objects.filter(id=self.equipment.id).exists())

        restore_url = reverse("inventory:equipment-restore", kwargs={"pk": self.equipment.id})
        restore_response = self.client.post(restore_url, format="json")
        self.assertEqual(restore_response.status_code, status.HTTP_200_OK)
        self.assertTrue(Equipment.objects.filter(id=self.equipment.id).exists())

    def test_direct_patch_quantity_creates_history(self):
        self.client.force_authenticate(user=self.admin_user)
        detail_url = reverse("inventory:equipment-detail", kwargs={"pk": self.equipment.id})
        response = self.client.patch(
            detail_url,
            {"quantity_on_hand": 8},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        history = EquipmentHistory.objects.filter(
            equipment=self.equipment,
            event_type="quantity_adjusted",
            event_source="form_edit",
        ).first()
        self.assertIsNotNone(history)
        self.assertEqual(history.quantity_on_hand_delta, 2)

    def test_adjust_quantity_action(self):
        self.client.force_authenticate(user=self.admin_user)
        adjust_url = reverse("inventory:equipment-adjust-quantity", kwargs={"pk": self.equipment.id})
        response = self.client.post(
            adjust_url,
            {
                "target": "quantity_on_hand",
                "operation": "increase",
                "value": 5,
                "note": "New shipment arrived",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.equipment.refresh_from_db()
        self.assertEqual(self.equipment.quantity_on_hand, 11)

        history = EquipmentHistory.objects.filter(
            equipment=self.equipment,
            event_type="quantity_adjusted",
            event_source="adjustment_action",
        ).first()
        self.assertIsNotNone(history)
        self.assertEqual(history.quantity_on_hand_delta, 5)

    def test_change_status_action(self):
        self.client.force_authenticate(user=self.admin_user)
        change_status_url = reverse("inventory:equipment-change-status", kwargs={"pk": self.equipment.id})
        response = self.client.post(
            change_status_url,
            {"machine_status": "maintenance", "note": "Motor inspection scheduled"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.equipment.refresh_from_db()
        self.assertEqual(self.equipment.machine_status, "maintenance")

        self.assertTrue(
            EquipmentHistory.objects.filter(
                equipment=self.equipment,
                event_type="status_changed",
                event_source="status_action",
            ).exists()
        )

    def test_history_endpoint(self):
        self.client.force_authenticate(user=self.admin_user)
        detail_url = reverse("inventory:equipment-detail", kwargs={"pk": self.equipment.id})
        self.client.patch(detail_url, {"notes": "Updated notes"}, format="json")

        history_url = reverse("inventory:equipment-history", kwargs={"pk": self.equipment.id})
        response = self.client.get(history_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["count"], 1)

    def test_low_stock_endpoint(self):
        Equipment.objects.create(
            name="Protein Shake Sachet",
            item_type="consumable",
            category="nutrition",
            quantity_on_hand=3,
            quantity_in_service=3,
        )
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(reverse("inventory:equipment-low-stock"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Protein Shake Sachet")

    def test_search_filter_and_ordering(self):
        Equipment.objects.create(
            name="Rowing Machine",
            item_type="machine",
            category="cardio",
            quantity_on_hand=2,
            quantity_in_service=2,
            machine_status="operational",
        )
        self.client.force_authenticate(user=self.admin_user)

        search_response = self.client.get(self.list_url, {"search": "Rowing"})
        self.assertEqual(search_response.status_code, status.HTTP_200_OK)
        self.assertEqual(search_response.data["count"], 1)

        filter_response = self.client.get(self.list_url, {"item_type": "machine"})
        self.assertEqual(filter_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(filter_response.data["count"], 2)

        ordering_response = self.client.get(self.list_url, {"ordering": "name"})
        self.assertEqual(ordering_response.status_code, status.HTTP_200_OK)
