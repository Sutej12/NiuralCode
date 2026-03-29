import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def _extract_text_from_resume(candidate):
    """Extract text content from a PDF or DOCX resume file."""
    file_path = candidate.resume.path
    file_name = candidate.resume.name.lower()
    text = ''

    if file_name.endswith('.pdf'):
        try:
            import PyPDF2
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + '\n'
        except ImportError:
            logger.warning("PyPDF2 not installed. Cannot parse PDF resume.")
        except Exception as e:
            logger.error(f"Error reading PDF: {e}")

    elif file_name.endswith('.docx'):
        try:
            import docx
            doc = docx.Document(file_path)
            for para in doc.paragraphs:
                text += para.text + '\n'
        except ImportError:
            logger.warning("python-docx not installed. Cannot parse DOCX resume.")
        except Exception as e:
            logger.error(f"Error reading DOCX: {e}")

    return text.strip()


def _get_portal_url(candidate):
    """Generate the portal URL for a candidate."""
    from .views import generate_portal_token
    site_url = getattr(settings, 'SITE_URL', 'http://localhost:5173')
    token = generate_portal_token(candidate.id, candidate.email)
    return f"{site_url}/candidate/portal/{candidate.id}/{token}"


def send_confirmation_email(candidate):
    """Send application confirmation email via Django email backend (Gmail SMTP)."""
    from django.core.mail import EmailMultiAlternatives

    job_title = getattr(candidate.job, 'title', str(candidate.job))
    from_email = getattr(settings, 'FROM_EMAIL', 'noreply@example.com')
    portal_url = _get_portal_url(candidate)

    subject = f"Application Received - {job_title}"

    text_body = (
        f"Dear {candidate.full_name},\n\n"
        f"Thank you for applying for the {job_title} position. "
        f"We have received your application and will review it shortly.\n\n"
        f"Track your application status anytime:\n{portal_url}\n\n"
        f"Best regards,\nThe Hiring Team"
    )

    html_body = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 50%; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 28px; line-height: 56px;">&#x2713;</span>
                </div>
                <h2 style="color: #1a1a2e; margin: 0;">Application Received!</h2>
            </div>
            <p style="color: #374151; line-height: 1.6;">Dear {candidate.full_name},</p>
            <p style="color: #374151; line-height: 1.6;">
                Thank you for applying for the <strong>{job_title}</strong> position.
                We have received your application and will review it shortly.
            </p>
            <div style="text-align: center; margin: 28px 0;">
                <a href="{portal_url}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                    Track My Application
                </a>
            </div>
            <p style="color: #6b7280; font-size: 13px; line-height: 1.6; text-align: center;">
                Use this link anytime to check the status of your application.
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
        logger.info(f"Confirmation email sent to {candidate.email}")
    except Exception as e:
        logger.error(f"Failed to send confirmation email: {e}")
        logger.info(f"[EMAIL FALLBACK] To: {candidate.email}\nSubject: {subject}\n{text_body}")


def send_rejection_email(candidate, note=''):
    """Send a professional rejection email to the candidate."""
    from django.core.mail import EmailMultiAlternatives

    job_title = getattr(candidate.job, 'title', str(candidate.job))
    from_email = getattr(settings, 'FROM_EMAIL', 'noreply@example.com')

    subject = f"Application Update - {job_title}"

    text_body = (
        f"Dear {candidate.full_name},\n\n"
        f"Thank you for your interest in the {job_title} position and for taking the time "
        f"to go through our application process.\n\n"
        f"After careful consideration, we have decided to move forward with other candidates "
        f"whose qualifications more closely align with our current needs.\n\n"
        f"This was not an easy decision, as we were impressed by your background and experience. "
        f"We encourage you to apply for future openings that match your skills.\n\n"
        f"We wish you all the best in your career endeavors.\n\n"
        f"Warm regards,\nThe Hiring Team"
    )

    html_body = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="color: #1a1a2e; margin-top: 0;">Application Update</h2>
            <p style="color: #374151; line-height: 1.6;">Dear {candidate.full_name},</p>
            <p style="color: #374151; line-height: 1.6;">
                Thank you for your interest in the <strong>{job_title}</strong> position and for taking the time
                to go through our application process.
            </p>
            <p style="color: #374151; line-height: 1.6;">
                After careful consideration, we have decided to move forward with other candidates
                whose qualifications more closely align with our current needs.
            </p>
            <p style="color: #374151; line-height: 1.6;">
                This was not an easy decision, as we were impressed by your background and experience.
                We encourage you to apply for future openings that match your skills.
            </p>
            <p style="color: #374151; line-height: 1.6;">
                We wish you all the best in your career endeavors.
            </p>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 0;">
                Warm regards,<br/>
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
        logger.info(f"Rejection email sent to {candidate.email}")
    except Exception as e:
        logger.error(f"Failed to send rejection email: {e}")
        logger.info(f"[EMAIL FALLBACK] Rejection email to: {candidate.email}\nSubject: {subject}")


