from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Interview
from .serializers import InterviewSerializer
from . import services


class InterviewViewSet(viewsets.ModelViewSet):
    """Manage interviews and AI-powered transcript analysis."""

    queryset = Interview.objects.select_related('candidate', 'slot').all()
    serializer_class = InterviewSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        candidate_id = self.request.query_params.get('candidate')
        if candidate_id:
            qs = qs.filter(candidate_id=candidate_id)
        return qs

    @action(detail=True, methods=['post'], url_path='fetch-transcript')
    def fetch_transcript(self, request, pk=None):
        """Fetch transcript from Fireflies.ai or return mock data."""
        interview = self.get_object()
        meeting_id = (
            request.data.get('meeting_id')
            or interview.notetaker_meeting_id
        )

        if not meeting_id:
            # Use mock if no meeting ID provided
            result = services.mock_transcript()
        else:
            result = services.fetch_fireflies_transcript(meeting_id)

        interview.transcript = result.get('transcript', '')
        interview.summary = result.get('summary', '')
        if meeting_id:
            interview.notetaker_meeting_id = meeting_id
        interview.status = 'completed'
        interview.save()

        serializer = self.get_serializer(interview)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='save-transcript')
    def save_transcript(self, request, pk=None):
        """Save a live-recorded transcript from the browser speech API."""
        interview = self.get_object()
        transcript = request.data.get('transcript', '')

        if not transcript.strip():
            return Response(
                {'error': 'Transcript is empty.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Append to existing transcript if any
        if interview.transcript:
            interview.transcript += '\n\n--- (continued) ---\n\n' + transcript
        else:
            interview.transcript = transcript

        interview.status = 'completed'
        interview.save()

        serializer = self.get_serializer(interview)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='append-line')
    def append_line(self, request, pk=None):
        """Append a single transcript line from either interviewer or candidate."""
        interview = self.get_object()
        speaker = request.data.get('speaker', 'Unknown')
        text = request.data.get('text', '').strip()
        timestamp = request.data.get('timestamp', '')

        if not text:
            return Response(
                {'error': 'Text is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        line = {
            'speaker': speaker,
            'text': text,
            'timestamp': timestamp,
        }

        if not interview.live_lines:
            interview.live_lines = []
        interview.live_lines.append(line)

        if interview.status == 'scheduled':
            interview.status = 'in_progress'

        interview.save()
        return Response({'ok': True, 'line_count': len(interview.live_lines)})

    @action(detail=True, methods=['get'], url_path='live-lines')
    def live_lines(self, request, pk=None):
        """Get all live transcript lines. Supports ?since=N to get only new lines."""
        interview = self.get_object()
        since = int(request.query_params.get('since', 0))
        lines = interview.live_lines or []
        return Response({
            'lines': lines[since:],
            'total': len(lines),
        })

    @action(detail=True, methods=['post'], url_path='finalize-transcript')
    def finalize_transcript(self, request, pk=None):
        """Finalize the interview transcript.
        Prefers local_transcript from the interviewer's browser (which already
        includes polled candidate lines). Falls back to live_lines from the DB."""
        interview = self.get_object()
        local_transcript = request.data.get('local_transcript', '').strip()
        lines = interview.live_lines or []

        if local_transcript:
            # The local transcript already has both interviewer + candidate lines
            # (interviewer's browser polls and merges them)
            final_text = local_transcript
        elif lines:
            # Fallback: build from shared live_lines
            final_text = '\n'.join(
                f"[{l.get('timestamp', '??:??')}] {l['speaker']}: {l['text']}"
                for l in lines
            )
        else:
            return Response(
                {'error': 'No transcript lines to finalize.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if interview.transcript:
            interview.transcript += '\n\n--- (live session) ---\n\n' + final_text
        else:
            interview.transcript = final_text

        # Clear live_lines after finalizing
        interview.live_lines = []
        interview.status = 'completed'
        interview.save()

        serializer = self.get_serializer(interview)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='analyze-interview')
    def analyze_interview(self, request, pk=None):
        """AI analyzes transcript and generates structured feedback."""
        interview = self.get_object()

        if not interview.transcript:
            return Response(
                {'error': 'No transcript available. Fetch transcript first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        feedback = services.analyze_transcript(interview)
        interview.ai_feedback = feedback
        interview.save()

        serializer = self.get_serializer(interview)
        return Response(serializer.data)
