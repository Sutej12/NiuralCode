from rest_framework import serializers

from .models import Candidate, StatusHistory


class StatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = StatusHistory
        fields = [
            'id',
            'old_status',
            'new_status',
            'note',
            'changed_by',
            'created_at',
        ]
        read_only_fields = fields


class CandidateListSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source='job.title', read_only=True)

    class Meta:
        model = Candidate
        fields = [
            'id',
            'full_name',
            'email',
            'job_title',
            'ai_score',
            'status',
            'is_referred',
            'created_at',
        ]
        read_only_fields = fields


class CandidateDetailSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source='job.title', read_only=True)
    status_history = StatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Candidate
        fields = [
            'id',
            'full_name',
            'email',
            'linkedin_url',
            'portfolio_url',
            'job',
            'job_title',
            'resume',
            'status',
            'ai_score',
            'ai_rationale',
            'parsed_resume',
            'research_profile',
            'candidate_brief',
            'created_at',
            'updated_at',
            'status_history',
        ]
        read_only_fields = [
            'id',
            'ai_score',
            'ai_rationale',
            'parsed_resume',
            'research_profile',
            'candidate_brief',
            'created_at',
            'updated_at',
            'status_history',
        ]


class PortalStatusHistorySerializer(serializers.ModelSerializer):
    """Candidate-facing status history — hides internal notes."""
    class Meta:
        model = StatusHistory
        fields = ['new_status', 'created_at']
        read_only_fields = fields


class CandidatePortalSerializer(serializers.ModelSerializer):
    """Read-only serializer for candidate self-service portal.
    Only exposes information safe for the candidate to see."""
    job_title = serializers.CharField(source='job.title', read_only=True)
    company = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()
    job_type = serializers.SerializerMethodField()
    status_timeline = serializers.SerializerMethodField()
    scheduling = serializers.SerializerMethodField()
    interview = serializers.SerializerMethodField()

    class Meta:
        model = Candidate
        fields = [
            'id',
            'full_name',
            'email',
            'job_title',
            'company',
            'location',
            'job_type',
            'status',
            'created_at',
            'updated_at',
            'status_timeline',
            'scheduling',
            'interview',
        ]
        read_only_fields = fields

    def get_company(self, obj):
        return getattr(obj.job, 'company', 'Niural Inc.')

    def get_location(self, obj):
        return getattr(obj.job, 'location', 'Remote')

    def get_job_type(self, obj):
        return getattr(obj.job, 'job_type', 'Full-time')

    def get_status_timeline(self, obj):
        entries = obj.status_history.order_by('created_at')
        timeline = [{'status': 'Applied', 'date': obj.created_at.isoformat()}]
        for entry in entries:
            timeline.append({
                'status': entry.new_status,
                'date': entry.created_at.isoformat(),
            })
        return timeline

    def get_scheduling(self, obj):
        """Return scheduling slots for the candidate."""
        try:
            from scheduling.models import InterviewSlot
            slots = InterviewSlot.objects.filter(candidate=obj).order_by('start_time')
            confirmed = slots.filter(status='confirmed').first()
            if confirmed:
                return {
                    'status': 'confirmed',
                    'confirmed_slot': {
                        'id': confirmed.id,
                        'start_time': confirmed.start_time.isoformat(),
                        'end_time': confirmed.end_time.isoformat(),
                        'meet_link': confirmed.meet_link or '',
                    },
                    'slots': [],
                }
            tentative = slots.filter(status='tentative')
            if tentative.exists():
                return {
                    'status': 'pending',
                    'confirmed_slot': None,
                    'slots': [
                        {
                            'id': s.id,
                            'start_time': s.start_time.isoformat(),
                            'end_time': s.end_time.isoformat(),
                            'status': s.status,
                        }
                        for s in tentative
                    ],
                }
        except Exception:
            pass
        return None

    def get_interview(self, obj):
        """Return interview info (meeting link, status) for candidate."""
        try:
            from interviews.models import Interview
            interview = Interview.objects.filter(candidate=obj).first()
            if interview:
                # Also check for meet_link from confirmed slot
                meet_link = interview.meeting_link or ''
                if not meet_link:
                    from scheduling.models import InterviewSlot
                    slot = InterviewSlot.objects.filter(
                        candidate=obj, status='confirmed'
                    ).first()
                    if slot and slot.meet_link:
                        meet_link = slot.meet_link
                return {
                    'id': interview.id,
                    'status': interview.status,
                    'meeting_link': meet_link,
                    'has_transcript': bool(interview.transcript),
                    'has_feedback': bool(interview.ai_feedback),
                }
        except Exception:
            pass
        return None


class CandidateApplySerializer(serializers.ModelSerializer):
    referral_code = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = Candidate
        fields = [
            'id',
            'full_name',
            'email',
            'linkedin_url',
            'portfolio_url',
            'job',
            'resume',
            'referral_code',
        ]
        read_only_fields = ['id']
        # Disable DRF's auto unique_together validator so our custom
        # validate() returns a user-friendly message instead
        validators = []

    def validate_portfolio_url(self, value):
        if value and not value.startswith(('http://', 'https://')):
            value = 'https://' + value
        return value

    def validate_linkedin_url(self, value):
        if value and not value.startswith(('http://', 'https://')):
            value = 'https://' + value
        return value

    def validate_resume(self, value):
        # Validate file type
        allowed_types = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ]
        allowed_extensions = ['.pdf', '.docx']

        file_name = value.name.lower()
        has_valid_ext = any(file_name.endswith(ext) for ext in allowed_extensions)

        if not has_valid_ext:
            raise serializers.ValidationError(
                "Only PDF and DOCX files are accepted."
            )

        if hasattr(value, 'content_type') and value.content_type not in allowed_types:
            # Content type check as secondary validation
            if not has_valid_ext:
                raise serializers.ValidationError(
                    "Only PDF and DOCX files are accepted."
                )

        # Validate file size (max 5MB)
        max_size = 5 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(
                "Resume file size must not exceed 5MB."
            )

        return value

    def validate_job(self, value):
        if hasattr(value, 'status') and value.status != 'Open':
            raise serializers.ValidationError(
                "This job is no longer accepting applications."
            )
        return value

    def validate(self, data):
        email = data.get('email')
        job = data.get('job')
        if email:
            # Block if already hired or onboarded for any role
            hired_or_onboarded = Candidate.objects.filter(
                email=email, status__in=['Hired', 'Onboarded']
            ).first()
            if hired_or_onboarded:
                raise serializers.ValidationError(
                    "You are already hired / onboarded with us. "
                    "Kindly contact HR for any change in role."
                )
            # Block duplicate application for same role
            if job and Candidate.objects.filter(email=email, job=job).exists():
                raise serializers.ValidationError(
                    "You have already applied for this position."
                )
        return data
