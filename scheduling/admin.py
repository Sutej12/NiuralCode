from django.contrib import admin
from .models import InterviewSlot, SchedulingRequest


@admin.register(InterviewSlot)
class InterviewSlotAdmin(admin.ModelAdmin):
    list_display = [
        'candidate', 'interviewer_email', 'start_time', 'end_time',
        'status', 'created_at',
    ]
    list_filter = ['status', 'interviewer_email']
    search_fields = ['candidate__full_name', 'interviewer_email']
    readonly_fields = ['created_at']


@admin.register(SchedulingRequest)
class SchedulingRequestAdmin(admin.ModelAdmin):
    list_display = [
        'candidate', 'status', 'slots_sent_at', 'confirmed_at',
        'follow_up_sent', 'created_at',
    ]
    list_filter = ['status', 'follow_up_sent']
    search_fields = ['candidate__full_name']
    readonly_fields = ['created_at']
