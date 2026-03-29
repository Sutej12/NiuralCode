from rest_framework import serializers
from .models import Interview


class InterviewSerializer(serializers.ModelSerializer):
    candidate_name = serializers.CharField(
        source='candidate.full_name', read_only=True
    )

    class Meta:
        model = Interview
        fields = [
            'id', 'candidate', 'candidate_name', 'slot', 'meeting_link',
            'transcript', 'summary', 'ai_feedback', 'live_lines',
            'notetaker_meeting_id', 'status', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
