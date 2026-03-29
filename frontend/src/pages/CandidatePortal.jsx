import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

const STATUS_CONFIG = {
  Applied: { color: '#4f46e5', bg: '#eef2ff', icon: '📄', label: 'Application Submitted' },
  Screened: { color: '#1e40af', bg: '#dbeafe', icon: '🔍', label: 'Resume Screened' },
  Shortlisted: { color: '#854d0e', bg: '#fef9c3', icon: '⭐', label: 'Shortlisted' },
  'In Interview': { color: '#9d174d', bg: '#fce7f3', icon: '🎙️', label: 'Interview Stage' },
  Offer: { color: '#065f46', bg: '#d1fae5', icon: '📋', label: 'Offer Extended' },
  Hired: { color: '#166534', bg: '#bbf7d0', icon: '🎉', label: 'Hired' },
  Onboarded: { color: '#064e3b', bg: '#a7f3d0', icon: '🚀', label: 'Onboarded' },
  Rejected: { color: '#991b1b', bg: '#fee2e2', icon: '📭', label: 'Not Selected' },
};

const ALL_STAGES = ['Applied', 'Screened', 'Shortlisted', 'In Interview', 'Offer', 'Hired'];

const NEXT_STEP_MESSAGES = {
  Applied: 'Your application is being reviewed by our team. We will screen your resume and get back to you shortly.',
  Screened: 'Your resume has been reviewed. We are evaluating candidates for the next round.',
  Shortlisted: 'Congratulations! You have been shortlisted. Please select an interview slot below, or check your email for a scheduling link.',
  'In Interview': 'Your interview is scheduled. The interview details and meeting link have been sent to your email.',
  Offer: 'An offer letter has been sent to your email. Please review and sign it at your earliest convenience.',
  Hired: 'Welcome aboard! You will receive onboarding instructions shortly. We are excited to have you on the team!',
  Onboarded: 'You are all set! Your onboarding is complete. Welcome to the team!',
  Rejected: 'Thank you for your interest. Unfortunately, we have decided to move forward with other candidates. We encourage you to apply for future openings.',
};

function fmtDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
function fmtDateTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtSlotDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
function fmtSlotTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
}
function getStageIndex(status) {
  if (status === 'Onboarded') return ALL_STAGES.length;
  const idx = ALL_STAGES.indexOf(status);
  return idx >= 0 ? idx : -1;
}

