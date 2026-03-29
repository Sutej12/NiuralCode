from django.db import models


class OfferLetter(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending_review', 'Pending Review'),
        ('sent', 'Sent'),
        ('signed', 'Signed'),
        ('declined', 'Declined'),
    ]

    candidate = models.OneToOneField(
        'candidates.Candidate',
        on_delete=models.CASCADE,
        related_name='offer_letter',
    )
    job_title = models.CharField(max_length=255)
    start_date = models.DateField()
    base_salary = models.DecimalField(max_digits=12, decimal_places=2)
    equity = models.CharField(max_length=255, blank=True)
    bonus = models.CharField(max_length=255, blank=True)
    reporting_manager = models.CharField(max_length=255)
    custom_terms = models.TextField(blank=True)
    content = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
    )
    signed_at = models.DateTimeField(null=True, blank=True)
    signature_data = models.TextField(blank=True)
    signer_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Offer: {self.candidate} - {self.job_title} ({self.status})"
