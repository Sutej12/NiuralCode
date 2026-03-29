import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)


def send_slack_invite(candidate):
    """
    Send the candidate an email with the Slack workspace invite link.
    Since admin.invites:write requires Enterprise Grid, we email the
    shareable invite link instead.
    """
    invite_link = getattr(settings, 'SLACK_INVITE_LINK', '')
    from_email = getattr(settings, 'FROM_EMAIL', 'noreply@example.com')

    if not invite_link:
        logger.info("[MOCK] No SLACK_INVITE_LINK configured. Would send Slack invite to %s", candidate.email)
        return {'ok': True, 'mock': True}

    job_title = candidate.job.title if candidate.job else 'your new role'

    plain_body = (
        f"Dear {candidate.full_name},\n\n"
        f"Congratulations on accepting your offer for {job_title}! "
        f"We'd love for you to join our team on Slack.\n\n"
        f"Click the link below to join our workspace:\n{invite_link}\n\n"
        f"Once you join, our bot will send you a personalized welcome message "
        f"with everything you need to get started.\n\n"
        f"Welcome aboard!\nThe Hiring Team"
    )

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Welcome to the Team! 🎉</h2>
        <p>Dear {candidate.full_name},</p>
        <p>Congratulations on accepting your offer for <strong>{job_title}</strong>!
           We'd love for you to join our team on Slack.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{invite_link}" style="display: inline-block; padding: 14px 32px;
               background: #4A154B; color: #fff; text-decoration: none;
               border-radius: 8px; font-weight: 600; font-size: 16px;">
                Join our Slack Workspace
            </a>
        </div>
        <p>Once you join, our bot will send you a personalized welcome message
           with everything you need to get started.</p>
        <p>Welcome aboard!<br>The Hiring Team</p>
    </div>
    """

    try:
        msg = EmailMultiAlternatives(
            subject=f"Join Our Slack Workspace — Welcome {candidate.full_name}!",
            body=plain_body,
            from_email=from_email,
            to=[candidate.email],
        )
        msg.attach_alternative(html_body, "text/html")
        msg.send(fail_silently=False)
        logger.info("Slack invite email sent to %s", candidate.email)
        return {'ok': True}
    except Exception as e:
        logger.warning("Failed to send Slack invite email: %s", e)
        return {'ok': False, 'error': str(e)}


def find_slack_user_by_email(email):
    """Look up a Slack user by their email address."""
    token = getattr(settings, 'SLACK_BOT_TOKEN', '')
    if not token:
        return None

    try:
        import requests
        response = requests.get(
            'https://slack.com/api/users.lookupByEmail',
            headers={'Authorization': f'Bearer {token}'},
            params={'email': email},
            timeout=10,
        )
        data = response.json()
        if data.get('ok'):
            return data['user']
        else:
            logger.info("Slack user lookup for %s: %s", email, data.get('error'))
            return None
    except Exception as e:
        logger.warning("Slack user lookup failed: %s", e)
        return None


def send_welcome_message(slack_user_id, candidate):
    """
    Generate a personalized welcome message using OpenAI and send via Slack DM.
    """
    token = getattr(settings, 'SLACK_BOT_TOKEN', '')
    api_key = getattr(settings, 'OPENAI_API_KEY', '')

    # Generate personalized welcome message
    message = _generate_welcome_message(candidate, api_key)

    if not token:
        logger.info("[MOCK] Would send welcome DM to %s:\n%s", slack_user_id, message)
        return {'ok': True, 'mock': True, 'message': message}

    try:
        import requests

        # Send as rich Slack message with blocks
        blocks = [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": f"Welcome, {candidate.full_name}! 🎉"}
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": message}
            },
            {"type": "divider"},
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Role:*\n{candidate.job.title if candidate.job else 'N/A'}"},
                    {"type": "mrkdwn", "text": f"*Start Date:*\n{'Check your offer letter'}"},
                ]
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        "📋 *Quick Links:*\n"
                        "• <#general|general> — Company-wide announcements\n"
                        "• Introduce yourself to the team!\n"
                        "• Reach out to your manager if you have questions"
                    )
                }
            },
        ]

        # Post welcome message in the #all-jarvis channel (public welcome)
        welcome_channel = getattr(settings, 'SLACK_WELCOME_CHANNEL_ID', '') or slack_user_id

        response = requests.post(
            'https://slack.com/api/chat.postMessage',
            headers={'Authorization': f'Bearer {token}'},
            json={
                'channel': welcome_channel,
                'text': f"Welcome to the team, {candidate.full_name}!",
                'blocks': blocks,
            },
            timeout=15,
        )
        data = response.json()
        if not data.get('ok'):
            logger.warning("Slack welcome message failed: %s", data.get('error'))
        else:
            logger.info("Welcome message sent to Slack user %s", slack_user_id)
        return data
    except Exception as e:
        logger.warning("Slack message API call failed: %s", e)
        return {'ok': False, 'error': str(e), 'mock': True}


def _generate_welcome_message(candidate, api_key):
    """Generate a personalized welcome message using OpenAI."""
    job_title = candidate.job.title if candidate.job else 'the team'

    if not api_key:
        return (
            f"Welcome to the team, {candidate.full_name}! 🎉\n\n"
            f"We're thrilled to have you joining us as *{job_title}*. "
            f"Feel free to introduce yourself in the team channel and don't "
            f"hesitate to ask any questions. Your onboarding buddy will reach out shortly!"
        )

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        # Pull extra context from candidate profile
        skills = ''
        if candidate.parsed_resume and candidate.parsed_resume.get('skills'):
            skills = ', '.join(candidate.parsed_resume['skills'][:5])

        # Get manager name from the offer letter
        manager_name = ''
        try:
            offer = candidate.offer_letter
            if offer and offer.reporting_manager:
                manager_name = offer.reporting_manager
        except Exception:
            pass

        prompt = (
            f"Write a warm, personalized Slack welcome message for a new hire.\n\n"
            f"Name: {candidate.full_name}\n"
            f"Role: {job_title}\n"
            f"Key Skills: {skills or 'N/A'}\n"
            f"LinkedIn: {candidate.linkedin_url or 'N/A'}\n"
            f"Manager: {manager_name or 'N/A'}\n\n"
            f"Requirements:\n"
            f"- Use Slack markdown (*bold*, _italic_)\n"
            f"- 4-5 sentences, enthusiastic but professional\n"
            f"- Mention their role and something specific about their background\n"
            f"- Include a greeting from their manager BY NAME (use the manager name provided above, never use placeholder like '[Manager Name]')\n"
            f"- Suggest they introduce themselves in the team channel\n"
            f"- End with encouragement"
        )

        response = client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {'role': 'system', 'content': 'You write friendly, personalized Slack onboarding messages.'},
                {'role': 'user', 'content': prompt},
            ],
            temperature=0.7,
            max_tokens=300,
        )

        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.warning("OpenAI welcome message generation failed: %s", e)
        return (
            f"Welcome to the team, {candidate.full_name}! 🎉\n\n"
            f"We're excited to have you on board as *{job_title}*. "
            f"Feel free to introduce yourself and ask any questions!"
        )


def notify_hr_channel(candidate):
    """Post a rich notification to the HR channel that a new hire has joined Slack."""
    token = getattr(settings, 'SLACK_BOT_TOKEN', '')
    hr_channel = getattr(settings, 'SLACK_HR_CHANNEL_ID', '')

    job_title = candidate.job.title if candidate.job else 'N/A'

    if not token or not hr_channel:
        logger.info(
            "[MOCK] Would notify HR channel: %s has joined (SLACK not configured)",
            candidate.full_name,
        )
        return {'ok': True, 'mock': True}

    try:
        import requests

        blocks = [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": "New Hire Joined Slack ✅"}
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Name:*\n{candidate.full_name}"},
                    {"type": "mrkdwn", "text": f"*Role:*\n{job_title}"},
                    {"type": "mrkdwn", "text": f"*Email:*\n{candidate.email}"},
                    {"type": "mrkdwn", "text": f"*Status:*\n✅ Onboarded"},
                ]
            },
            {"type": "divider"},
            {
                "type": "context",
                "elements": [
                    {"type": "mrkdwn", "text": "🤖 Automated via Niural ATS"}
                ]
            },
        ]

        response = requests.post(
            'https://slack.com/api/chat.postMessage',
            headers={'Authorization': f'Bearer {token}'},
            json={
                'channel': hr_channel,
                'text': f"🎉 {candidate.full_name} has joined the Slack workspace!",
                'blocks': blocks,
            },
            timeout=15,
        )
        data = response.json()
        if not data.get('ok'):
            logger.warning("HR channel notification failed: %s", data.get('error'))
        else:
            logger.info("HR notification sent for %s", candidate.full_name)
        return data
    except Exception as e:
        logger.warning("Slack HR notification failed: %s", e)
        return {'ok': False, 'error': str(e), 'mock': True}
