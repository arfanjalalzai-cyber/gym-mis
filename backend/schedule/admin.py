from django.contrib import admin

from .models import ScheduleClass, ScheduleSlot


@admin.register(ScheduleClass)
class ScheduleClassAdmin(admin.ModelAdmin):
    list_display = ("class_code", "name", "default_duration_minutes", "max_capacity", "is_active")
    list_filter = ("is_active",)
    search_fields = ("class_code", "name")


@admin.register(ScheduleSlot)
class ScheduleSlotAdmin(admin.ModelAdmin):
    list_display = (
        "schedule_class",
        "trainer",
        "weekday",
        "start_time",
        "end_time",
        "is_active",
    )
    list_filter = ("weekday", "is_active")
    search_fields = ("schedule_class__name", "trainer__trainer_code")
