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
          <div style={styles.checkIcon}>✓</div>
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
          <div style={{ ...styles.checkIcon, color: '#2563eb' }}>📩</div>
          <h2 style={{ ...styles.successTitle, color: '#1e40af' }}>Request Submitted!</h2>
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
                  ...(selecting === slot.id ? { borderColor: '#4f46e5', boxShadow: '0 0 0 2px rgba(79,70,229,0.2)' } : {}),
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
                >
                  {selecting === slot.id ? 'Confirming...' : 'Select This Time'}
                </button>
              </div>
            ))}
          </div>

          {/* Request Different Time Section */}
          <div style={styles.divider}>
            <span style={styles.dividerText}>None of these work?</span>
          </div>

          {!showRequestForm ? (
            <div style={{ textAlign: 'center' }}>
              <button
                style={styles.requestBtn}
                onClick={() => setShowRequestForm(true)}
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
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Preferred Time</label>
                  <input
                    type="time"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    style={styles.formInput}
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
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  style={styles.submitRequestBtn}
                  onClick={handleRequestDifferentTime}
                  disabled={requestSubmitting}
                >
                  {requestSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  style={styles.cancelBtn}
                  onClick={() => setShowRequestForm(false)}
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
    padding: '40px 20px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  header: { textAlign: 'center', marginBottom: 32 },
  heading: { fontSize: 28, fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' },
  greeting: { fontSize: 15, color: '#6b7280', margin: 0 },

  slotGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  slotCard: {
    background: '#fff',
    border: '2px solid #e5e7eb',
    borderRadius: 12,
    padding: 24,
    textAlign: 'center',
    transition: 'all 0.2s',
    cursor: 'default',
  },
  slotDate: { fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 4 },
  slotTime: { fontSize: 22, fontWeight: 700, color: '#4f46e5', marginBottom: 4 },
  slotDuration: { fontSize: 13, color: '#9ca3af', marginBottom: 16 },
  selectBtn: {
    width: '100%',
    padding: '12px 0',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    background: '#4f46e5',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },

  // Divider
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '32px 0',
    gap: 16,
  },
  dividerText: {
    flex: 1,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
    position: 'relative',
  },

  // Request different time
  requestBtn: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 500,
    color: '#4f46e5',
    background: '#eef2ff',
    border: '1px solid #c7d2fe',
    borderRadius: 8,
    cursor: 'pointer',
  },
  requestForm: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 24,
  },
  requestTitle: { fontSize: 18, fontWeight: 600, color: '#1a1a2e', margin: '0 0 4px' },
  requestSubtext: { fontSize: 14, color: '#6b7280', margin: '0 0 20px' },
  formRow: { display: 'flex', gap: 16, marginBottom: 16 },
  formGroup: { flex: 1 },
  formLabel: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    boxSizing: 'border-box',
  },
  submitRequestBtn: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    background: '#4f46e5',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 500,
    color: '#6b7280',
    background: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    cursor: 'pointer',
  },

  // Success
  centerWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  successCard: {
    textAlign: 'center',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 16,
    padding: '40px 48px',
    maxWidth: 480,
  },
  checkIcon: { fontSize: 48, color: '#059669', marginBottom: 12 },
  successTitle: { fontSize: 24, fontWeight: 700, color: '#065f46', margin: '0 0 16px' },
  successText: { fontSize: 15, color: '#374151', margin: 0, lineHeight: 1.6 },
  confirmedDetails: {
    background: '#fff',
    borderRadius: 8,
    padding: 16,
    margin: '16px 0',
    border: '1px solid #d1fae5',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
  },
  detailLabel: { fontSize: 14, color: '#6b7280', fontWeight: 500 },
  detailValue: { fontSize: 14, color: '#1a1a2e', fontWeight: 600 },

  // Error / Empty
  errorBanner: {
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '10px 16px',
    marginBottom: 16,
    fontSize: 14,
  },
  emptyWrap: { textAlign: 'center', padding: '60px 0' },
  emptyText: { color: '#6b7280', fontSize: 15, lineHeight: 1.6 },
  spinner: {
    width: 40,
    height: 40,
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #4f46e5',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loaderText: { marginTop: 16, color: '#6b7280', fontSize: 15 },
};

export default CandidateScheduleSelect;
