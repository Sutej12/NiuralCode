import json
import logging
import random
from datetime import datetime, timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)


def _get_google_calendar_service():
    """Try to build a Google Calendar API service client."""
    import os
    creds_path = getattr(settings, 'GOOGLE_CALENDAR_CREDENTIALS_JSON', '')
    if not creds_path:
        return None
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        if os.path.isfile(creds_path):
            credentials = service_account.Credentials.from_service_account_file(
                creds_path,
                scopes=['https://www.googleapis.com/auth/calendar'],
            )
        else:
            creds_info = json.loads(creds_path)
            credentials = service_account.Credentials.from_service_account_info(
                creds_info,
                scopes=['https://www.googleapis.com/auth/calendar'],
            )

        return build('calendar', 'v3', credentials=credentials)
    except Exception as e:
        logger.warning("Could not initialise Google Calendar API: %s", e)
        return None


def get_available_slots(interviewer_email, num_slots=5):
    """
    Return a list of (start, end) datetime tuples for available 45-min slots
    in the next 5 business days. Queries Google Calendar freebusy to avoid
    conflicts with both the interviewer's and calendar owner's busy times.
    Falls back to mock generation if API is unavailable.
    """
    service = _get_google_calendar_service()
    if service:
        try:
            return _get_google_calendar_slots(
                service, interviewer_email, num_slots
            )
        except Exception as e:
            logger.warning("Google Calendar lookup failed: %s", e)

    return _generate_mock_slots(num_slots)


def _get_google_calendar_slots(service, interviewer_email, num_slots):
    """Query Google Calendar freebusy and find open 45-min windows."""
    import pytz

    now = timezone.now()
    end_search = now + timedelta(days=7)

    cal_tz_name = getattr(settings, 'CALENDAR_TIMEZONE', 'America/New_York')
    cal_tz = pytz.timezone(cal_tz_name)
    calendar_id = getattr(settings, 'GOOGLE_CALENDAR_ID', 'primary')

    # Query freebusy for BOTH the calendar owner AND the interviewer
    items = [{'id': calendar_id}]
    if interviewer_email and interviewer_email != calendar_id:
        items.append({'id': interviewer_email})

    body = {
        'timeMin': now.isoformat(),
        'timeMax': end_search.isoformat(),
        'timeZone': cal_tz_name,
        'items': items,
    }

    logger.info("Querying freebusy for: %s", [i['id'] for i in items])
    result = service.freebusy().query(body=body).execute()

    # Merge ALL busy periods from all queried calendars
    all_busy = []
    for cal_email, cal_data in result.get('calendars', {}).items():
        busy_periods = cal_data.get('busy', [])
        all_busy.extend(busy_periods)
        logger.info("Calendar %s has %d busy periods", cal_email, len(busy_periods))

    for b in all_busy:
        logger.info("  Busy: %s to %s", b['start'], b['end'])

    slots = []
    now_local = now.astimezone(cal_tz)
    current_date = now_local.date()
    if now_local.hour >= 16:
        current_date += timedelta(days=1)

    end_date = end_search.astimezone(cal_tz).date()

    while len(slots) < num_slots and current_date <= end_date:
        if current_date.weekday() < 5:  # Mon-Fri
            for hour in [9, 10, 11, 13, 14, 15, 16]:
                start_local = cal_tz.localize(
                    datetime(current_date.year, current_date.month, current_date.day, hour, 0, 0)
                )
                end_local = start_local + timedelta(minutes=45)
                start_utc = start_local.astimezone(pytz.utc)
                end_utc = end_local.astimezone(pytz.utc)

                if start_utc > now and not _overlaps_busy(start_utc, end_utc, all_busy):
                    slots.append((start_utc, end_utc))
                    if len(slots) >= num_slots:
                        break
        current_date += timedelta(days=1)

    logger.info("Found %d available slots", len(slots))
    return slots


