from rest_framework import serializers
from .models import InterviewSlot, SchedulingRequest


class InterviewSlotSerializer(serializers.ModelSerializer):
    candidate_name = serializers.CharField(
        source='candidate.full_name', read_only=True
    )

    class Meta:
        model = InterviewSlot
        fields = [
            'id', 'candidate', 'candidate_name', 'interviewer_email',
            'start_time', 'end_time', 'status', 'google_event_id',
            'meet_link', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class SchedulingRequestSerializer(serializers.ModelSerializer):
    candidate_name = serializers.CharField(
        source='candidate.full_name', read_only=True
    )
    job_title = serializers.CharField(
        source='candidate.job.title', read_only=True, default=''
    )

    class Meta:
        model = SchedulingRequest
        fields = [
            'id', 'candidate', 'candidate_name', 'job_title', 'status',
            'slots_sent_at', 'confirmed_at', 'follow_up_sent',
            'preferred_date', 'preferred_time', 'candidate_note',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']
