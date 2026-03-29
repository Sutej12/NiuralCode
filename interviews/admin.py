from django.contrib import admin
from .models import Interview


@admin.register(Interview)
class InterviewAdmin(admin.ModelAdmin):
    list_display = [
        'candidate', 'slot', 'status', 'notetaker_meeting_id',
        'created_at', 'updated_at',
    ]
    list_filter = ['status']
    search_fields = ['candidate__full_name', 'notetaker_meeting_id']
    readonly_fields = ['created_at', 'updated_at']