def _overlaps_busy(start, end, busy_periods):
    """Check if a proposed slot overlaps with any busy period."""
    import pytz
    from django.utils.dateparse import parse_datetime

    for period in busy_periods:
        b_start_str = period['start']
        b_end_str = period['end']

        b_start = parse_datetime(b_start_str)
        b_end = parse_datetime(b_end_str)

        if b_start is None or b_end is None:
            continue

        # Make timezone-aware if they aren't
        if b_start.tzinfo is None:
            b_start = pytz.utc.localize(b_start)
        if b_end.tzinfo is None:
            b_end = pytz.utc.localize(b_end)

        # Normalize to UTC for comparison
        b_start = b_start.astimezone(pytz.utc)
        b_end = b_end.astimezone(pytz.utc)
        start_utc = start.astimezone(pytz.utc) if start.tzinfo else pytz.utc.localize(start)
        end_utc = end.astimezone(pytz.utc) if end.tzinfo else pytz.utc.localize(end)

        if start_utc < b_end and end_utc > b_start:
            return True
    return False


def _generate_mock_slots(num_slots):
    """Generate realistic mock business-hours slots."""
    now = timezone.now()
    slots = []
    current = now.replace(hour=9, minute=0, second=0, microsecond=0)
    if current < now:
        current += timedelta(days=1)

    hours = [9, 10, 11, 13, 14, 15, 16]

    while len(slots) < num_slots:
        if current.weekday() < 5:
            available_hours = random.sample(hours, min(3, len(hours)))
            for hour in sorted(available_hours):
                start = current.replace(hour=hour, minute=0)
                end = start + timedelta(minutes=45)
                slots.append((start, end))
                if len(slots) >= num_slots:
                    break
        current += timedelta(days=1)

    return slots[:num_slots]


def block_tentative_slot(interviewer_email, start, end, candidate_name=''):
    """Create a tentative calendar event. Returns event_id or ''."""
    service = _get_google_calendar_service()
    if not service:
        logger.info(
            "[MOCK] Would block tentative slot for %s: %s - %s",
            interviewer_email, start, end,
        )
        return '', ''

    try:
        cal_tz_name = getattr(settings, 'CALENDAR_TIMEZONE', 'America/New_York')
        calendar_id = getattr(settings, 'GOOGLE_CALENDAR_ID', 'primary')

        import uuid
        request_id = uuid.uuid4().hex[:16]

        event = {
            'summary': f'Interview (Tentative) - {candidate_name}' if candidate_name else 'Interview (Tentative)',
            'description': f'Tentative interview slot with {candidate_name}. Awaiting candidate confirmation.',
            'start': {
                'dateTime': start.isoformat(),
                'timeZone': cal_tz_name,
            },
            'end': {
                'dateTime': end.isoformat(),
                'timeZone': cal_tz_name,
            },
            'transparency': 'transparent',
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'popup', 'minutes': 15},
                ],
            },
        }

        # Try with Google Meet first, fall back without if not supported
        created = None
        event_with_meet = dict(event)
        event_with_meet['conferenceData'] = {
            'createRequest': {
                'requestId': request_id,
                'conferenceSolutionKey': {'type': 'hangoutsMeet'},
            },
        }
        try:
            created = (
                service.events()
                .insert(
                    calendarId=calendar_id,
                    body=event_with_meet,
                    sendUpdates='none',
                    conferenceDataVersion=1,
                )
                .execute()
            )
        except Exception as meet_err:
            logger.info("Meet link not supported, creating event without it: %s", meet_err)
            created = (
                service.events()
                .insert(
                    calendarId=calendar_id,
                    body=event,
                    sendUpdates='none',
                )
                .execute()
            )

        # Extract Meet link from created event (if available)
        event_meet_link = ''
        conf_data = created.get('conferenceData', {})
        for ep in conf_data.get('entryPoints', []):
            if ep.get('entryPointType') == 'video':
                event_meet_link = ep.get('uri', '')
                break
        logger.info("Created tentative event: %s, Meet: %s", created.get('id'), event_meet_link or 'N/A')
        return created.get('id', ''), event_meet_link
    except Exception as e:
        logger.warning("Failed to create tentative calendar event: %s", e)
        return '', ''


