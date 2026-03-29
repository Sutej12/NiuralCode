from django.contrib import admin

from .models import Job


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ("title", "team", "location", "is_remote", "experience_level", "status", "created_at")
    list_filter = ("status", "experience_level", "is_remote", "team")
    search_fields = ("title", "team", "location", "description")
    readonly_fields = ("created_at", "updated_at")
