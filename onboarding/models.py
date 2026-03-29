from django.db import models


class OnboardingRecord(models.Model):
    candidate = models.OneToOneField(
        'candidates.Candidate',
        on_delete=models.CASCADE,
        related_name='onboarding_record',
    )
    slack_invite_sent = models.BooleanField(default=False)
    slack_invite_sent_at = models.DateTimeField(null=True, blank=True)
    slack_user_id = models.CharField(max_length=255, blank=True)
    slack_joined = models.BooleanField(default=False)
    slack_joined_at = models.DateTimeField(null=True, blank=True)
    welcome_message_sent = models.BooleanField(default=False)
    hr_notified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Onboarding: {self.candidate}"