def screen_resume(candidate):
    """
    Use OpenAI to parse the resume and score against the job description.
    Falls back to a simulated response when API key is unavailable.
    """
    resume_text = _extract_text_from_resume(candidate)
    if not resume_text:
        resume_text = "(Resume text could not be extracted)"

    job = candidate.job
    job_title = getattr(job, 'title', str(job))
    job_description = getattr(job, 'description', '')
    job_requirements = getattr(job, 'requirements', '')

    prompt = (
        "You are an expert recruiter AI. Analyze the following resume against the "
        "job description and requirements.\n\n"
        f"JOB TITLE: {job_title}\n"
        f"JOB DESCRIPTION:\n{job_description}\n\n"
        f"JOB REQUIREMENTS:\n{job_requirements}\n\n"
        f"RESUME:\n{resume_text}\n\n"
        "Respond in JSON with these keys:\n"
        "- skills: list of extracted skills\n"
        "- experience: list of work experiences (title, company, duration)\n"
        "- education: list of education entries (degree, institution)\n"
        "- score: integer 0-100 rating match quality\n"
        "- rationale: brief explanation of the score\n"
        "Return ONLY valid JSON, no markdown."
    )

    api_key = getattr(settings, 'OPENAI_API_KEY', '')
    threshold = getattr(settings, 'AI_SCREENING_THRESHOLD', 70)

    if api_key:
        try:
            import openai
            client = openai.OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model='gpt-4o-mini',
                messages=[{'role': 'user', 'content': prompt}],
                temperature=0.3,
            )
            content = response.choices[0].message.content.strip()
            # Strip markdown code fences if present
            if content.startswith('```'):
                content = content.split('\n', 1)[1]
                if content.endswith('```'):
                    content = content[:-3]
            result = json.loads(content)
        except Exception as e:
            logger.error(f"OpenAI screening failed: {e}")
            result = _mock_screening_result()
    else:
        logger.info("No OpenAI API key. Using simulated screening result.")
        result = _mock_screening_result()

    # Save results to candidate
    candidate.parsed_resume = {
        'skills': result.get('skills', []),
        'experience': result.get('experience', []),
        'education': result.get('education', []),
    }
    candidate.ai_score = result.get('score', 0)
    candidate.ai_rationale = result.get('rationale', '')

    # Update status based on score
    if candidate.status == 'Applied':
        candidate.status = 'Screened'
    if candidate.ai_score >= threshold and candidate.status == 'Screened':
        candidate.status = 'Shortlisted'

    candidate.save()
    return result


def research_candidate(candidate):
    """
    Use OpenAI to generate a research profile for the candidate.
    Falls back to a simulated response when API key is unavailable.
    """
    resume_text = _extract_text_from_resume(candidate)

    context_parts = [f"Candidate: {candidate.full_name}"]
    if resume_text:
        context_parts.append(f"Resume Summary:\n{resume_text[:2000]}")
    if candidate.linkedin_url:
        context_parts.append(f"LinkedIn: {candidate.linkedin_url}")
    if candidate.portfolio_url:
        context_parts.append(f"Portfolio: {candidate.portfolio_url}")
    if candidate.parsed_resume:
        context_parts.append(
            f"Parsed Skills: {json.dumps(candidate.parsed_resume.get('skills', []))}"
        )

    context = '\n\n'.join(context_parts)

    prompt = (
        "You are a talent research AI. Based on the available information about this "
        "candidate, generate a comprehensive research profile.\n\n"
        f"{context}\n\n"
        "Respond in JSON with these keys:\n"
        "- summary: a 2-3 sentence professional summary\n"
        "- strengths: list of key strengths\n"
        "- concerns: list of potential concerns or gaps\n"
        "- talking_points: list of suggested interview talking points\n"
        "- online_presence: assessment of their professional online presence\n"
        "- candidate_brief: a concise paragraph suitable for a hiring manager briefing\n"
        "Return ONLY valid JSON, no markdown."
    )

    api_key = getattr(settings, 'OPENAI_API_KEY', '')

    if api_key:
        try:
            import openai
            client = openai.OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model='gpt-4o-mini',
                messages=[{'role': 'user', 'content': prompt}],
                temperature=0.5,
            )
            content = response.choices[0].message.content.strip()
            if content.startswith('```'):
                content = content.split('\n', 1)[1]
                if content.endswith('```'):
                    content = content[:-3]
            result = json.loads(content)
        except Exception as e:
            logger.error(f"OpenAI research failed: {e}")
            result = _mock_research_result(candidate)
    else:
        logger.info("No OpenAI API key. Using simulated research result.")
        result = _mock_research_result(candidate)

    # Save results
    candidate.research_profile = {
        'summary': result.get('summary', ''),
        'strengths': result.get('strengths', []),
        'concerns': result.get('concerns', []),
        'talking_points': result.get('talking_points', []),
        'online_presence': result.get('online_presence', ''),
    }
    candidate.candidate_brief = result.get('candidate_brief', '')
    candidate.save()
    return result


def _mock_screening_result():
    """Return a simulated screening result for development/testing."""
    return {
        'skills': ['Python', 'Django', 'REST APIs', 'SQL', 'Git'],
        'experience': [
            {
                'title': 'Software Engineer',
                'company': 'Example Corp',
                'duration': '2 years',
            }
        ],
        'education': [
            {
                'degree': 'B.S. Computer Science',
                'institution': 'State University',
            }
        ],
        'score': 72,
        'rationale': (
            'Simulated result: Candidate appears to have relevant technical '
            'skills and experience. This is a placeholder score generated '
            'without an OpenAI API key.'
        ),
    }


def _mock_research_result(candidate):
    """Return a simulated research result for development/testing."""
    return {
        'summary': (
            f'{candidate.full_name} is a professional candidate. '
            'This is a simulated research profile generated without an '
            'OpenAI API key.'
        ),
        'strengths': [
            'Applied proactively',
            'Resume provided',
        ],
        'concerns': [
            'Research profile is simulated - real API key needed for full analysis',
        ],
        'talking_points': [
            'Discuss career goals and motivation',
            'Explore technical depth in key skills',
        ],
        'online_presence': (
            'LinkedIn: ' + (candidate.linkedin_url or 'Not provided') + '. '
            'Portfolio: ' + (candidate.portfolio_url or 'Not provided') + '.'
        ),
        'candidate_brief': (
            f'{candidate.full_name} has applied for the position. '
            'A full AI-powered research brief requires an OpenAI API key. '
            'Please configure the key for detailed candidate analysis.'
        ),
    }