def confirm_calendar_slot(slot):
    """
    Confirm a slot: update Google Calendar event to confirmed with
    attendees (interviewer + candidate) so both get a calendar invite.
    """
    service = _get_google_calendar_service()
    if not service or not slot.google_event_id:
        logger.info("[MOCK] Would confirm calendar slot %s", slot.id)
        return

    try:
        cal_tz_name = getattr(settings, 'CALENDAR_TIMEZONE', 'America/New_York')
        calendar_id = getattr(settings, 'GOOGLE_CALENDAR_ID', 'primary')

        event = (
            service.events()
            .get(calendarId=calendar_id, eventId=slot.google_event_id)
            .execute()
        )

        candidate = slot.candidate

        # Extract existing Meet link if present
        meet_link = ''
        conference_data = event.get('conferenceData')
        if conference_data:
            for ep in conference_data.get('entryPoints', []):
                if ep.get('entryPointType') == 'video':
                    meet_link = ep.get('uri', '')
                    break

        event['summary'] = f'Interview - {candidate.full_name}'
        description_parts = [
            f'Confirmed interview with {candidate.full_name}',
            f'Email: {candidate.email}',
            f'Position: {candidate.job}',
            f'LinkedIn: {candidate.linkedin_url or "N/A"}',
        ]
        if meet_link:
            description_parts.append(f'\nGoogle Meet: {meet_link}')
        event['description'] = '\n'.join(description_parts)

        event['transparency'] = 'opaque'
        event['status'] = 'confirmed'

        event['reminders'] = {
            'useDefault': False,
            'overrides': [
                {'method': 'email', 'minutes': 60},
                {'method': 'popup', 'minutes': 15},
            ],
        }

        # Try adding attendees (requires domain-wide delegation for service accounts)
        # If it fails, we still update the event and send .ics email as fallback
        attendees = []
        if slot.interviewer_email:
            attendees.append({'email': slot.interviewer_email, 'responseStatus': 'accepted'})
        if candidate.email:
            attendees.append({'email': candidate.email, 'responseStatus': 'needsAction'})

        # First try with attendees
        event_with_attendees = dict(event)
        event_with_attendees['attendees'] = attendees
        try:
            updated = service.events().update(
                calendarId=calendar_id,
                eventId=slot.google_event_id,
                body=event_with_attendees,
                sendUpdates='all',
            ).execute()
        except Exception as att_err:
            logger.info("Cannot add attendees (service account limitation): %s", att_err)
            # Update event without attendees — the .ics email will handle candidate invite
            updated = service.events().update(
                calendarId=calendar_id,
                eventId=slot.google_event_id,
                body=event,
                sendUpdates='none',
            ).execute()

        # Get the final Meet link from the updated event
        updated_conf = updated.get('conferenceData', {})
        for ep in updated_conf.get('entryPoints', []):
            if ep.get('entryPointType') == 'video':
                meet_link = ep.get('uri', '')
                break

        # Save Meet link to the slot
        if meet_link:
            slot.meet_link = meet_link
            slot.save(update_fields=['meet_link'])

        logger.info("Confirmed calendar event %s, Meet: %s", slot.google_event_id, meet_link)

    except Exception as e:
        logger.warning("Failed to confirm calendar event: %s", e)

    # Always send confirmation email with .ics + Meet link, even if calendar update failed
    try:
        _send_confirmation_email(slot, meet_link=meet_link)
    except Exception as e:
        logger.warning("Failed to send candidate confirmation email: %s", e)


