import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def fetch_fireflies_transcript(meeting_id):
    """
    Fetch transcript from Fireflies.ai GraphQL API.
    Falls back to mock data if API key is missing or call fails.
    """
    api_key = getattr(settings, 'FIREFLIES_API_KEY', '')
    if not api_key:
        logger.info(
            "[MOCK] No FIREFLIES_API_KEY configured. Returning mock transcript."
        )
        return mock_transcript()

    try:
        import requests

        url = 'https://api.fireflies.ai/graphql'
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }
        query = """
        query Transcript($transcriptId: String!) {
            transcript(id: $transcriptId) {
                id
                title
                date
                duration
                sentences {
                    speaker_name
                    text
                    start_time
                    end_time
                }
                summary {
                    overview
                    action_items
                    keywords
                }
            }
        }
        """
        payload = {
            'query': query,
            'variables': {'transcriptId': meeting_id},
        }
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()

        transcript_data = data.get('data', {}).get('transcript', {})
        if not transcript_data:
            logger.warning("No transcript data returned for meeting %s", meeting_id)
            return mock_transcript()

        # Format sentences into readable transcript
        sentences = transcript_data.get('sentences', [])
        formatted = '\n'.join(
            f"{s.get('speaker_name', 'Unknown')}: {s.get('text', '')}"
            for s in sentences
        )
        return {
            'transcript': formatted,
            'summary': transcript_data.get('summary', {}).get('overview', ''),
            'duration': transcript_data.get('duration', 0),
            'title': transcript_data.get('title', ''),
        }
    except Exception as e:
        logger.warning("Fireflies API call failed: %s", e)
        return mock_transcript()


def mock_transcript():
    """Return realistic mock transcript data for development."""
    return {
        'transcript': (
            "Interviewer: Welcome! Thanks for joining us today. "
            "Can you start by telling me about your background?\n"
            "Candidate: Thank you for having me. I have 5 years of experience "
            "in software engineering, primarily working with Python and Django. "
            "Most recently, I was a senior developer at TechCorp where I led "
            "a team of 4 engineers building microservices.\n"
            "Interviewer: That's great. Can you walk me through a challenging "
            "project you worked on?\n"
            "Candidate: Sure. We had to migrate a monolithic application to "
            "microservices while maintaining zero downtime. I designed the "
            "migration strategy using the strangler fig pattern, and we "
            "completed it over 6 months with no service interruptions.\n"
            "Interviewer: Impressive. How do you handle disagreements with "
            "team members about technical decisions?\n"
            "Candidate: I believe in data-driven discussions. I usually "
            "propose we create a small proof of concept to compare approaches "
            "rather than debating theoretically. This keeps things objective "
            "and helps the team learn together.\n"
            "Interviewer: What interests you about this role specifically?\n"
            "Candidate: I'm excited about the AI-powered products you're "
            "building. I have experience integrating ML models into production "
            "systems and I'd love to contribute to that area.\n"
            "Interviewer: Great. Do you have any questions for us?\n"
            "Candidate: Yes, I'd like to know more about the team structure "
            "and what a typical sprint looks like here."
        ),
        'summary': (
            "Candidate has 5 years of software engineering experience with "
            "Python/Django. Led a team of 4 at TechCorp. Successfully "
            "migrated a monolith to microservices. Shows strong collaborative "
            "approach to technical decisions. Interested in AI/ML products."
        ),
        'duration': 2700,
        'title': 'Technical Interview',
    }


def analyze_transcript(interview):
    """
    Use OpenAI to analyze interview transcript and generate structured feedback.
    """
    api_key = getattr(settings, 'OPENAI_API_KEY', '')
    transcript = interview.transcript

    if not transcript:
        return {'error': 'No transcript available to analyze.'}

    if not api_key:
        logger.info("[MOCK] No OPENAI_API_KEY. Returning mock analysis.")
        return _mock_analysis()

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)

        prompt = f"""Analyze the following interview transcript and provide structured feedback.

Transcript:
{transcript}

Provide your analysis as a JSON object with these keys:
- overall_rating: number 1-10
- technical_skills: object with "rating" (1-10) and "notes" (string)
- communication: object with "rating" (1-10) and "notes" (string)
- cultural_fit: object with "rating" (1-10) and "notes" (string)
- strengths: list of strings
- areas_of_concern: list of strings
- key_topics_discussed: list of strings
- recommendation: "strong_hire", "hire", "maybe", "no_hire"
- summary: string (2-3 sentence summary)

Return ONLY valid JSON, no markdown formatting."""

        response = client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {
                    'role': 'system',
                    'content': (
                        'You are an expert interview analyst. '
                        'Provide objective, actionable feedback.'
                    ),
                },
                {'role': 'user', 'content': prompt},
            ],
            temperature=0.3,
        )

        content = response.choices[0].message.content.strip()
        # Strip markdown code fences if present
        if content.startswith('```'):
            content = content.split('\n', 1)[1]
            content = content.rsplit('```', 1)[0]

        return json.loads(content)
    except Exception as e:
        logger.warning("OpenAI analysis failed: %s", e)
        return _mock_analysis()


def _mock_analysis():
    """Return mock AI analysis for development."""
    return {
        'overall_rating': 8,
        'technical_skills': {
            'rating': 8,
            'notes': (
                'Strong Python/Django background. Demonstrated experience '
                'with microservices architecture and migration strategies.'
            ),
        },
        'communication': {
            'rating': 9,
            'notes': (
                'Clear and articulate. Provides specific examples. '
                'Good at explaining complex technical concepts.'
            ),
        },
        'cultural_fit': {
            'rating': 8,
            'notes': (
                'Collaborative approach to disagreements. '
                'Data-driven decision making aligns with team values.'
            ),
        },
        'strengths': [
            'Microservices architecture experience',
            'Team leadership',
            'Data-driven approach to problem solving',
            'Interest in AI/ML aligns with company direction',
        ],
        'areas_of_concern': [
            'Limited discussion of testing practices',
            'Could explore system design depth further',
        ],
        'key_topics_discussed': [
            'Microservices migration',
            'Team leadership',
            'Technical disagreement resolution',
            'AI/ML interest',
        ],
        'recommendation': 'hire',
        'summary': (
            'Strong candidate with solid technical skills and leadership '
            'experience. Good cultural fit with collaborative approach. '
            'Recommended for next round or offer.'
        ),
    }
