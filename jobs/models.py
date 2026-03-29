from django.db import models


class Job(models.Model):
    class ExperienceLevel(models.TextChoices):
        ENTRY = "Entry", "Entry"
        MID = "Mid", "Mid"
        SENIOR = "Senior", "Senior"
        LEAD = "Lead", "Lead"

    class Status(models.TextChoices):
        OPEN = "Open", "Open"
        PAUSED = "Paused", "Paused"
        CLOSED = "Closed", "Closed"

    title = models.CharField(max_length=255)
    team = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    is_remote = models.BooleanField(default=False)
    experience_level = models.CharField(
        max_length=20,
        choices=ExperienceLevel.choices,
    )
    responsibilities = models.TextField()
    requirements = models.TextField()
    description = models.TextField(help_text="Full job description")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.team})"