def _send_confirmation_email(slot, meet_link=''):
    """
    Send interview confirmation email with an .ics calendar invite attachment
    (including Google Meet link) so the event appears on the candidate's calendar.
    """
    import pytz
    import uuid
    from email.mime.base import MIMEBase
    from django.core.mail import EmailMessage

    cal_tz_name = getattr(settings, 'CALENDAR_TIMEZONE', 'America/New_York')
    cal_tz = pytz.timezone(cal_tz_name)

    start_local = slot.start_time.astimezone(cal_tz)
    end_local = slot.end_time.astimezone(cal_tz)
    start_utc = slot.start_time.astimezone(pytz.utc)
    end_utc = slot.end_time.astimezone(pytz.utc)

    candidate = slot.candidate
    from_email = getattr(settings, 'FROM_EMAIL', 'noreply@example.com')

    body_parts = [
        f"Hi {candidate.full_name},\n",
        f"Your interview has been confirmed!\n",
        f"Details:",
        f"  Date: {start_local:%A, %B %d, %Y}",
        f"  Time: {start_local:%I:%M %p} - {end_local:%I:%M %p} ({cal_tz_name})",
        f"  Position: {candidate.job}",
        f"  Interviewer: {slot.interviewer_email}",
    ]
    if meet_link:
        body_parts.append(f"  Google Meet: {meet_link}")
    body_parts.extend([
        "",
        "A calendar invite is attached — open it to add this to your calendar.",
        "",
        "Best regards,",
        "The Hiring Team",
    ])
    body = '\n'.join(body_parts)

    # Build description for .ics
    ics_desc = f"Interview for {candidate.job} position with {slot.interviewer_email}"
    if meet_link:
        ics_desc += f"\\nGoogle Meet: {meet_link}"

    # Build .ics calendar invite
    uid = str(uuid.uuid4())
    ics_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Niural ATS//EN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTART:{start_utc:%Y%m%dT%H%M%S}Z",
        f"DTEND:{end_utc:%Y%m%dT%H%M%S}Z",
        f"SUMMARY:Interview - {candidate.job}",
        f"DESCRIPTION:{ics_desc}",
    ]
    if meet_link:
        ics_lines.append(f"LOCATION:{meet_link}")
    ics_lines.extend([
        f"ORGANIZER;CN=Hiring Team:mailto:{from_email}",
        f"ATTENDEE;CN={candidate.full_name};RSVP=TRUE:mailto:{candidate.email}",
        f"ATTENDEE;CN=Interviewer;RSVP=TRUE:mailto:{slot.interviewer_email}",
        "STATUS:CONFIRMED",
        "SEQUENCE:0",
        "BEGIN:VALARM",
        "TRIGGER:-PT15M",
        "ACTION:DISPLAY",
        "DESCRIPTION:Interview in 15 minutes",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
    ])
    ics_content = "\r\n".join(ics_lines) + "\r\n"

    try:
        email = EmailMessage(
            subject=f"Interview Confirmed - {candidate.job}",
            body=body,
            from_email=from_email,
            to=[candidate.email],
        )

        # Attach .ics file as a calendar invite
        ics_part = MIMEBase('text', 'calendar', method='REQUEST')
        ics_part.set_payload(ics_content.encode('utf-8'))
        ics_part.add_header('Content-Disposition', 'attachment', filename='interview.ics')
        email.attach(ics_part)

        email.send(fail_silently=False)
        logger.info("Confirmation email with .ics + Meet link sent to %s", candidate.email)
    except Exception as e:
        logger.warning("Failed to send confirmation email: %s", e)


def release_slot(slot):
    """Remove a tentative hold from Google Calendar."""
    service = _get_google_calendar_service()
    if not service or not slot.google_event_id:
        logger.info("[MOCK] Would release slot %s", slot.id)
        return

    try:
        calendar_id = getattr(settings, 'GOOGLE_CALENDAR_ID', 'primary')
        service.events().delete(
            calendarId=calendar_id,
            eventId=slot.google_event_id,
            sendUpdates='none',
        ).execute()
        logger.info("Released calendar event %s", slot.google_event_id)
    except Exception as e:
        logger.warning("Failed to release calendar event: %s", e)


