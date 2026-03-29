from datetime import timedelta

from django.db.models import Count, Avg, Q, F, ExpressionWrapper, DurationField
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Candidate, StatusHistory
from jobs.models import Job


PIPELINE_STAGES = [
    'Applied', 'Screened', 'Shortlisted', 'In Interview',
    'Offer', 'Hired', 'Onboarded',
]


@api_view(['GET'])
@permission_classes([AllowAny])
def analytics_view(request):
    """Return aggregated hiring analytics data."""

    candidates = Candidate.objects.all()

    # ── Pipeline Snapshot ──────────────────────────────────────────
    status_counts = dict(
        candidates.values_list('status')
        .annotate(count=Count('id'))
        .values_list('status', 'count')
    )
    pipeline_snapshot = {s: status_counts.get(s, 0) for s in [
        'Applied', 'Screened', 'Shortlisted', 'In Interview',
        'Offer', 'Hired', 'Onboarded', 'Rejected',
    ]}

    # ── Funnel ─────────────────────────────────────────────────────
    funnel = []
    prev_count = None
    for stage in PIPELINE_STAGES:
        count = pipeline_snapshot.get(stage, 0)
        conversion = None
        if prev_count is not None and prev_count > 0:
            conversion = round(count / prev_count * 100, 1)
        funnel.append({
            'stage': stage,
            'count': count,
            'conversion': conversion,
        })
        prev_count = count

    # ── AI Score Distribution ──────────────────────────────────────
    scored = candidates.exclude(ai_score__isnull=True)
    ai_score_distribution = [
        {'bucket': '0-30', 'count': scored.filter(ai_score__gte=0, ai_score__lte=30).count()},
        {'bucket': '31-50', 'count': scored.filter(ai_score__gte=31, ai_score__lte=50).count()},
        {'bucket': '51-70', 'count': scored.filter(ai_score__gte=51, ai_score__lte=70).count()},
        {'bucket': '71-100', 'count': scored.filter(ai_score__gte=71, ai_score__lte=100).count()},
    ]

    # ── Per-Role Stats ─────────────────────────────────────────────
    jobs = Job.objects.all()
    per_role_stats = []
    for job in jobs:
        job_candidates = candidates.filter(job=job)
        status_breakdown = dict(
            job_candidates.values_list('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )
        avg_score = job_candidates.exclude(ai_score__isnull=True).aggregate(
            avg=Avg('ai_score')
        )['avg']
        per_role_stats.append({
            'job_id': job.id,
            'title': job.title,
            'total': job_candidates.count(),
            'avg_ai_score': round(avg_score, 1) if avg_score else None,
            'by_status': status_breakdown,
        })

    # ── Time Metrics ───────────────────────────────────────────────
    now = timezone.now()

    # Average days per stage (from StatusHistory)
    all_statuses = ['Applied', 'Screened', 'Shortlisted', 'In Interview', 'Offer', 'Hired', 'Onboarded']
    stage_durations = {}
    for status_val in all_statuses:
        # Find transitions OUT of this status
        transitions = StatusHistory.objects.filter(old_status=status_val)
        if transitions.exists():
            total_days = 0
            count = 0
            for t in transitions:
                # Find when they entered this status
                entry = StatusHistory.objects.filter(
                    candidate=t.candidate,
                    new_status=status_val,
                    created_at__lt=t.created_at,
                ).order_by('-created_at').first()
                if entry:
                    delta = (t.created_at - entry.created_at).total_seconds() / 86400
                    total_days += delta
                    count += 1
                elif status_val == 'Applied':
                    # For Applied, use candidate created_at
                    delta = (t.created_at - t.candidate.created_at).total_seconds() / 86400
                    total_days += delta
                    count += 1
            if count > 0:
                stage_durations[status_val] = round(total_days / count, 1)

    # Average days from Applied to Hired
    hired_candidates = candidates.filter(status='Hired')
    avg_time_to_hire = None
    if hired_candidates.exists():
        total_days = 0
        count = 0
        for c in hired_candidates:
            hired_event = c.status_history.filter(new_status='Hired').order_by('created_at').first()
            if hired_event:
                delta = (hired_event.created_at - c.created_at).total_seconds() / 86400
                total_days += delta
                count += 1
        if count > 0:
            avg_time_to_hire = round(total_days / count, 1)

    time_metrics = {
        'avg_days_to_hire': avg_time_to_hire,
        'avg_days_per_stage': stage_durations,
    }

    # ── Role Health ────────────────────────────────────────────────
    role_health = []
    for job in jobs:
        days_open = (now - job.created_at).days
        job_candidates = candidates.filter(job=job)
        avg_score = job_candidates.exclude(ai_score__isnull=True).aggregate(
            avg=Avg('ai_score')
        )['avg']
        role_health.append({
            'job_id': job.id,
            'title': job.title,
            'status': job.status,
            'candidate_count': job_candidates.count(),
            'days_open': days_open,
            'avg_ai_score': round(avg_score, 1) if avg_score else None,
        })

    return Response({
        'pipeline_snapshot': pipeline_snapshot,
        'funnel': funnel,
        'ai_score_distribution': ai_score_distribution,
        'per_role_stats': per_role_stats,
        'time_metrics': time_metrics,
        'role_health': role_health,
    })
