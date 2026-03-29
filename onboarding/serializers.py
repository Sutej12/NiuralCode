from rest_framework import serializers
from .models import OnboardingRecord


class OnboardingRecordSerializer(serializers.ModelSerializer):
    candidate_name = serializers.CharField(
        source='candidate.full_name', read_only=True
    )
    candidate_email = serializers.CharField(
        source='candidate.email', read_only=True
    )

    class Meta:
        model = OnboardingRecord
        fields = [
            'id', 'candidate', 'candidate_name', 'candidate_email',
            'slack_invite_sent', 'slack_invite_sent_at',
            'slack_user_id', 'slack_joined', 'slack_joined_at',
            'welcome_message_sent', 'hr_notified', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
