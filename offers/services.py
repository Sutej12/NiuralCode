import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def generate_offer_letter(candidate, offer_details):
    """
    Use OpenAI to generate a professional offer letter in HTML.
    Falls back to a template if API key is missing.
    """
    api_key = getattr(settings, 'OPENAI_API_KEY', '')

    context = {
        'candidate_name': candidate.full_name,
        'job_title': offer_details.get('job_title', ''),
        'start_date': offer_details.get('start_date', ''),
        'base_salary': offer_details.get('base_salary', ''),
        'equity': offer_details.get('equity', ''),
        'bonus': offer_details.get('bonus', ''),
        'reporting_manager': offer_details.get('reporting_manager', ''),
        'custom_terms': offer_details.get('custom_terms', ''),
    }

    if not api_key:
        logger.info("[MOCK] No OPENAI_API_KEY. Using template offer letter.")
        return _template_offer_letter(context)

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)

        prompt = f"""Generate a professional offer letter in HTML format with the following details:

Candidate Name: {context['candidate_name']}
Job Title: {context['job_title']}
Start Date: {context['start_date']}
Base Salary: ${context['base_salary']}
Equity: {context['equity'] or 'N/A'}
Bonus: {context['bonus'] or 'N/A'}
Reporting Manager: {context['reporting_manager']}
Custom Terms: {context['custom_terms'] or 'None'}

Requirements:
- Use clean, professional HTML with inline CSS
- Include company header placeholder
- Include sections: greeting, position details, compensation, benefits overview, terms, signature block
- Make it look polished and corporate
- Include a placeholder for the candidate's signature at the bottom
- Return ONLY the HTML, no markdown fences"""

        response = client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {
                    'role': 'system',
                    'content': (
                        'You are an expert HR professional who creates '
                        'polished, legally-sound offer letters.'
                    ),
                },
                {'role': 'user', 'content': prompt},
            ],
            temperature=0.4,
        )

        content = response.choices[0].message.content.strip()
        if content.startswith('```'):
            content = content.split('\n', 1)[1]
            content = content.rsplit('```', 1)[0]
        return content

    except Exception as e:
        logger.warning("OpenAI offer letter generation failed: %s", e)
        return _template_offer_letter(context)


def _template_offer_letter(context):
    """Generate a template-based offer letter as fallback."""
    return f"""<!DOCTYPE html>
<html>
<head><style>
    body {{ font-family: 'Georgia', serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; }}
    .header {{ text-align: center; border-bottom: 2px solid #2c3e50; padding-bottom: 20px; margin-bottom: 30px; }}
    .header h1 {{ color: #2c3e50; margin: 0; }}
    .date {{ text-align: right; color: #666; margin-bottom: 20px; }}
    h2 {{ color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 8px; }}
    .compensation-table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
    .compensation-table td {{ padding: 10px; border-bottom: 1px solid #eee; }}
    .compensation-table td:first-child {{ font-weight: bold; width: 200px; }}
    .signature-block {{ margin-top: 50px; }}
    .signature-line {{ border-top: 1px solid #333; width: 300px; margin-top: 40px; padding-top: 5px; }}
</style></head>
<body>
    <div class="header">
        <h1>Offer of Employment</h1>
        <p>Confidential</p>
    </div>

    <p>Dear {context['candidate_name']},</p>

    <p>We are thrilled to extend an offer of employment for the position of
    <strong>{context['job_title']}</strong>. After careful consideration, we believe
    your skills and experience make you an excellent fit for our team.</p>

    <h2>Position Details</h2>
    <table class="compensation-table">
        <tr><td>Position</td><td>{context['job_title']}</td></tr>
        <tr><td>Start Date</td><td>{context['start_date']}</td></tr>
        <tr><td>Reporting To</td><td>{context['reporting_manager']}</td></tr>
    </table>

    <h2>Compensation</h2>
    <table class="compensation-table">
        <tr><td>Base Salary</td><td>${context['base_salary']} per year</td></tr>
        <tr><td>Equity</td><td>{context['equity'] or 'N/A'}</td></tr>
        <tr><td>Bonus</td><td>{context['bonus'] or 'N/A'}</td></tr>
    </table>

    <h2>Benefits</h2>
    <p>You will be eligible for our comprehensive benefits package including health
    insurance, dental and vision coverage, 401(k) with company match, and paid time off.</p>

    {'<h2>Additional Terms</h2><p>' + context["custom_terms"] + '</p>' if context["custom_terms"] else ''}

    <h2>Terms of Employment</h2>
    <p>This offer is contingent upon successful completion of background verification.
    Employment is at-will and may be terminated by either party at any time.</p>

    <p>Please indicate your acceptance by signing below. This offer is valid for 7 business days.</p>

    <div class="signature-block">
        <p>We look forward to welcoming you to the team!</p>
        <p>Sincerely,<br>The Hiring Team</p>

        <div class="signature-line">
            <p>Candidate Signature</p>
        </div>
        <p>Date: _______________</p>
    </div>
</body>
</html>"""


