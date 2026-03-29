from django.contrib import admin
from .models import OfferLetter


@admin.register(OfferLetter)
class OfferLetterAdmin(admin.ModelAdmin):
    list_display = [
        'candidate', 'job_title', 'base_salary', 'status',
        'signed_at', 'created_at',
    ]
    list_filter = ['status']
    search_fields = ['candidate__full_name', 'job_title']
    readonly_fields = ['created_at', 'updated_at', 'signed_at', 'signer_ip']
