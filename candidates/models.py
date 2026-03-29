from django.db import models


class Candidate(models.Model):
    STATUS_CHOICES = [
        ('Applied', 'Applied'),
        ('Screened', 'Screened'),
        ('Shortlisted', 'Shortlisted'),
        ('In Interview', 'In Interview'),
        ('Offer', 'Offer'),
        ('Hired', 'Hired'),
        ('Onboarded', 'Onboarded'),
        ('Rejected', 'Rejected'),
    ]

    full_name = models.CharField(max_length=255)
    email = models.EmailField()
    linkedin_url = models.URLField(blank=True)
    portfolio_url = models.URLField(blank=True)
    job = models.ForeignKey(
        'jobs.Job',
        on_delete=models.CASCADE,
        related_name='candidates',
    )
    resume = models.FileField(upload_to='resumes/')
    referral_code = models.CharField(max_length=50, blank=True, default='')
    is_referred = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='Applied',
    )
    ai_score = models.IntegerField(null=True, blank=True)
    ai_rationale = models.TextField(blank=True)
    parsed_resume = models.JSONField(null=True, blank=True)
    research_profile = models.JSONField(null=True, blank=True)
    candidate_brief = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('email', 'job')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.full_name} - {self.job}"

    def save(self, *args, **kwargs):
        # Track status changes for existing candidates
        if self.pk:
            try:
                old = Candidate.objects.get(pk=self.pk)
                if old.status != self.status:
                    # Save first so the FK reference is valid
                    super().save(*args, **kwargs)
                    StatusHistory.objects.create(
                        candidate=self,
                        old_status=old.status,
                        new_status=self.status,
                    )
                    return
            except Candidate.DoesNotExist:
                pass
        super().save(*args, **kwargs)


class StatusHistory(models.Model):
    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name='status_history',
    )
    old_status = models.CharField(max_length=20)
    new_status = models.CharField(max_length=20)
    note = models.TextField(blank=True)
    changed_by = models.CharField(max_length=100, default='system')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Status histories'

    def __str__(self):
        return f"{self.candidate.full_name}: {self.old_status} -> {self.new_status}"
