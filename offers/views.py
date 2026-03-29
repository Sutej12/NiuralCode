from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from candidates.models import Candidate

from .models import OfferLetter
from .serializers import OfferLetterSerializer, OfferSignSerializer
from . import services


class OfferLetterViewSet(viewsets.ModelViewSet):
    """Manage offer letters with AI generation and e-signing."""

    queryset = OfferLetter.objects.select_related('candidate').all()
    serializer_class = OfferLetterSerializer

    def perform_create(self, serializer):
        """Generate offer letter content via AI on creation."""
        offer = serializer.save()
        candidate = offer.candidate

        offer_details = {
            'job_title': offer.job_title,
            'start_date': str(offer.start_date),
            'base_salary': str(offer.base_salary),
            'equity': offer.equity,
            'bonus': offer.bonus,
            'reporting_manager': offer.reporting_manager,
            'custom_terms': offer.custom_terms,
        }

        content = services.generate_offer_letter(candidate, offer_details)
        offer.content = content
        offer.save()

    @action(detail=True, methods=['post'], url_path='send-offer')
    def send_offer(self, request, pk=None):
        """Send the offer letter to the candidate via email."""
        offer = self.get_object()

        if not offer.content:
            return Response(
                {'error': 'Offer letter content has not been generated.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        offer.status = 'sent'
        offer.save()

        services.send_offer_email(offer)

        serializer = self.get_serializer(offer)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='sign-offer')
    def sign_offer(self, request, pk=None):
        """Public endpoint for candidate to sign the offer letter."""
        offer = self.get_object()

        if offer.status not in ('sent', 'pending_review'):
            return Response(
                {'error': f'Offer cannot be signed in state: {offer.status}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sign_serializer = OfferSignSerializer(data=request.data)
        sign_serializer.is_valid(raise_exception=True)

        offer.signature_data = sign_serializer.validated_data['signature_data']
        offer.signed_at = timezone.now()
        offer.signer_ip = self._get_client_ip(request)
        offer.status = 'signed'
        offer.save()

        # Update candidate status
        offer.candidate.status = 'Hired'
        offer.candidate.save()

        services.notify_offer_signed(offer)

        # Auto-trigger Slack onboarding
        try:
            from onboarding.models import OnboardingRecord
            from onboarding.services import send_slack_invite

            record, _ = OnboardingRecord.objects.get_or_create(
                candidate=offer.candidate
            )
            if not record.slack_invite_sent:
                send_slack_invite(offer.candidate, record)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                "Auto Slack onboarding failed: %s", e
            )

        serializer = self.get_serializer(offer)
        return Response({
            'message': 'Offer signed successfully!',
            'offer': serializer.data,
        })

    @action(detail=False, methods=['get'], url_path='candidate/(?P<candidate_id>[^/.]+)')
    def candidate_offer(self, request, candidate_id=None):
        """Public endpoint: get offer for a candidate."""
        candidate = get_object_or_404(Candidate, pk=candidate_id)
        offer = get_object_or_404(OfferLetter, candidate=candidate)
        serializer = self.get_serializer(offer)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='preview')
    def preview(self, request, pk=None):
        """Render offer letter HTML for preview."""
        offer = self.get_object()

        if not offer.content:
            return Response(
                {'error': 'Offer letter content has not been generated.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return HttpResponse(offer.content, content_type='text/html')

    @staticmethod
    def _get_client_ip(request):
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded:
            return x_forwarded.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
