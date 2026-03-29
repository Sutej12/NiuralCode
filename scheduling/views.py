from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from candidates.models import Candidate

from .models import InterviewSlot, SchedulingRequest
from .serializers import InterviewSlotSerializer, SchedulingRequestSerializer
from . import services


class SchedulingViewSet(viewsets.ViewSet):
    """Handles interview scheduling workflows."""

    def list(self, request):
        """List all scheduling requests."""
        qs = SchedulingRequest.objects.select_related('candidate').all()
        serializer = SchedulingRequestSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='send-slots')
    def send_slots(self, request):
        """Generate 3-5 available 45-min slots and send to candidate."""
        candidate_id = request.data.get('candidate_id')
        interviewer_email = request.data.get(
            'interviewer_email', 'interviewer@company.com'
        )
        candidate = get_object_or_404(Candidate, pk=candidate_id)

        # Get or create scheduling request; store interviewer email
        sched_req, _ = SchedulingRequest.objects.get_or_create(
            candidate=candidate
        )
        sched_req.interviewer_email = interviewer_email

        # Release any existing tentative slots for this candidate
        old_slots = InterviewSlot.objects.filter(
            candidate=candidate, status='tentative'
        )
        for slot in old_slots:
            services.release_slot(slot)
            slot.status = 'released'
            slot.save()

        # Generate available slots from Google Calendar
        available = services.get_available_slots(interviewer_email, num_slots=5)

        created_slots = []
        for start, end in available:
            event_id, slot_meet_link = services.block_tentative_slot(
                interviewer_email, start, end, candidate.full_name
            )
            slot = InterviewSlot.objects.create(
                candidate=candidate,
                interviewer_email=interviewer_email,
                start_time=start,
                end_time=end,
                status='tentative',
                google_event_id=event_id,
                meet_link=slot_meet_link,
            )
            created_slots.append(slot)

        # Send email to candidate with slot selection link
        services.send_scheduling_email(candidate, created_slots)

        # Update scheduling request
        sched_req.status = 'slots_sent'
        sched_req.slots_sent_at = timezone.now()
        sched_req.save()

        serializer = InterviewSlotSerializer(created_slots, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='confirm-slot')
    def confirm_slot(self, request):
        """Confirm a specific slot and release all others for this candidate."""
        slot_id = request.data.get('slot_id')
        slot = get_object_or_404(InterviewSlot, pk=slot_id)

        if slot.status != 'tentative':
            return Response(
                {'error': f'Slot is {slot.status}, cannot confirm.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Confirm the selected slot
        slot.status = 'confirmed'
        slot.save()
        services.confirm_calendar_slot(slot)

        # Release all other tentative slots for this candidate
        _release_other_slots(slot)

        # Update scheduling request
        _update_sched_request(slot.candidate, 'confirmed')

        # Update candidate status to In Interview
        candidate = slot.candidate
        if candidate.status in ('Shortlisted', 'Screened'):
            candidate.status = 'In Interview'
            candidate.save()

        serializer = InterviewSlotSerializer(slot)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='request-reschedule')
    def request_reschedule(self, request):
        """
        Candidate requests a different time.
        Saves the request and notifies the interviewer via the bell notification.
        The interviewer can then approve or reject from the dashboard.
        """
        candidate_id = request.data.get('candidate_id')
        preferred_date = request.data.get('preferred_date', '')
        preferred_time = request.data.get('preferred_time', '')
        note = request.data.get('note', '')

        candidate = get_object_or_404(Candidate, pk=candidate_id)
        sched_req = SchedulingRequest.objects.filter(candidate=candidate).first()

        if not sched_req:
            return Response(
                {'error': 'No scheduling request found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Save the candidate's preference and mark as reschedule_requested
        sched_req.status = 'reschedule_requested'
        sched_req.preferred_date = preferred_date
        sched_req.preferred_time = preferred_time
        sched_req.candidate_note = note
        sched_req.save()

        return Response({
            'message': 'Your request has been submitted. The interviewer will review and respond shortly.',
            'status': 'reschedule_requested',
        })

    @action(detail=False, methods=['post'], url_path='interviewer-approve')
    def interviewer_approve(self, request):
        """
        Interviewer approves or rejects a candidate's reschedule request.
        - Approved: AI finds slots matching candidate's preferred time and sends them.
        - Rejected: AI fetches next available calendar slots and sends them instead.
        """
        candidate_id = request.data.get('candidate_id')
        approved = request.data.get('approved', True)
        candidate = get_object_or_404(Candidate, pk=candidate_id)

        sched_req = SchedulingRequest.objects.filter(candidate=candidate).first()
        if not sched_req:
            return Response(
                {'error': 'No scheduling request found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        interviewer_email = sched_req.interviewer_email or ''
        if not interviewer_email:
            last_slot = InterviewSlot.objects.filter(
                candidate=candidate
            ).order_by('-created_at').first()
            if last_slot:
                interviewer_email = last_slot.interviewer_email

        # Release any current tentative slots
        current_slots = InterviewSlot.objects.filter(
            candidate=candidate, status='tentative'
        )
        for slot in current_slots:
            services.release_slot(slot)
            slot.status = 'cancelled'
            slot.save()

        if approved:
            # Use AI to find slots matching candidate's preferred time
            alternative_slots = services.find_alternative_slots(
                interviewer_email=interviewer_email,
                preferred_date=sched_req.preferred_date,
                preferred_time=sched_req.preferred_time,
                candidate_note=sched_req.candidate_note,
                num_slots=5,
            )
            message = 'Request approved. New slots matching candidate preference sent.'
        else:
            # Fetch next available slots from calendar (ignore candidate preference)
            alternative_slots = services.get_available_slots(
                interviewer_email, num_slots=5
            )
            message = 'Request rejected. Next available slots from your calendar sent to candidate.'

        # Create new tentative slots
        created_slots = []
        for start, end in alternative_slots:
            event_id, slot_meet_link = services.block_tentative_slot(
                interviewer_email, start, end, candidate.full_name
            )
            slot = InterviewSlot.objects.create(
                candidate=candidate,
                interviewer_email=interviewer_email,
                start_time=start,
                end_time=end,
                status='tentative',
                google_event_id=event_id,
                meet_link=slot_meet_link,
            )
            created_slots.append(slot)

        # Send new slots to candidate
        services.send_scheduling_email(candidate, created_slots)

        # Update scheduling request
        sched_req.status = 'slots_sent'
        sched_req.slots_sent_at = timezone.now()
        sched_req.preferred_date = ''
        sched_req.preferred_time = ''
        sched_req.candidate_note = ''
        sched_req.save()

        return Response({
            'message': message,
            'slots': InterviewSlotSerializer(created_slots, many=True).data,
        })

    @action(detail=False, methods=['post'], url_path='follow-up')
    def follow_up(self, request):
        """Send a follow-up email to candidate who hasn't responded to scheduling."""
        candidate_id = request.data.get('candidate_id')
        candidate = get_object_or_404(Candidate, pk=candidate_id)

        sched_req = SchedulingRequest.objects.filter(candidate=candidate).first()
        if not sched_req:
            return Response(
                {'error': 'No scheduling request found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check there are tentative slots waiting
        tentative_slots = InterviewSlot.objects.filter(
            candidate=candidate, status='tentative'
        )
        if not tentative_slots.exists():
            return Response(
                {'error': 'No pending slots to follow up on.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Send follow-up email
        services.send_follow_up_email(candidate, list(tentative_slots))

        # Mark follow-up sent
        sched_req.follow_up_sent = True
        sched_req.save()

        return Response({
            'message': f'Follow-up email sent to {candidate.email}.',
        })

    @action(detail=False, methods=['get'], url_path='candidate-slots/(?P<candidate_id>[^/.]+)')
    def candidate_slots(self, request, candidate_id=None):
        """Public endpoint: get available slots for a candidate."""
        candidate = get_object_or_404(Candidate, pk=candidate_id)
        slots = InterviewSlot.objects.filter(
            candidate=candidate, status__in=['tentative', 'confirmed']
        )
        serializer = InterviewSlotSerializer(slots, many=True)
        confirmed = slots.filter(status='confirmed').first()
        return Response({
            'candidate_name': candidate.full_name,
            'confirmed': confirmed is not None,
            'confirmed_slot': InterviewSlotSerializer(confirmed).data if confirmed else None,
            'slots': serializer.data,
        })

    @action(detail=False, methods=['post'], url_path='candidate-select')
    def candidate_select(self, request):
        """Public endpoint for candidate to select a slot."""
        slot_id = request.data.get('slot_id')
        slot = get_object_or_404(InterviewSlot, pk=slot_id)

        if slot.status != 'tentative':
            return Response(
                {'error': 'This slot is no longer available.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Confirm selected slot on Google Calendar
        slot.status = 'confirmed'
        slot.save()
        services.confirm_calendar_slot(slot)

        # Release other tentative slots
        _release_other_slots(slot)

        # Update scheduling request
        _update_sched_request(slot.candidate, 'confirmed')

        # Update candidate status to In Interview
        candidate = slot.candidate
        if candidate.status in ('Shortlisted', 'Screened'):
            candidate.status = 'In Interview'
            candidate.save()

        # Notify interviewer about the confirmed slot
        services.send_interviewer_confirmation_email(slot)

        serializer = InterviewSlotSerializer(slot)
        return Response({
            'message': 'Interview confirmed!',
            'slot': serializer.data,
        })


def _release_other_slots(confirmed_slot):
    """Release all other tentative slots for the same candidate."""
    other_slots = InterviewSlot.objects.filter(
        candidate=confirmed_slot.candidate, status='tentative'
    ).exclude(pk=confirmed_slot.pk)
    for other in other_slots:
        services.release_slot(other)
        other.status = 'released'
        other.save()


def _update_sched_request(candidate, new_status):
    """Update the scheduling request status."""
    sched_req = SchedulingRequest.objects.filter(candidate=candidate).first()
    if sched_req:
        sched_req.status = new_status
        if new_status == 'confirmed':
            sched_req.confirmed_at = timezone.now()
        sched_req.save()
