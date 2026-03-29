from django.contrib import admin
from .models import OnboardingRecord


@admin.register(OnboardingRecord)
class OnboardingRecordAdmin(admin.ModelAdmin):
    list_display = [
        'candidate', 'slack_invite_sent', 'slack_joined',
        'welcome_message_sent', 'hr_notified', 'created_at',
    ]
    list_filter = [
        'slack_invite_sent', 'slack_joined',
        'welcome_message_sent', 'hr_notified',
    ]
    search_fields = ['candidate__full_name', 'slack_user_id']
    readonly_fields = ['created_at']
