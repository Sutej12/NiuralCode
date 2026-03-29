import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def send_role_status_email(candidate, job, new_status):
    """Notify a candidate that the role they applied to has been closed or paused."""
    from django.core.mail import EmailMultiAlternatives

    from_email = getattr(settings, 'FROM_EMAIL', 'noreply@example.com')
    job_title = job.title

    if new_status == 'Closed':
        subject = f"Update on Your Application - {job_title}"
        status_line = (
            f'the <strong>{job_title}</strong> position has been closed '
            'and is no longer accepting applications'
        )
        status_extra = (
            'While this particular role is no longer available, we were impressed '
            'by your profile and will keep your application on file. Should a similar '
            'position open in the future, we will reach out to you.'
        )
    else:
        subject = f"Update on Your Application - {job_title}"
        status_line = (
            f'the <strong>{job_title}</strong> position has been temporarily '
            'put on hold'
        )
        status_extra = (
            'This does not reflect on your candidacy in any way. We will keep '
            'your application on file, and if the position reopens or a similar '
            'role becomes available, we will be in touch.'
        )

    text_body = (
        f"Dear {candidate.full_name},\n\n"
        f"We wanted to let you know that {job_title} position has been "
        f"{'closed' if new_status == 'Closed' else 'put on hold'}.\n\n"
        f"{'While this role is no longer available' if new_status == 'Closed' else 'This does not reflect on your candidacy'}, "
        f"we will keep your application on file for similar future opportunities.\n\n"
        f"Thank you for your interest and patience.\n\n"
        f"Best regards,\nThe Hiring Team"
    )

    html_body = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 56px; height: 56px; background: {'#fee2e2' if new_status == 'Closed' else '#fef3c7'}; border-radius: 50%; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 28px; line-height: 56px;">{'📋' if new_status == 'Closed' else '⏸️'}</span>
                </div>
                <h2 style="color: #1a1a2e; margin: 0;">Position Update</h2>
            </div>
            <p style="color: #374151; line-height: 1.6;">Dear {candidate.full_name},</p>
            <p style="color: #374151; line-height: 1.6;">
                We wanted to reach out to let you know that {status_line}.
            </p>
            <p style="color: #374151; line-height: 1.6;">
                {status_extra}
            </p>
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 13px; margin: 0; line-height: 1.6;">
                    <strong>Your application is safe.</strong> Your resume and profile will remain
                    in our talent pool, and you will be considered for future opportunities
                    that match your skills and experience.
                </p>
            </div>
            <p style="color: #374151; line-height: 1.6;">
                Thank you for your interest and patience throughout this process.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #374151; line-height: 1.6; margin-bottom: 0;">
                Best regards,<br/>
                <strong>The Hiring Team</strong>
            </p>
        </div>
    </div>
    """

    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=from_email,
            to=[candidate.email],
        )
        email.attach_alternative(html_body, 'text/html')
        email.send(fail_silently=False)
        logger.info(
            f"Role status email ({new_status}) sent to {candidate.email} "
            f"for job '{job_title}'"
        )
    except Exception as e:
        logger.error(f"Failed to send role status email to {candidate.email}: {e}")
        logger.info(
            f"[EMAIL FALLBACK] To: {candidate.email}\n"
            f"Subject: {subject}\n{text_body}"
        )