def send_scheduling_email(candidate, slots):
    """Send an email to the candidate with available time slots and a selection link."""
    import pytz
    cal_tz_name = getattr(settings, 'CALENDAR_TIMEZONE', 'America/New_York')
    cal_tz = pytz.timezone(cal_tz_name)
    site_url = getattr(settings, 'SITE_URL', 'http://localhost:5173')

    slot_lines = []
    for slot in slots:
        start_local = slot.start_time.astimezone(cal_tz)
        end_local = slot.end_time.astimezone(cal_tz)
        slot_lines.append(
            f"  - {start_local:%A, %B %d at %I:%M %p} to {end_local:%I:%M %p} ({cal_tz_name})"
        )

    select_link = f"{site_url}/schedule/select/{candidate.id}"

    body = (
        f"Hi {candidate.full_name},\n\n"
        f"We'd love to schedule your interview for the {candidate.job} position!\n\n"
        f"Here are the available time slots:\n\n"
        + "\n".join(slot_lines)
        + f"\n\nPlease select your preferred time here:\n{select_link}\n\n"
        + "Best regards,\nThe Hiring Team"
    )

    try:
        send_mail(
            subject=f"Interview Scheduling - {candidate.job}",
            message=body,
            from_email=getattr(settings, 'FROM_EMAIL', 'noreply@example.com'),
            recipient_list=[candidate.email],
            fail_silently=False,
        )
        logger.info("Scheduling email sent to %s", candidate.email)
    except Exception as e:
        logger.warning(
            "Failed to send scheduling email to %s: %s", candidate.email, e
        )
        logger.info("[FALLBACK] Scheduling email:\n%s", body)


def send_follow_up_email(candidate, slots):
    """Send a follow-up reminder email to a candidate who hasn't selected a slot."""
    import pytz
    cal_tz_name = getattr(settings, 'CALENDAR_TIMEZONE', 'America/New_York')
    cal_tz = pytz.timezone(cal_tz_name)
    site_url = getattr(settings, 'SITE_URL', 'http://localhost:5173')

    slot_lines = []
    for slot in slots:
        start_local = slot.start_time.astimezone(cal_tz)
        end_local = slot.end_time.astimezone(cal_tz)
        slot_lines.append(
            f"  • {start_local:%A, %B %d at %I:%M %p} to {end_local:%I:%M %p} ({cal_tz_name})"
        )

    select_link = f"{site_url}/schedule/select/{candidate.id}"

    body = (
        f"Hi {candidate.full_name},\n\n"
        f"We noticed you haven't selected an interview time yet for the "
        f"{candidate.job} position. We'd love to move forward with your application!\n\n"
        f"Here are the available slots still open for you:\n\n"
        + "\n".join(slot_lines)
        + f"\n\nPlease select your preferred time here:\n{select_link}\n\n"
        + "If none of these times work, you can also request a different time "
        + "using the link above.\n\n"
        + "We look forward to hearing from you!\n\n"
        + "Best regards,\nThe Hiring Team"
    )

    try:
        send_mail(
            subject=f"Reminder: Please Select Your Interview Time - {candidate.job}",
            message=body,
            from_email=getattr(settings, 'FROM_EMAIL', 'noreply@example.com'),
            recipient_list=[candidate.email],
            fail_silently=False,
        )
        logger.info("Follow-up email sent to %s", candidate.email)
    except Exception as e:
        logger.warning("Failed to send follow-up email to %s: %s", candidate.email, e)
        logger.info("[FALLBACK] Follow-up email:\n%s", body)


