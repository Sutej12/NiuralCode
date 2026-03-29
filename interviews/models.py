from django.db import models


class Interview(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    candidate = models.ForeignKey(
        'candidates.Candidate',
        on_delete=models.CASCADE,
        related_name='interviews',
    )
    slot = models.OneToOneField(
        'scheduling.InterviewSlot',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='interview',
    )
    meeting_link = models.URLField(blank=True)
    transcript = models.TextField(blank=True)
    summary = models.TextField(blank=True)
    ai_feedback = models.JSONField(null=True, blank=True)
    live_lines = models.JSONField(default=list, blank=True)
    notetaker_meeting_id = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='scheduled',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Interview: {self.candidate} ({self.status})"
