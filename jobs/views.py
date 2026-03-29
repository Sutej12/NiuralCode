import threading

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Job
from .serializers import JobSerializer


class JobViewSet(viewsets.ModelViewSet):
    """
    Public users can list and retrieve open jobs.
    Admin users have full CRUD access.
    """

    queryset = Job.objects.all()
    serializer_class = JobSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "close_or_hold", "update", "partial_update"):
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset()
        # Admin dashboard passes ?all=true to see every status;
        # write actions (update, partial_update, close_or_hold) need full queryset
        show_all = self.request.query_params.get('all', '').lower() == 'true'
        if show_all or self.action in (
            'update', 'partial_update', 'close_or_hold', 'destroy',
        ):
            return qs
        # Non-admin users only see open jobs on the public listing and detail
        if not (self.request.user and self.request.user.is_staff):
            qs = qs.filter(status=Job.Status.OPEN)
        return qs

    @action(detail=True, methods=['post'], url_path='close-or-hold')
    def close_or_hold(self, request, pk=None):
        """Close or put a job on hold, and notify active candidates via email."""
        job = self.get_object()
        new_status = request.data.get('status')

        if new_status not in ('Paused', 'Closed'):
            return Response(
                {'error': 'Status must be "Paused" or "Closed".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if job.status == new_status:
            return Response(
                {'error': f'Job is already {new_status.lower()}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = job.status
        job.status = new_status
        job.save()

        # Notify active candidates (exclude Hired, Onboarded, Rejected)
        from candidates.models import Candidate
        from .services import send_role_status_email

        excluded = ('Hired', 'Onboarded', 'Rejected')
        active_candidates = Candidate.objects.filter(job=job).exclude(
            status__in=excluded
        )

        notified_count = active_candidates.count()

        for candidate in active_candidates:
            threading.Thread(
                target=send_role_status_email,
                args=(candidate, job, new_status),
                daemon=True,
            ).start()

        serializer = self.get_serializer(job)
        return Response({
            **serializer.data,
            'notified_count': notified_count,
            'message': (
                f'Job {new_status.lower()} successfully. '
                f'{notified_count} active candidate(s) notified.'
            ),
        })