export default function CandidatePortal() {
  const { candidateId, token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Scheduling state
  const [selecting, setSelecting] = useState(null);
  const [slotConfirmed, setSlotConfirmed] = useState(false);
  const [confirmedSlotData, setConfirmedSlotData] = useState(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestNote, setRequestNote] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [schedMsg, setSchedMsg] = useState('');
  const [schedError, setSchedError] = useState('');

  const fetchPortal = async () => {
    try {
      const res = await api.get(`/candidates/portal/${candidateId}/${token}/`);
      setData(res.data);
      // Check if already confirmed
      if (res.data.scheduling?.status === 'confirmed') {
        setSlotConfirmed(true);
        setConfirmedSlotData(res.data.scheduling.confirmed_slot);
      }
    } catch (err) {
      if (err.response?.status === 403) setError('This link is invalid or has expired.');
      else if (err.response?.status === 404) setError('Application not found.');
      else setError('Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortal();
  }, [candidateId, token]);

  // --- Scheduling handlers ---
  const handleSelectSlot = async (slotId) => {
    setSelecting(slotId);
    setSchedError('');
    try {
      const res = await api.post('/scheduling/candidate-select/', { slot_id: slotId });
      setSlotConfirmed(true);
      setConfirmedSlotData(res.data.slot || null);
      setSchedMsg('Interview confirmed!');
      // Refresh portal data
      fetchPortal();
    } catch {
      setSchedError('Failed to select this slot. It may no longer be available.');
    } finally {
      setSelecting(null);
    }
  };

  const handleRequestDifferentTime = async () => {
    if (!requestNote && !preferredDate) {
      setSchedError('Please provide your preferred time or a note.');
      return;
    }
    setRequestSubmitting(true);
    setSchedError('');
    try {
      await api.post('/scheduling/request-reschedule/', {
        candidate_id: candidateId,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        note: requestNote,
      });
      setRequestSent(true);
    } catch {
      setSchedError('Failed to submit request. Please try again.');
    } finally {
      setRequestSubmitting(false);
    }
  };

  // --- Render ---
  if (loading) {
    return (
      <div style={S.centerWrap}>
        <div style={S.spinner} />
        <p style={S.loadingText}>Loading your application status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={S.centerWrap}>
        <div style={S.errorCard}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ color: '#991b1b', margin: '0 0 8px' }}>{error}</h2>
          <p style={{ color: '#6b7280', fontSize: 14 }}>If you believe this is a mistake, please contact the hiring team.</p>
          <Link to="/" style={S.homeLink}>Browse Open Positions</Link>
        </div>
      </div>
    );
  }

  const statusConf = STATUS_CONFIG[data.status] || STATUS_CONFIG.Applied;
  const isRejected = data.status === 'Rejected';
  const currentStageIdx = getStageIndex(data.status);
  const timeline = data.status_timeline || [];
  const sched = data.scheduling;
  const interview = data.interview;
  const hasSlots = sched && sched.status === 'pending' && sched.slots?.length > 0;
  const isConfirmedSlot = slotConfirmed || sched?.status === 'confirmed';
  const confirmedSlot = confirmedSlotData || sched?.confirmed_slot;
  const showScheduling = ['Shortlisted', 'In Interview'].includes(data.status) && sched;
  const showInterviewNote = ['In Interview'].includes(data.status);

  return (
    <div style={S.page}>
      {/* Hero */}
      <div style={S.hero}>
        <div style={S.heroInner}>
          <div style={S.heroIcon}>{statusConf.icon}</div>
          <h1 style={S.heroTitle}>Hi, {data.full_name}!</h1>
          <p style={S.heroSubtitle}>
            Your application for <strong>{data.job_title}</strong>
            {data.company && data.company !== 'Niural Inc.' ? ` at ${data.company}` : ''}
          </p>
          <div style={{ ...S.statusBadge, background: statusConf.bg, color: statusConf.color }}>
            {statusConf.label}
          </div>
        </div>
      </div>

      <div style={S.content}>
        {/* Progress Pipeline */}
        {!isRejected && (
          <div style={S.card}>
            <h2 style={S.cardTitle}>Application Progress</h2>
            <div style={S.pipeline}>
              {ALL_STAGES.map((stage, idx) => {
                const isCompleted = idx < currentStageIdx;
                const isCurrent = idx === currentStageIdx;
                const conf = STATUS_CONFIG[stage];
                return (
                  <React.Fragment key={stage}>
                    <div style={S.pipelineStep}>
                      <div style={{
                        ...S.pipelineCircle,
                        background: isCompleted ? '#059669' : isCurrent ? conf.color : '#e5e7eb',
                        color: (isCompleted || isCurrent) ? '#fff' : '#9ca3af',
                        boxShadow: isCurrent ? `0 0 0 4px ${conf.bg}` : 'none',
                      }}>
                        {isCompleted ? '\u2713' : conf.icon}
                      </div>
                      <span style={{
                        ...S.pipelineLabel,
                        color: isCompleted ? '#059669' : isCurrent ? conf.color : '#9ca3af',
                        fontWeight: isCurrent ? 700 : 500,
                      }}>{stage}</span>
                    </div>
                    {idx < ALL_STAGES.length - 1 && (
                      <div style={{ ...S.pipelineConnector, background: isCompleted ? '#059669' : '#e5e7eb' }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div style={{ ...S.card, borderLeft: `4px solid ${statusConf.color}` }}>
          <h2 style={S.cardTitle}>{isRejected ? 'Application Update' : "What's Next?"}</h2>
          <p style={S.nextStepText}>{NEXT_STEP_MESSAGES[data.status]}</p>
        </div>

        {/* ============ SCHEDULING SECTION ============ */}
        {showScheduling && (
          <div style={{ ...S.card, border: '2px solid #c7d2fe' }}>
            <h2 style={S.cardTitle}>📅 Interview Scheduling</h2>

            {schedError && <div style={S.errorBanner}>{schedError}</div>}
            {schedMsg && <div style={S.successBanner}>{schedMsg}</div>}

            {/* Already confirmed */}
            {isConfirmedSlot && confirmedSlot && (
              <div style={S.confirmedBox}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <h3 style={{ margin: '0 0 12px', color: '#065f46', fontSize: 18 }}>Interview Confirmed!</h3>
                <div style={S.confirmedDetails}>
                  <div style={S.detailRowInline}>
                    <span style={S.dlabel}>Date</span>
                    <span style={S.dvalue}>{fmtSlotDate(confirmedSlot.start_time)}</span>
                  </div>
                  <div style={S.detailRowInline}>
                    <span style={S.dlabel}>Time</span>
                    <span style={S.dvalue}>{fmtSlotTime(confirmedSlot.start_time)} – {fmtSlotTime(confirmedSlot.end_time)}</span>
                  </div>
                  {confirmedSlot.meet_link && (
                    <div style={S.detailRowInline}>
                      <span style={S.dlabel}>Meeting</span>
                      <a href={confirmedSlot.meet_link} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#4f46e5', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                        Join Google Meet
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tentative slots to select */}
            {hasSlots && !isConfirmedSlot && !requestSent && (
              <>
                <p style={{ color: '#374151', fontSize: 14, marginBottom: 16 }}>
                  Please select a time slot that works best for you:
                </p>
                <div style={S.slotGrid}>
                  {sched.slots.map((slot) => (
                    <div key={slot.id} style={{
                      ...S.slotCard,
                      ...(selecting === slot.id ? { borderColor: '#4f46e5', boxShadow: '0 0 0 2px rgba(79,70,229,0.2)' } : {}),
                    }}>
                      <div style={S.slotDate}>{fmtSlotDate(slot.start_time)}</div>
                      <div style={S.slotTime}>{fmtSlotTime(slot.start_time)} – {fmtSlotTime(slot.end_time)}</div>
                      <div style={S.slotDuration}>45 minutes</div>
                      <button
                        style={{ ...S.selectBtn, opacity: selecting !== null ? 0.6 : 1 }}
                        onClick={() => handleSelectSlot(slot.id)}
                        disabled={selecting !== null}
                      >
                        {selecting === slot.id ? 'Confirming...' : 'Select This Time'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Request different time */}
                <div style={S.divider}>
                  <span style={S.dividerLine} />
                  <span style={S.dividerText}>None of these work?</span>
                  <span style={S.dividerLine} />
                </div>

                {!showRequestForm ? (
                  <div style={{ textAlign: 'center' }}>
                    <button style={S.requestBtn} onClick={() => setShowRequestForm(true)}>
                      Request a Different Time
                    </button>
                  </div>
                ) : (
                  <div style={S.requestForm}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e', margin: '0 0 4px' }}>Request Alternative Time</h3>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>Let us know your preferred time and we'll check with the interviewer.</p>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <label style={S.formLabel}>Preferred Date</label>
                        <input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)}
                          style={S.formInput} min={new Date().toISOString().split('T')[0]} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={S.formLabel}>Preferred Time</label>
                        <input type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} style={S.formInput} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={S.formLabel}>Additional Notes</label>
                      <textarea value={requestNote} onChange={(e) => setRequestNote(e.target.value)}
                        placeholder="E.g., I'm available Monday–Wednesday afternoons..." rows={3}
                        style={{ ...S.formInput, resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button style={S.selectBtn} onClick={handleRequestDifferentTime} disabled={requestSubmitting}>
                        {requestSubmitting ? 'Submitting...' : 'Submit Request'}
                      </button>
                      <button style={S.requestBtn} onClick={() => setShowRequestForm(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Request sent confirmation */}
            {requestSent && !isConfirmedSlot && (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📩</div>
                <h3 style={{ color: '#1e40af', margin: '0 0 8px' }}>Request Submitted!</h3>
                <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
                  The interviewer will review your preferences and you'll receive new available slots shortly.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============ INTERVIEW NOTE ============ */}
        {showInterviewNote && (
          <div style={{ ...S.card, border: '2px solid #c7d2fe' }}>
            <h2 style={S.cardTitle}>🎙️ Interview</h2>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
              <p style={{ color: '#374151', fontSize: 15, margin: '0 0 8px', fontWeight: 600 }}>
                Interview details have been sent to your email
              </p>
              <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 16px', lineHeight: 1.6, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
                Please check your inbox for the meeting link and interview instructions.
                If you haven't received the email, please contact our hiring team.
              </p>
              {interview?.meeting_link && (
                <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-block', padding: '10px 24px', background: '#4f46e5', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
                  Join Meeting
                </a>
              )}
            </div>
          </div>
        )}

        {/* Two Column: Details + Timeline */}
        <div style={S.twoCol}>
          <div style={S.card}>
            <h2 style={S.cardTitle}>Application Details</h2>
            <div style={S.detailGrid}>
              <DetailRow label="Position" value={data.job_title} />
              {data.company && <DetailRow label="Company" value={data.company} />}
              {data.location && <DetailRow label="Location" value={data.location} />}
              {data.job_type && <DetailRow label="Type" value={data.job_type} />}
              <DetailRow label="Applied On" value={fmtDate(data.created_at)} />
              <DetailRow label="Last Updated" value={fmtDate(data.updated_at)} />
            </div>
          </div>

          <div style={S.card}>
            <h2 style={S.cardTitle}>Status Timeline</h2>
            {timeline.length > 0 ? (
              <div style={S.timeline}>
                {timeline.map((entry, idx) => {
                  const conf = STATUS_CONFIG[entry.status] || STATUS_CONFIG.Applied;
                  const isLast = idx === timeline.length - 1;
                  return (
                    <div key={idx} style={S.timelineItem}>
                      <div style={S.timelineDotCol}>
                        <div style={{
                          ...S.timelineDot,
                          background: isLast ? conf.color : '#d1d5db',
                          boxShadow: isLast ? `0 0 0 3px ${conf.bg}` : 'none',
                        }} />
                        {idx < timeline.length - 1 && <div style={S.timelineLine} />}
                      </div>
                      <div style={S.timelineContent}>
                        <div style={{ fontWeight: isLast ? 700 : 500, fontSize: 14, color: isLast ? conf.color : '#374151' }}>
                          {conf.label || entry.status}
                        </div>
                        <div style={S.timelineDate}>{fmtDateTime(entry.date)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: '#9ca3af', fontSize: 14 }}>No updates yet.</p>
            )}
          </div>
        </div>

        {/* Help */}
        <div style={S.helpCard}>
          <span style={{ fontSize: 24 }}>💬</span>
          <div>
            <p style={{ margin: 0, fontWeight: 600, color: '#374151', fontSize: 14 }}>Have questions about your application?</p>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>Reply to any email you've received from us, and our hiring team will get back to you.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={S.detailRow}>
      <span style={S.detailLabel}>{label}</span>
      <span style={S.detailValue}>{value || '—'}</span>
    </div>
  );
}

const S = {
  page: { minHeight: '80vh', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" },
  centerWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 20 },
  spinner: { width: 44, height: 44, border: '4px solid #e5e7eb', borderTop: '4px solid #4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loadingText: { marginTop: 16, color: '#6b7280', fontSize: 15 },
  errorCard: { textAlign: 'center', padding: 40, background: '#fff', borderRadius: 16, border: '1px solid #fecaca', maxWidth: 440 },
  homeLink: { display: 'inline-block', marginTop: 16, padding: '10px 24px', background: '#4f46e5', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 },

  hero: { background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4f46e5 100%)', padding: '48px 24px 40px', marginBottom: 0 },
  heroInner: { maxWidth: 700, margin: '0 auto', textAlign: 'center' },
  heroIcon: { fontSize: 48, marginBottom: 12 },
  heroTitle: { fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 8px' },
  heroSubtitle: { fontSize: 16, color: '#c7d2fe', margin: '0 0 20px', lineHeight: 1.5 },
  statusBadge: { display: 'inline-block', padding: '8px 20px', borderRadius: 9999, fontSize: 14, fontWeight: 700 },

  content: { maxWidth: 800, margin: '0 auto', padding: '28px 20px 60px' },
  card: { background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#1a1a2e', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.03em' },

  pipeline: { display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 0, flexWrap: 'wrap', padding: '8px 0' },
  pipelineStep: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 80 },
  pipelineCircle: { width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, transition: 'all 0.3s' },
  pipelineLabel: { fontSize: 11, textAlign: 'center', maxWidth: 80 },
  pipelineConnector: { width: 40, height: 3, borderRadius: 2, marginTop: 18, flexShrink: 0 },

  nextStepText: { fontSize: 15, color: '#374151', lineHeight: 1.7, margin: 0 },

  // Scheduling
  slotGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 },
  slotCard: { background: '#f9fafb', border: '2px solid #e5e7eb', borderRadius: 12, padding: 20, textAlign: 'center', transition: 'all 0.2s' },
  slotDate: { fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 },
  slotTime: { fontSize: 18, fontWeight: 700, color: '#4f46e5', marginBottom: 4 },
  slotDuration: { fontSize: 12, color: '#9ca3af', marginBottom: 14 },
  selectBtn: { width: '100%', padding: '10px 0', fontSize: 14, fontWeight: 600, color: '#fff', background: '#4f46e5', border: 'none', borderRadius: 8, cursor: 'pointer' },
  confirmedBox: { textAlign: 'center', padding: '16px 0' },
  confirmedDetails: { background: '#f0fdf4', borderRadius: 8, padding: 16, display: 'inline-block', minWidth: 300, border: '1px solid #bbf7d0' },
  detailRowInline: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', gap: 24 },
  dlabel: { fontSize: 13, color: '#6b7280', fontWeight: 500 },
  dvalue: { fontSize: 14, color: '#1a1a2e', fontWeight: 600 },
  divider: { display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' },
  dividerLine: { flex: 1, height: 1, background: '#e5e7eb' },
  dividerText: { fontSize: 13, color: '#9ca3af' },
  requestBtn: { padding: '10px 20px', fontSize: 14, fontWeight: 500, color: '#4f46e5', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, cursor: 'pointer' },
  requestForm: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 },
  formLabel: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 },
  formInput: { width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 8, boxSizing: 'border-box' },
  errorBanner: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 14 },
  successBanner: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 14 },

  // Details & Timeline
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  detailGrid: { display: 'flex', flexDirection: 'column', gap: 12 },
  detailRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' },
  detailLabel: { fontSize: 13, fontWeight: 500, color: '#6b7280' },
  detailValue: { fontSize: 14, fontWeight: 600, color: '#1a1a2e', textAlign: 'right' },
  timeline: { display: 'flex', flexDirection: 'column' },
  timelineItem: { display: 'flex', gap: 12, minHeight: 52 },
  timelineDotCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: '50%', flexShrink: 0, marginTop: 3 },
  timelineLine: { width: 2, flex: 1, background: '#e5e7eb', minHeight: 20 },
  timelineContent: { paddingBottom: 12 },
  timelineDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  helpCard: { display: 'flex', alignItems: 'center', gap: 16, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px' },
};
