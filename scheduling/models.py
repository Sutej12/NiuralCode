from django.db import models
from django.db.models import Q


class InterviewSlot(models.Model):
    STATUS_CHOICES = [
        ('tentative', 'Tentative'),
        ('confirmed', 'Confirmed'),
        ('released', 'Released'),
        ('cancelled', 'Cancelled'),
    ]

    candidate = models.ForeignKey(
        'candidates.Candidate',
        on_delete=models.CASCADE,
        related_name='interview_slots',
    )
    interviewer_email = models.EmailField()
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='tentative',
    )
    google_event_id = models.CharField(max_length=255, blank=True)
    meet_link = models.URLField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['start_time']
        constraints = [
            models.UniqueConstraint(
                name='no_overlapping_confirmed_slots',
                fields=['interviewer_email', 'start_time'],
                condition=Q(status='confirmed'),
            ),
        ]

    def __str__(self):
        return (
            f"{self.candidate} - {self.interviewer_email} "
            f"({self.start_time:%Y-%m-%d %H:%M})"
        )


class SchedulingRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('slots_sent', 'Slots Sent'),
        ('confirmed', 'Confirmed'),
        ('reschedule_requested', 'Reschedule Requested'),
        ('rescheduling', 'Rescheduling'),
        ('expired', 'Expired'),
    ]

    candidate = models.OneToOneField(
        'candidates.Candidate',
        on_delete=models.CASCADE,
        related_name='scheduling_request',
    )
    interviewer_email = models.EmailField(blank=True, default='')
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
    )
    slots_sent_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    follow_up_sent = models.BooleanField(default=False)
    preferred_date = models.CharField(max_length=20, blank=True, default='')
    preferred_time = models.CharField(max_length=20, blank=True, default='')
    candidate_note = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Scheduling for {self.candidate} - {self.status}"