def find_alternative_slots(interviewer_email, preferred_date='', preferred_time='',
                           candidate_note='', num_slots=5):
    """
    Use AI + Google Calendar to find alternative slots that match the
    candidate's preferred time. Falls back to regular available slots.
    """
    import pytz
    from datetime import datetime as dt

    cal_tz_name = getattr(settings, 'CALENDAR_TIMEZONE', 'America/New_York')
    cal_tz = pytz.timezone(cal_tz_name)

    # First, get all available slots from calendar
    all_available = get_available_slots(interviewer_email, num_slots=15)

    if not preferred_date and not preferred_time:
        # No preference given, just return regular slots
        return all_available[:num_slots]

    # Try to use OpenAI to rank the slots based on candidate preferences
    api_key = getattr(settings, 'OPENAI_API_KEY', '')
    if api_key and all_available:
        try:
            import openai
            import json

            slot_descriptions = []
            for i, (start, end) in enumerate(all_available):
                start_local = start.astimezone(cal_tz)
                end_local = end.astimezone(cal_tz)
                slot_descriptions.append(
                    f"Slot {i}: {start_local:%A, %B %d at %I:%M %p} - {end_local:%I:%M %p} ET"
                )

            prompt = (
                "You are a scheduling AI. A candidate has requested a different interview time.\n\n"
                f"Candidate's preferred date: {preferred_date or 'Not specified'}\n"
                f"Candidate's preferred time: {preferred_time or 'Not specified'}\n"
                f"Candidate's note: {candidate_note or 'None'}\n\n"
                f"Available slots (all times in {cal_tz_name}):\n"
                + "\n".join(slot_descriptions) + "\n\n"
                f"Rank the top {num_slots} slots that best match the candidate's preferences. "
                "Return ONLY a JSON array of slot indices, e.g. [3, 1, 5, 0, 2]. "
                "Most preferred first. Return ONLY valid JSON, no markdown."
            )

            client = openai.OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model='gpt-4o-mini',
                messages=[{'role': 'user', 'content': prompt}],
                temperature=0.2,
            )
            content = response.choices[0].message.content.strip()
            if content.startswith('```'):
                content = content.split('\n', 1)[1]
                if content.endswith('```'):
                    content = content[:-3]
            ranked_indices = json.loads(content)

            # Return slots in AI-ranked order
            ranked_slots = []
            for idx in ranked_indices:
                if isinstance(idx, int) and 0 <= idx < len(all_available):
                    ranked_slots.append(all_available[idx])
                if len(ranked_slots) >= num_slots:
                    break

            if ranked_slots:
                logger.info("AI ranked %d alternative slots based on candidate preferences", len(ranked_slots))
                return ranked_slots

        except Exception as e:
            logger.warning("AI slot ranking failed: %s", e)

    # Fallback: try to match preferred date/time manually
    if preferred_date:
        try:
            pref_date = dt.strptime(preferred_date, '%Y-%m-%d').date()
            # Prioritize slots on or near the preferred date
            scored = []
            for start, end in all_available:
                start_local = start.astimezone(cal_tz)
                date_diff = abs((start_local.date() - pref_date).days)
                time_score = 0
                if preferred_time:
                    try:
                        pref_hour = int(preferred_time.split(':')[0])
                        time_score = abs(start_local.hour - pref_hour)
                    except (ValueError, IndexError):
                        pass
                scored.append((date_diff * 10 + time_score, start, end))
            scored.sort(key=lambda x: x[0])
            return [(s, e) for _, s, e in scored[:num_slots]]
        except (ValueError, TypeError):
            pass

    return all_available[:num_slots]


def send_interviewer_approval_email(interviewer_email, candidate, slots,
                                     preferred_date='', preferred_time='',
                                     candidate_note=''):
    """Email the interviewer about candidate's reschedule request for approval."""
    import pytz
    cal_tz_name = getattr(settings, 'CALENDAR_TIMEZONE', 'America/New_York')
    cal_tz = pytz.timezone(cal_tz_name)
    site_url = getattr(settings, 'SITE_URL', 'http://localhost:5173')

    slot_lines = []
    for slot in slots:
        start_local = slot.start_time.astimezone(cal_tz)
        end_local = slot.end_time.astimezone(cal_tz)
        slot_lines.append(
            f"  - {start_local:%A, %B %d at %I:%M %p} to {end_local:%I:%M %p} ({cal_tz_name})"
        )

    pref_info = ""
    if preferred_date or preferred_time:
        pref_info = f"\nCandidate's preferred time: {preferred_date or ''} {preferred_time or ''}\n"
    if candidate_note:
        pref_info += f"Candidate's note: {candidate_note}\n"

    body = (
        f"Hi,\n\n"
        f"Candidate {candidate.full_name} has requested a different interview time "
        f"for the {candidate.job} position.\n"
        f"{pref_info}\n"
        f"The following alternative slots have been proposed based on your calendar availability:\n\n"
        + "\n".join(slot_lines)
        + f"\n\nTo approve these slots, no action is needed — the candidate can select from them.\n"
        + f"To decline and request new options, visit the admin dashboard:\n"
        + f"{site_url}/admin/scheduling/{candidate.id}\n\n"
        + "Best regards,\nAI Scheduling Assistant"
    )

    try:
        send_mail(
            subject=f"Reschedule Request - {candidate.full_name} ({candidate.job})",
            message=body,
            from_email=getattr(settings, 'FROM_EMAIL', 'noreply@example.com'),
            recipient_list=[interviewer_email],
            fail_silently=False,
        )
        logger.info("Interviewer approval email sent to %s", interviewer_email)
    except Exception as e:
        logger.warning("Failed to send interviewer email: %s", e)
        logger.info("[FALLBACK] Interviewer email:\n%s", body)


