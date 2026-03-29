from django.contrib import admin

from .models import Candidate, StatusHistory


class StatusHistoryInline(admin.TabularInline):
    model = StatusHistory
    extra = 0
    readonly_fields = ['old_status', 'new_status', 'note', 'changed_by', 'created_at']


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = [
        'full_name',
        'email',
        'job',
        'status',
        'ai_score',
        'created_at',
    ]
    list_filter = ['status', 'job', 'created_at']
    search_fields = ['full_name', 'email']
    readonly_fields = [
        'ai_score',
        'ai_rationale',
        'parsed_resume',
        'research_profile',
        'candidate_brief',
        'created_at',
        'updated_at',
    ]
    inlines = [StatusHistoryInline]


@admin.register(StatusHistory)
class StatusHistoryAdmin(admin.ModelAdmin):
    list_display = ['candidate', 'old_status', 'new_status', 'changed_by', 'created_at']
    list_filter = ['new_status', 'changed_by']
    readonly_fields = ['candidate', 'old_status', 'new_status', 'note', 'changed_by', 'created_at']