def send_offer_email(offer):
    """Send offer letter to candidate via email with HTML content."""
    site_url = getattr(settings, 'SITE_URL', 'http://localhost:5173')
    sign_url = f"{site_url}/candidate/offer/{offer.candidate.id}"

    plain_body = (
        f"Dear {offer.candidate.full_name},\n\n"
        f"We are pleased to extend you an offer for the position of "
        f"{offer.job_title}.\n\n"
        f"Please review and sign your offer letter at:\n{sign_url}\n\n"
        f"This offer is valid for 7 business days.\n\n"
        f"Best regards,\nThe Hiring Team"
    )

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Offer of Employment</h2>
        <p>Dear {offer.candidate.full_name},</p>
        <p>We are pleased to extend you an offer for the position of <strong>{offer.job_title}</strong>.</p>
        <p>Please review and sign your offer letter by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{sign_url}" style="display: inline-block; padding: 14px 32px;
               background: #4f46e5; color: #fff; text-decoration: none;
               border-radius: 8px; font-weight: 600; font-size: 16px;">
                Review & Sign Offer
            </a>
        </div>
        <p style="color: #6b7280; font-size: 13px;">This offer is valid for 7 business days.</p>
        <p>Best regards,<br>The Hiring Team</p>
    </div>
    """

    body = plain_body

    try:
        from django.core.mail import EmailMultiAlternatives

        msg = EmailMultiAlternatives(
            subject=f"Your Offer Letter — {offer.job_title}",
            body=body,
            from_email=getattr(settings, 'FROM_EMAIL', 'noreply@example.com'),
            to=[offer.candidate.email],
        )
        msg.attach_alternative(html_body, "text/html")
        msg.send(fail_silently=False)
        logger.info("Offer email sent to %s", offer.candidate.email)
    except Exception as e:
        logger.warning(
            "Failed to send offer email to %s: %s", offer.candidate.email, e
        )
        logger.info(
            "[MOCK] Offer email for %s:\n%s", offer.candidate.email, body
        )


def notify_offer_signed(offer):
    """Send notification when an offer is signed."""
    body = (
        f"Offer letter signed!\n\n"
        f"Candidate: {offer.candidate.full_name}\n"
        f"Position: {offer.job_title}\n"
        f"Signed at: {offer.signed_at}\n"
        f"Signer IP: {offer.signer_ip}\n"
    )

    try:
        from_email = getattr(settings, 'FROM_EMAIL', 'noreply@example.com')
        send_mail(
            subject=f"Offer Signed — {offer.candidate.full_name}",
            message=body,
            from_email=from_email,
            recipient_list=[from_email],
            fail_silently=False,
        )
        logger.info("Offer signed notification sent for %s", offer.candidate.full_name)
    except Exception as e:
        logger.warning("Failed to send signed notification: %s", e)
        logger.info("[MOCK] Offer signed notification:\n%s", body)
