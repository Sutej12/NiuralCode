# Niural AI-Powered Hiring Pipeline

An end-to-end AI-native hiring pipeline built with **Django REST Framework** (backend) and **React + Vite** (frontend). The system automates the full hiring lifecycle from job posting through onboarding, leveraging AI at every stage where it adds genuine value.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [API Keys and Integrations Setup](#api-keys-and-integrations-setup)
- [Running the Application](#running-the-application)
- [Pipeline Walkthrough](#pipeline-walkthrough)
- [Features](#features)
- [Project Structure](#project-structure)

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Python 3.12+ | Core language |
| Django 4.2+ | Web framework |
| Django REST Framework | API layer |
| SQLite | Database (development) |
| OpenAI GPT-4o-mini | AI screening, research, offer generation, interview analysis, scheduling intelligence |
| Google Calendar API | Interview slot availability, tentative holds, confirmed bookings, Google Meet links |
| Slack API | Onboarding automation (invites, welcome messages, HR notifications) |
| Gmail SMTP | Transactional emails throughout the pipeline |
| Fireflies.ai API | Meeting transcript fetching (optional) |

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| Vite 8 | Build tool and dev server |
| React Router 7 | Client-side routing |
| Axios | HTTP client |
| Web Speech API | Browser-based speech recognition for interview transcription |
| Canvas API | Digital signature capture for offer e-signing |

---

## Architecture Overview

```
Frontend (React + Vite)           Backend (Django REST)           External Services
=========================         =========================       =========================

Candidate Portal                  /api/candidates/apply/     ---> Gmail (confirmation email)
  - Career Page                   /api/candidates/portal/         OpenAI (screening, research)
  - Apply Form
  - Track Application             /api/jobs/                 ---> Gmail (role status emails)
  - Schedule Select
  - Offer Sign                    /api/scheduling/           ---> Google Calendar API
                                    send-slots/                    (freebusy, events, Meet)
Admin Dashboard                   /api/candidates/                Gmail (scheduling emails)
  - Candidate Management            screen-candidate/             OpenAI (slot ranking)
  - Screening and Research           research-candidate/
  - Scheduling                    /api/interviews/           ---> Fireflies.ai (transcripts)
  - Interview Room                  analyze/                      OpenAI (analysis)
  - Offer Management              /api/offers/               ---> OpenAI (offer generation)
  - Onboarding                      sign/                         Gmail (offer email)
  - Analytics                     /api/onboarding/           ---> Slack API (invites, DMs)
                                    trigger/                       Gmail (invite link)
                                    slack-events/
```

### Django Apps

| App | Responsibility |
|---|---|
| `jobs` | Job posting CRUD, role lifecycle (Open / Paused / Closed) |
| `candidates` | Applications, AI screening, research, status management, self-service portal |
| `scheduling` | Google Calendar integration, slot management, rescheduling, follow-ups |
| `interviews` | Interview records, live transcription, AI transcript analysis |
| `offers` | Offer letter generation, e-signing, digital signature capture |
| `onboarding` | Slack workspace onboarding, welcome messages, HR notifications |

---

## Getting Started

### Prerequisites

- Python 3.12 or higher
- Node.js 18+ and npm
- Git

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Niural
```

### 2. Backend Setup

```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install Python dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your API keys (see next section)

# Run database migrations
python manage.py migrate

# Start the backend server
python manage.py runserver
```

### 3. Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Start the development server
npm run dev
```

### 4. Access the Application

| URL | Purpose |
|---|---|
| `http://localhost:5173/` | Candidate Portal (career page, apply, track status) |
| `http://localhost:5173/admin` | Admin Dashboard (manage the full pipeline) |
| `http://localhost:8000/api/` | API root (browsable) |

---

## API Keys and Integrations Setup

All external services have **graceful fallbacks**. The application is fully functional without any API keys. AI features return mock data, emails print to the console, and calendar slots are auto-generated.

### 1. OpenAI API Key (Required for AI features)

**Used for:** Resume screening, candidate research, offer letter generation, interview transcript analysis, scheduling slot ranking.

**How to get it:**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an account and add billing
3. Navigate to **API Keys** in the sidebar
4. Click **Create new secret key**
5. Copy the key (starts with `sk-...`)

```env
OPENAI_API_KEY=sk-your-key-here
```

> **Fallback:** Without this key, all AI features return mock/template data. The app remains fully functional for demonstration.

### 2. Gmail SMTP (Required for sending emails)

**Used for:** Confirmation emails, scheduling emails, offer emails, rejection emails, follow-ups, role status notifications.

**How to get it:**
1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled
3. Search for **App passwords** in your Google account security settings
4. Select **Mail** as the app, choose your device
5. Google generates a 16-character app password

```env
EMAIL_HOST_USER=your-gmail@gmail.com
EMAIL_HOST_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

> **Fallback:** Without Gmail credentials, emails are printed to the terminal console instead of being sent.

### 3. Google Calendar API (Required for real scheduling)

**Used for:** Checking interviewer availability via freebusy, creating tentative/confirmed calendar events, generating Google Meet links.

**How to get it:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Enable the **Google Calendar API** from the API Library
4. Navigate to **Credentials** then **Create Credentials** then **Service Account**
5. Create a service account and download the JSON key file
6. In Google Calendar, share your target calendar with the service account email (found in the JSON under `client_email`), giving it **Make changes to events** permission

```env
GOOGLE_CALENDAR_CREDENTIALS_JSON=C:\path\to\credentials.json
GOOGLE_CALENDAR_ID=primary
CALENDAR_TIMEZONE=America/New_York
```

> **Fallback:** Without Google Calendar credentials, the system generates mock business-hours slots (Mon-Fri, 9am-4pm).

### 4. Slack API (Required for onboarding automation)

**Used for:** Sending workspace invites, detecting when candidates join, posting welcome messages, notifying HR channel.

**How to get it:**
1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app
2. Under **OAuth and Permissions**, add Bot Token Scopes: `users:read`, `users:read.email`, `chat:write`, `channels:read`
3. Install the app to your workspace and copy the **Bot User OAuth Token** (`xoxb-...`)
4. Under **Event Subscriptions**, set Request URL to `https://your-domain.com/api/onboarding/slack-events/` and subscribe to `team_join`
5. Copy **Signing Secret** from Basic Information
6. Get your workspace invite link from **Slack Admin**

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_TEAM_ID=T0XXXXXXX
SLACK_HR_CHANNEL_ID=C0XXXXXXX
SLACK_WELCOME_CHANNEL_ID=C0XXXXXXX
SLACK_INVITE_LINK=https://join.slack.com/t/your-workspace/shared_invite/...
```

> **Fallback:** Without Slack credentials, onboarding is simulated with console logging.

### 5. Fireflies.ai API (Optional)

**Used for:** Fetching meeting transcripts from recorded video calls.

```env
FIREFLIES_API_KEY=your-fireflies-api-key
```

> This is optional. The interview room uses browser-based speech recognition as the primary transcript source.

### 6. Application Settings

```env
AI_SCREENING_THRESHOLD=70          # Minimum AI score to auto-shortlist (0-100)
SITE_URL=http://localhost:5173     # Frontend URL (for email links)
BACKEND_URL=http://localhost:8000  # Backend URL
```

---

## Running the Application

### Development Mode (Two Terminals)

**Terminal 1 (Backend):**
```bash
cd Niural
python manage.py runserver
```

**Terminal 2 (Frontend):**
```bash
cd Niural/frontend
npm run dev
```

### Seeding a Test Job

```bash
python manage.py shell -c "
from jobs.models import Job
Job.objects.create(
    title='Senior Software Engineer',
    team='Engineering',
    location='Remote',
    is_remote=True,
    experience_level='Senior',
    description='We are looking for a senior engineer...',
    requirements='5+ years Python, Django, React',
    responsibilities='Design and build scalable systems',
    status='Open'
)
print('Job created.')
"
```

---

## Pipeline Walkthrough

```
1. APPLY        Candidate submits application via career page
                  - Duplicate detection (email + job unique constraint)
                  - File validation (PDF/DOCX only, max 5MB)
                  - Referral code validation
                  - Blocks applications if role is Closed/Paused
                  - Sends confirmation email with portal tracking link

2. SCREEN       Admin triggers AI resume screening
                  - OpenAI extracts skills, experience, education
                  - Generates score (0-100) with detailed rationale
                  - Auto-shortlists if score >= threshold (default 70)
                  - Status: Applied -> Screened -> Shortlisted (automatic)

3. RESEARCH     Admin triggers AI candidate research
                  - Analyzes LinkedIn URL, portfolio, parsed resume
                  - Generates: summary, strengths, concerns, talking points
                  - Produces candidate brief for interviewer preparation

4. SCHEDULE     Admin sends interview slots to candidate
                  - Queries Google Calendar freebusy for 5 available 45-min slots
                  - Creates tentative calendar holds (prevents double-booking)
                  - Emails candidate with slot selection link
                  - Candidate selects slot -> confirms on calendar + generates Meet link
                  - .ics calendar invite sent to both parties
                  - Reschedule flow with AI-powered preference matching
                  - Follow-up emails for unresponsive candidates

5. INTERVIEW    Live interview with transcript capture
                  - Browser-based speech recognition (Web Speech API)
                  - Speaker labeling toggle (Interviewer / Candidate)
                  - Real-time timestamped transcript
                  - Finalize and save to candidate profile
                  - AI analysis: technical, communication, cultural fit + recommendation

6. OFFER        AI-generated offer letter with e-signing
                  - OpenAI generates professional HTML offer letter
                  - Admin reviews, edits, and sends to candidate
                  - Canvas-based digital signature capture
                  - Records signature data (base64), timestamp, signer IP

7. ONBOARD      Automated Slack workspace onboarding
                  - Auto-triggered when offer is signed
                  - Sends Slack workspace invite via email
                  - Detects join via Slack team_join webhook
                  - Posts AI-personalized welcome message to channel
                  - Notifies HR channel with new hire details
```

---

## Features

### Core Pipeline
- Full candidate lifecycle management (Applied through Onboarded)
- Role management with Open / Paused / Closed states and candidate notifications
- Status history tracking with timestamps and admin notes
- Referral system with code validation and dashboard filtering

### AI Integration (OpenAI GPT-4o-mini)
- Resume parsing and scoring with skills extraction and experience matching
- Candidate research and profile analysis with talking points
- Interview transcript analysis with hire/no-hire recommendation
- Offer letter generation with professional formatting
- Scheduling intelligence: AI ranks alternative slots by candidate preference

### Candidate Self-Service Portal (HMAC Token-Based)
- No-login access via secure HMAC token link in emails
- Real-time application progress tracking with visual pipeline
- Interview slot selection and rescheduling requests
- Status timeline with all transitions

### Interview Room and Transcription
- Live speech-to-text using Web Speech API
- Speaker toggle for proper attribution (Interviewer / Candidate)
- Timestamped transcript with finalize-and-save workflow
- AI-powered analysis producing structured ratings and recommendation

### Scheduling System
- Google Calendar freebusy integration for real availability
- Tentative hold to confirmed slot workflow with Meet link generation
- .ics calendar invite email attachments for both parties
- Reschedule request flow with interviewer approve/reject via bell notifications
- Follow-up email for unresponsive candidates
- Database-level slot conflict prevention

### E-Signing and Offer Management
- Canvas-based digital signature (touch + mouse support)
- Base64 signature storage with IP and timestamp audit trail
- Auto-triggers Slack onboarding on signature

### Onboarding Automation
- Slack workspace invite email
- team_join webhook for automatic detection
- AI-personalized welcome message with role details
- HR channel notification with structured new-hire info
- Manual fallback check for environments without webhooks

---

## Project Structure

```
Niural/
  config/                # Django project settings, URLs, WSGI
    settings.py          # All configuration and env vars
    urls.py              # API URL routing
  candidates/            # Candidate management app
    models.py            # Candidate, StatusHistory models
    views.py             # CRUD, portal, screening, research endpoints
    services.py          # AI screening, research, email services
    serializers.py       # API serializers with validation logic
    analytics_views.py   # Pipeline analytics endpoint
  jobs/                  # Job posting management
    models.py            # Job model (Open/Paused/Closed)
    views.py             # CRUD + close/hold with notifications
    services.py          # Role status email service
  scheduling/            # Interview scheduling
    models.py            # InterviewSlot, SchedulingRequest
    views.py             # Slot mgmt, reschedule, follow-up
    services.py          # Google Calendar, email, AI ranking
  interviews/            # Interview management
    models.py            # Interview with transcript/feedback
    views.py             # Transcript CRUD, live lines, finalize
    services.py          # AI analysis, Fireflies integration
  offers/                # Offer letter management
    models.py            # OfferLetter with signature data
    views.py             # Generate, send, sign endpoints
    services.py          # AI offer generation, email services
  onboarding/            # Slack onboarding automation
    models.py            # OnboardingRecord
    views.py             # Trigger, webhook, manual check
    services.py          # Slack API, welcome msg, HR notify
  frontend/
    src/
      App.jsx            # Routes (candidate + admin portals)
      api.js             # Axios HTTP client
      pages/             # All page components
  requirements.txt       # Python dependencies
  .env.example           # Environment variable template
  manage.py              # Django management command
```

---

For detailed technical architecture, edge case documentation, assumptions, and trade-offs, see **[ARCHITECTURE.md](./ARCHITECTURE.md)**.
