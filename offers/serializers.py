from rest_framework import serializers
from .models import OfferLetter


class OfferLetterSerializer(serializers.ModelSerializer):
    candidate_name = serializers.CharField(
        source='candidate.full_name', read_only=True
    )
    candidate_email = serializers.CharField(
        source='candidate.email', read_only=True
    )

    class Meta:
        model = OfferLetter
        fields = [
            'id', 'candidate', 'candidate_name', 'candidate_email',
            'job_title', 'start_date', 'base_salary', 'equity', 'bonus',
            'reporting_manager', 'custom_terms', 'content', 'status',
            'signed_at', 'signature_data', 'signer_ip',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'content', 'signed_at', 'signature_data', 'signer_ip',
            'created_at', 'updated_at',
        ]


class OfferSignSerializer(serializers.Serializer):
    signature_data = serializers.CharField(
        help_text='Base64-encoded signature image'
    )
