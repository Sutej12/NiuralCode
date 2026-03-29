import logging

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from candidates.models import Candidate

from .models import OnboardingRecord
from .serializers import OnboardingRecordSerializer
from . import services

logger = logging.getLogger(__name__)


class OnboardingViewSet(viewsets.ViewSet):
    """Manage candidate onboarding via Slack integration."""

    def list(self, request):
        """List all onboarding records."""
        qs = OnboardingRecord.objects.select_related('candidate').all()
        serializer = OnboardingRecordSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='trigger')
    def trigger_onboarding(self, request):
        """Send Slack invite and create onboarding record."""
        candidate_id = request.data.get('candidate_id')
        candidate = get_object_or_404(Candidate, pk=candidate_id)

        record, created = OnboardingRecord.objects.get_or_create(
            candidate=candidate
        )

        if record.slack_invite_sent:
            return Response(
                {'message': 'Slack invite already sent.', 'record': OnboardingRecordSerializer(record).data},
                status=status.HTTP_200_OK,
            )

        result = services.send_slack_invite(candidate)

        record.slack_invite_sent = True
        record.slack_invite_sent_at = timezone.now()
        record.save()

        serializer = OnboardingRecordSerializer(record)
        return Response({
            'message': 'Onboarding triggered. Slack invite sent.',
            'slack_result': result,
            'record': serializer.data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='slack-events')
    def slack_events(self, request):
        """Webhook endpoint for Slack events (team_join)."""
        # Handle Slack URL verification challenge
        if request.data.get('type') == 'url_verification':
            return Response({'challenge': request.data.get('challenge')})

        event = request.data.get('event', {})
        event_type = event.get('type')

        if event_type == 'team_join':
            user = event.get('user', {})
            slack_user_id = user.get('id', '')
            email = user.get('profile', {}).get('email', '')

            if not email:
                logger.warning("team_join event without email for user %s", slack_user_id)
                return Response({'ok': True})

            # Find the onboarding record by candidate email
            try:
                candidate = Candidate.objects.get(email=email)
                record = OnboardingRecord.objects.get(candidate=candidate)

                record.slack_user_id = slack_user_id
                record.slack_joined = True
                record.slack_joined_at = timezone.now()
                record.save()

                # Send welcome message
                services.send_welcome_message(slack_user_id, candidate)
                record.welcome_message_sent = True
                record.save()

                # Notify HR channel
                services.notify_hr_channel(candidate)
                record.hr_notified = True
                record.save()

                # Update candidate status to Onboarded
                if candidate.status == 'Hired':
                    candidate.status = 'Onboarded'
                    candidate.save()

                logger.info("Onboarding completed for %s", candidate.full_name)
            except (Candidate.DoesNotExist, OnboardingRecord.DoesNotExist):
                logger.info(
                    "team_join event for unknown email: %s", email
                )

        return Response({'ok': True})

    @action(detail=False, methods=['get'], url_path='status/(?P<candidate_id>[^/.]+)')
    def check_status(self, request, candidate_id=None):
        """Check onboarding status for a candidate."""
        candidate = get_object_or_404(Candidate, pk=candidate_id)
        record = get_object_or_404(OnboardingRecord, candidate=candidate)
        serializer = OnboardingRecordSerializer(record)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='check-slack-join')
    def check_slack_join(self, request):
        """
        Manually check if the candidate has joined Slack by looking up their email.
        This is used instead of the team_join webhook when ngrok isn't available.
        """
        candidate_id = request.data.get('candidate_id')
        candidate = get_object_or_404(Candidate, pk=candidate_id)

        try:
            record = OnboardingRecord.objects.get(candidate=candidate)
        except OnboardingRecord.DoesNotExist:
            return Response(
                {'error': 'Onboarding not triggered yet.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if record.hr_notified:
            return Response({
                'message': 'Onboarding already completed.',
                'record': OnboardingRecordSerializer(record).data,
            })

        # Look up candidate by email in Slack
        slack_user = services.find_slack_user_by_email(candidate.email)

        if not slack_user:
            return Response({
                'message': 'Candidate has not joined Slack yet.',
                'joined': False,
                'record': OnboardingRecordSerializer(record).data,
            })

        slack_user_id = slack_user['id']
        slack_name = slack_user.get('real_name', slack_user.get('name', ''))

        # Update record - joined
        record.slack_user_id = slack_user_id
        record.slack_joined = True
        record.slack_joined_at = timezone.now()
        record.save()

        # Send AI-generated welcome message
        welcome_result = services.send_welcome_message(slack_user_id, candidate)
        record.welcome_message_sent = True
        record.save()

        # Notify HR channel
        hr_result = services.notify_hr_channel(candidate)
        record.hr_notified = True
        record.save()

        # Update candidate status to Onboarded
        if candidate.status == 'Hired':
            candidate.status = 'Onboarded'
            candidate.save()

        logger.info("Onboarding completed for %s (Slack: %s)", candidate.full_name, slack_name)

        return Response({
            'message': f'Onboarding completed! {candidate.full_name} found in Slack as {slack_name}.',
            'joined': True,
            'welcome_sent': welcome_result.get('ok', False),
            'hr_notified': hr_result.get('ok', False),
            'record': OnboardingRecordSerializer(record).data,
        })
