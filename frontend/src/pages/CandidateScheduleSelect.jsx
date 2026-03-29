import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API from '../api';

const CandidateScheduleSelect = () => {
  const { candidateId } = useParams();
  const [candidateName, setCandidateName] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedSlot, setConfirmedSlot] = useState(null);
  const [error, setError] = useState(null);

  // Request different time state
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestNote, setRequestNote] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get(`/scheduling/candidate-slots/${candidateId}/`);
      const data = res.data;

      setCandidateName(data.candidate_name || '');

      if (data.confirmed && data.confirmed_slot) {
        setConfirmed(true);
        setConfirmedSlot(data.confirmed_slot);
        return;
      }

      const tentativeSlots = (data.slots || []).filter((s) => s.status === 'tentative');
      setSlots(tentativeSlots);
    } catch (err) {
      console.error('Failed to load slots:', err);
      setError('Failed to load available time slots. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [candidateId]);

  const handleSelect = async (slotId) => {
    setSelecting(slotId);
    setError(null);
    try {
      const res = await API.post('/scheduling/candidate-select/', { slot_id: slotId });
      setConfirmed(true);
      setConfirmedSlot(res.data.slot || null);
    } catch (err) {
      setError('Failed to select this time slot. It may no longer be available.');
    } finally {
      setSelecting(null);
    }
  };

  const handleRequestDifferentTime = async () => {
    if (!requestNote && !preferredDate) {
      setError('Please provide your preferred time or a note explaining your availability.');
      return;
    }
    setRequestSubmitting(true);
    setError(null);
    try {
      await API.post('/scheduling/request-reschedule/', {
        candidate_id: candidateId,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        note: requestNote,
      });
      setRequestSent(true);
    } catch (err) {
      setError('Failed to submit your request. Please try again.');
    } finally {
      setRequestSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  // Inject keyframes for spinner animation
  useEffect(() => {
    const styleId = 'niural-schedule-keyframes';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&display=swap');
        @keyframes niuralSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes niuralFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(styleEl);
    }
  }, []);

  if (loading) {
    return (
      <div style={styles.centerWrap}>
        <div style={styles.spinner} />
        <p style={styles.loaderText}>Loading available times...</p>
      </div>
    );
  }

  // Confirmed state
  if (confirmed) {
    return (
      <div style={styles.centerWrap}>
        <div style={styles.successCard}>
          <div style={styles.checkIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 style={styles.successTitle}>Interview Confirmed!</h2>
          {confirmedSlot && (
            <div style={styles.confirmedDetails}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Date</span>
                <span style={styles.detailValue}>{formatDate(confirmedSlot.start_time)}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Time</span>
                <span style={styles.detailValue}>
                  {formatTime(confirmedSlot.start_time)} – {formatTime(confirmedSlot.end_time)}
                </span>
              </div>
            </div>
          )}
          <p style={styles.successText}>
            You will receive a confirmation email with the meeting details shortly.
          </p>
        </div>
      </div>
    );
  }

  // Request sent state
  if (requestSent) {
    return (
      <div style={styles.centerWrap}>
        <div style={styles.successCard}>
          <div style={{ ...styles.checkIcon, background: 'linear-gradient(135deg, #714DFF 0%, #E151FF 100%)' }}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>&#9993;</span>
          </div>
          <h2 style={styles.successTitle}>Request Submitted!</h2>
          <p style={styles.successText}>
            We've received your request for a different interview time.
            The interviewer will review your preferences and you'll receive
            an email with new available slots shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.heading}>Select Your Interview Time</h1>
        {candidateName && (
          <p style={styles.greeting}>Hi {candidateName}, please choose a time that works for you.</p>
        )}
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {slots.length === 0 ? (
        <div style={styles.emptyWrap}>
          <p style={styles.emptyText}>
            No available time slots at the moment. Please check back later or contact the recruiter.
          </p>
        </div>
      ) : (
        <>
          <div style={styles.slotGrid}>
            {slots.map((slot) => (
              <div
                key={slot.id}
                style={{
                  ...styles.slotCard,
                  ...(selecting === slot.id
                    ? { borderColor: '#714DFF', boxShadow: '0 8px 24px rgba(113,77,255,0.18)' }
                    : {}),
                }}
                onMouseEnter={(e) => {
                  if (selecting !== slot.id) {
                    e.currentTarget.style.borderColor = '#714DFF';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(113,77,255,0.12)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selecting !== slot.id) {
                    e.currentTarget.style.borderColor = '#e8e8e8';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                <div style={styles.slotDate}>{formatDate(slot.start_time)}</div>
                <div style={styles.slotTime}>
                  {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                </div>
                <div style={styles.slotDuration}>45 minutes</div>
                <button
                  style={{
                    ...styles.selectBtn,
                    opacity: selecting !== null ? 0.6 : 1,
                  }}
                  onClick={() => handleSelect(slot.id)}
                  disabled={selecting !== null}
                  onMouseEnter={(e) => {
                    if (selecting === null) {
                      e.currentTarget.style.transform = 'scale(1.03)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(113,77,255,0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {selecting === slot.id ? 'Confirming...' : 'Select This Time'}
                </button>
              </div>
            ))}
          </div>

          {/* Request Different Time Section */}
          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>None of these work?</span>
            <div style={styles.dividerLine} />
          </div>

          {!showRequestForm ? (
            <div style={{ textAlign: 'center' }}>
              <button
                style={styles.requestBtn}
                onClick={() => setShowRequestForm(true)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#714DFF';
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.borderColor = '#714DFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#714DFF';
                  e.currentTarget.style.borderColor = '#714DFF';
                }}
              >
                Request a Different Time
              </button>
            </div>
          ) : (
            <div style={styles.requestForm}>
              <h3 style={styles.requestTitle}>Request Alternative Time</h3>
              <p style={styles.requestSubtext}>
                Let us know your preferred time and we'll check with the interviewer.
              </p>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Preferred Date</label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    style={styles.formInput}
                    min={new Date().toISOString().split('T')[0]}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#714DFF';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(113,77,255,0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e8e8e8';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Preferred Time</label>
                  <input
                    type="time"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    style={styles.formInput}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#714DFF';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(113,77,255,0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e8e8e8';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Additional Notes</label>
                <textarea
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  placeholder="E.g., I'm available Monday–Wednesday afternoons, or after 3 PM on weekdays..."
                  rows={3}
                  style={{ ...styles.formInput, resize: 'vertical' }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#714DFF';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(113,77,255,0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e8e8e8';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  style={styles.submitRequestBtn}
                  onClick={handleRequestDifferentTime}
                  disabled={requestSubmitting}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.03)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(113,77,255,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {requestSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  style={styles.cancelBtn}
                  onClick={() => setShowRequestForm(false)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f5f5f5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const styles = {
  page: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '48px 20px',
    fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  header: { textAlign: 'center', marginBottom: 36 },
  heading: {
    fontSize: 32,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #714DFF 0%, #E151FF 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: '0 0 10px',
    letterSpacing: '-0.02em',
  },
  greeting: { fontSize: 15, color: '#6b7280', margin: 0, lineHeight: 1.6 },

  slotGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  slotCard: {
    background: '#fff',
    border: '1.5px solid #e8e8e8',
    borderRadius: '1.75rem',
    padding: 28,
    textAlign: 'center',
    transition: 'all 0.25s ease',
    cursor: 'default',
  },
  slotDate: {
    fontSize: 15,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
    letterSpacing: '-0.01em',
  },
  slotTime: {
    fontSize: 22,
    fontWeight: 700,
    color: '#714DFF',
    marginBottom: 6,
    letterSpacing: '-0.01em',
  },
  slotDuration: { fontSize: 13, color: '#9ca3af', marginBottom: 20 },
  selectBtn: {
    width: '100%',
    padding: '13px 0',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, #714DFF 0%, #E151FF 100%)',
    border: 'none',
    borderRadius: 9999,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    letterSpacing: '-0.01em',
  },

  // Divider
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '36px 0',
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: '#e8e8e8',
  },
  dividerText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },

  // Request different time
  requestBtn: {
    padding: '12px 28px',
    fontSize: 14,
    fontWeight: 600,
    color: '#714DFF',
    background: 'transparent',
    border: '1.5px solid #714DFF',
    borderRadius: 9999,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    letterSpacing: '-0.01em',
  },
  requestForm: {
    background: '#fff',
    border: '1.5px solid #e8e8e8',
    borderRadius: '1.75rem',
    padding: 32,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 4px',
    letterSpacing: '-0.02em',
  },
  requestSubtext: { fontSize: 14, color: '#6b7280', margin: '0 0 24px' },
  formRow: { display: 'flex', gap: 16, marginBottom: 16 },
  formGroup: { flex: 1 },
  formLabel: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 8,
    letterSpacing: '-0.01em',
  },
  formInput: {
    width: '100%',
    padding: '11px 14px',
    fontSize: 14,
    border: '1.5px solid #e8e8e8',
    borderRadius: 12,
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    outline: 'none',
    fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  submitRequestBtn: {
    padding: '12px 28px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, #714DFF 0%, #E151FF 100%)',
    border: 'none',
    borderRadius: 9999,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    letterSpacing: '-0.01em',
  },
  cancelBtn: {
    padding: '12px 28px',
    fontSize: 14,
    fontWeight: 500,
    color: '#6b7280',
    background: 'transparent',
    border: '1.5px solid #e8e8e8',
    borderRadius: 9999,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  // Success
  centerWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  successCard: {
    textAlign: 'center',
    background: '#fff',
    border: '1.5px solid #e8e8e8',
    borderRadius: '1.75rem',
    padding: '44px 48px',
    maxWidth: 480,
    position: 'relative',
    overflow: 'hidden',
  },
  checkIcon: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #714DFF 0%, #E151FF 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    color: '#fff',
    fontSize: 28,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #714DFF 0%, #E151FF 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: '0 0 16px',
    letterSpacing: '-0.02em',
  },
  successText: { fontSize: 15, color: '#6b7280', margin: 0, lineHeight: 1.7 },
  confirmedDetails: {
    background: '#faf8ff',
    borderRadius: 16,
    padding: 20,
    margin: '20px 0',
    border: '1px solid #ede8ff',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
  },
  detailLabel: { fontSize: 14, color: '#6b7280', fontWeight: 500 },
  detailValue: { fontSize: 14, color: '#1a1a2e', fontWeight: 600 },

  // Error / Empty
  errorBanner: {
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: 12,
    padding: '12px 16px',
    marginBottom: 20,
    fontSize: 14,
    fontWeight: 500,
  },
  emptyWrap: { textAlign: 'center', padding: '60px 0' },
  emptyText: { color: '#6b7280', fontSize: 15, lineHeight: 1.6 },
  spinner: {
    width: 40,
    height: 40,
    border: '4px solid #ede8ff',
    borderTop: '4px solid #714DFF',
    borderRadius: '50%',
    animation: 'niuralSpin 0.8s linear infinite',
  },
  loaderText: { marginTop: 16, color: '#6b7280', fontSize: 15 },
};

export default CandidateScheduleSelect;
