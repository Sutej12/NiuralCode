import hashlib
import hmac
import logging
import threading

from django.conf import settings as django_settings
from django.utils.dateparse import parse_date
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action, api_view
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from .models import Candidate
from .serializers import (
    CandidateListSerializer,
    CandidateDetailSerializer,
    CandidateApplySerializer,
    CandidatePortalSerializer,
)
from .services import send_confirmation_email, screen_resume, research_candidate, send_rejection_email


def generate_portal_token(candidate_id, email):
    """Generate an HMAC token for candidate portal access."""
    secret = django_settings.SECRET_KEY
    message = f"{candidate_id}:{email}"
    return hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()[:24]


@api_view(['GET'])
def candidate_portal(request, candidate_id, token):
    """Public endpoint for candidates to check their application status."""
    try:
        candidate = Candidate.objects.select_related('job').prefetch_related(
            'status_history'
        ).get(pk=candidate_id)
    except Candidate.DoesNotExist:
        return Response(
            {'error': 'Application not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    expected_token = generate_portal_token(candidate.id, candidate.email)
    if not hmac.compare_digest(token, expected_token):
        return Response(
            {'error': 'Invalid or expired link.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = CandidatePortalSerializer(candidate)
    return Response(serializer.data)

logger = logging.getLogger(__name__)


class CandidateViewSet(viewsets.ModelViewSet):
    queryset = Candidate.objects.select_related('job').prefetch_related(
        'status_history'
    )
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.action == 'list':
            return CandidateListSerializer
        if self.action == 'create':
            return CandidateApplySerializer
        return CandidateDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        role = params.get('role')
        if role:
            qs = qs.filter(job__title__icontains=role)

        candidate_status = params.get('status')
        if candidate_status:
            qs = qs.filter(status=candidate_status)

        date_from = params.get('date_from')
        if date_from:
            parsed = parse_date(date_from)
            if parsed:
                qs = qs.filter(created_at__date__gte=parsed)

        date_to = params.get('date_to')
        if date_to:
            parsed = parse_date(date_to)
            if parsed:
                qs = qs.filter(created_at__date__lte=parsed)

        referred = params.get('referred')
        if referred == 'true':
            qs = qs.filter(is_referred=True)

        return qs

    def perform_create(self, serializer):
        candidate = serializer.save()
        # Send email in background so the API responds immediately
        threading.Thread(
            target=send_confirmation_email,
            args=(candidate,),
            daemon=True,
        ).start()

    def partial_update(self, request, *args, **kwargs):
        candidate = self.get_object()
        new_status = request.data.get('status')
        note = request.data.get('note', '')
        changed_by = request.data.get('changed_by', 'admin')

        # Block status changes once candidate is Hired, Onboarded, or Rejected
        if candidate.status in ('Hired', 'Onboarded', 'Rejected'):
            return Response(
                {'error': f'Cannot change status after candidate has been {candidate.status.lower()}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_status and new_status != candidate.status:
            old_status = candidate.status
            candidate.status = new_status
            candidate.save()
            # Update the auto-created history entry with note and changed_by
            history = candidate.status_history.order_by('-created_at').first()
            if history and history.old_status == old_status:
                history.note = note
                history.changed_by = changed_by
                history.save()

            # Send rejection email if status changed to Rejected
            if new_status == 'Rejected':
                threading.Thread(
                    target=send_rejection_email,
                    args=(candidate, note),
                    daemon=True,
                ).start()

        serializer = self.get_serializer(candidate)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='screen')
    def screen_candidate(self, request, pk=None):
        candidate = self.get_object()
        try:
            result = screen_resume(candidate)
            candidate.refresh_from_db()
            serializer = self.get_serializer(candidate)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Screening failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['post'], url_path='research')
    def research_candidate(self, request, pk=None):
        candidate = self.get_object()
        try:
            result = research_candidate(candidate)
            candidate.refresh_from_db()
            serializer = self.get_serializer(candidate)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Research failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


VALID_REFERRAL_CODES = ['Sutej1999']


class ApplyView(generics.CreateAPIView):
    """Public endpoint for candidate applications."""

    serializer_class = CandidateApplySerializer
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        # Block applications to closed or paused jobs
        from jobs.models import Job
        job_id = request.data.get('job')
        if job_id:
            try:
                job = Job.objects.get(pk=job_id)
                if job.status == 'Closed':
                    return Response(
                        {'error': 'This position has been closed and is no longer accepting applications.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if job.status == 'Paused':
                    return Response(
                        {'error': 'This position is currently on hold. Please check back later.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            except Job.DoesNotExist:
                pass
        # Validate referral code if provided
        referral_code = request.data.get('referral_code', '').strip()
        if referral_code and referral_code not in VALID_REFERRAL_CODES:
            return Response(
                {'referral_code': ['Invalid referral code. Please check and try again, or leave it blank.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        referral_code = serializer.validated_data.get('referral_code', '').strip()
        is_referred = referral_code in VALID_REFERRAL_CODES
        candidate = serializer.save(is_referred=is_referred)
        # Send email in background so the API responds immediately
        threading.Thread(
            target=send_confirmation_email,
            args=(candidate,),
            daemon=True,
        ).start()