def send_interviewer_confirmation_email(slot):
    """Notify the interviewer that the candidate has confirmed, with .ics invite."""
    import pytz
    import uuid
    from email.mime.base import MIMEBase
    from django.core.mail import EmailMessage

    cal_tz_name = getattr(settings, 'CALENDAR_TIMEZONE', 'America/New_York')
    cal_tz = pytz.timezone(cal_tz_name)

    start_local = slot.start_time.astimezone(cal_tz)
    end_local = slot.end_time.astimezone(cal_tz)
    start_utc = slot.start_time.astimezone(pytz.utc)
    end_utc = slot.end_time.astimezone(pytz.utc)
    candidate = slot.candidate
    from_email = getattr(settings, 'FROM_EMAIL', 'noreply@example.com')

    body = (
        f"Hi,\n\n"
        f"Great news! {candidate.full_name} has confirmed their interview time.\n\n"
        f"Details:\n"
        f"  Candidate: {candidate.full_name} ({candidate.email})\n"
        f"  Position: {candidate.job}\n"
        f"  Date: {start_local:%A, %B %d, %Y}\n"
        f"  Time: {start_local:%I:%M %p} - {end_local:%I:%M %p} ({cal_tz_name})\n"
        f"  LinkedIn: {candidate.linkedin_url or 'N/A'}\n\n"
        f"A calendar invite is attached.\n\n"
        f"Best regards,\nAI Scheduling Assistant"
    )

    uid = str(uuid.uuid4())
    ics_content = (
        "BEGIN:VCALENDAR\r\n"
        "VERSION:2.0\r\n"
        "PRODID:-//Niural ATS//EN\r\n"
        "METHOD:REQUEST\r\n"
        "BEGIN:VEVENT\r\n"
        f"UID:{uid}\r\n"
        f"DTSTART:{start_utc:%Y%m%dT%H%M%S}Z\r\n"
        f"DTEND:{end_utc:%Y%m%dT%H%M%S}Z\r\n"
        f"SUMMARY:Interview - {candidate.full_name} ({candidate.job})\r\n"
        f"DESCRIPTION:Interview with {candidate.full_name}\\nEmail: {candidate.email}\\nPosition: {candidate.job}\\nLinkedIn: {candidate.linkedin_url or 'N/A'}\r\n"
        f"ORGANIZER;CN=Hiring Team:mailto:{from_email}\r\n"
        f"ATTENDEE;CN=Interviewer;RSVP=TRUE:mailto:{slot.interviewer_email}\r\n"
        f"ATTENDEE;CN={candidate.full_name};RSVP=TRUE:mailto:{candidate.email}\r\n"
        "STATUS:CONFIRMED\r\n"
        "SEQUENCE:0\r\n"
        "BEGIN:VALARM\r\n"
        "TRIGGER:-PT15M\r\n"
        "ACTION:DISPLAY\r\n"
        "DESCRIPTION:Interview in 15 minutes\r\n"
        "END:VALARM\r\n"
        "END:VEVENT\r\n"
        "END:VCALENDAR\r\n"
    )

    try:
        email = EmailMessage(
            subject=f"Interview Confirmed - {candidate.full_name} ({start_local:%B %d at %I:%M %p})",
            body=body,
            from_email=from_email,
            to=[slot.interviewer_email],
        )
        ics_part = MIMEBase('text', 'calendar', method='REQUEST')
        ics_part.set_payload(ics_content.encode('utf-8'))
        ics_part.add_header('Content-Disposition', 'attachment', filename='interview.ics')
        email.attach(ics_part)
        email.send(fail_silently=False)
        logger.info("Interviewer confirmation email with .ics sent to %s", slot.interviewer_email)
    except Exception as e:
        logger.warning("Failed to send interviewer confirmation: %s", e)
