from django.contrib import admin

from .models import Equipment, EquipmentHistory


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = (
        "equipment_code",
        "name",
        "item_type",
        "category",
        "quantity_on_hand",
        "quantity_in_service",
        "machine_status",
        "deleted_at",
        "created_at",
    )
    list_filter = ("item_type", "category", "machine_status", "created_at")
    search_fields = ("equipment_code", "name")


@admin.register(EquipmentHistory)
class EquipmentHistoryAdmin(admin.ModelAdmin):
    list_display = (
        "equipment",
        "event_type",
        "event_source",
        "performed_by",
        "quantity_on_hand_delta",
        "quantity_in_service_delta",
        "created_at",
    )
    list_filter = ("event_type", "event_source", "created_at")
    search_fields = ("equipment__equipment_code", "equipment__name", "note", "performed_by__username")
