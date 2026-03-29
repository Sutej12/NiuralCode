import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API from '../api';

const SchedulingPage = () => {
  const { candidateId } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [interviewerEmail, setInterviewerEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [followingUp, setFollowingUp] = useState(false);

  const fetchCandidate = async () => {
    try {
      const res = await API.get(`/candidates/${candidateId}/`);
      setCandidate(res.data);
    } catch (err) {
      setError('Failed to load candidate information.');
    }
  };

  const fetchSlots = async () => {
    try {
      const res = await API.get(`/scheduling/candidate-slots/${candidateId}/`);
      const data = res.data?.slots || (Array.isArray(res.data) ? res.data : res.data.results || []);
      setSlots(data);
    } catch (err) {
      // Slots may not exist yet
      setSlots([]);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchCandidate();
      await fetchSlots();
      setLoading(false);
    };
    init();
  }, [candidateId]);

  const handleSendSlots = async (e) => {
    e.preventDefault();
    if (!interviewerEmail.trim()) return;
    setSending(true);
    setError(null);
    setSuccessMsg('');
    try {
      await API.post('/scheduling/send-slots/', {
        candidate_id: candidateId,
        interviewer_email: interviewerEmail,
      });
      setSuccessMsg('Interview slots sent successfully.');
      setInterviewerEmail('');
      await fetchSlots();
    } catch (err) {
      setError('Failed to send interview slots. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleConfirmSlot = async (slotId) => {
    setConfirming(slotId);
    setError(null);
    try {
      await API.post('/scheduling/confirm-slot/', { slot_id: slotId });
      setSuccessMsg('Slot confirmed successfully.');
      await fetchSlots();
    } catch (err) {
      setError('Failed to confirm slot.');
    } finally {
      setConfirming(null);
    }
  };

  const handleFollowUp = async () => {
    setFollowingUp(true);
    setError(null);
    setSuccessMsg('');
    try {
      const res = await API.post('/scheduling/follow-up/', {
        candidate_id: candidateId,
      });
      setSuccessMsg(res.data.message || 'Follow-up email sent!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send follow-up email.');
    } finally {
      setFollowingUp(false);
    }
  };

  const hasTentativeSlots = slots.some((s) => s.status === 'tentative');
  const hasConfirmedSlot = slots.some((s) => s.status === 'confirmed');

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#065f46';
      case 'tentative': return '#92400e';
      case 'released': return '#6b7280';
      default: return '#374151';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'confirmed': return '#d1fae5';
      case 'tentative': return '#fef3c7';
      case 'released': return '#f3f4f6';
      default: return '#f3f4f6';
    }
  };

  if (loading) {
    return (
      <div style={styles.loaderWrap}>
        <div style={styles.spinner} />
        <p style={styles.loaderText}>Loading scheduling details...</p>
      </div>
    );
  }

  const candidateLink = `${window.location.origin}/candidate/schedule/${candidateId}`;

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Interview Scheduling</h1>

      {candidate && (
        <div style={styles.candidateInfo}>
          <h2 style={styles.candidateName}>
            {candidate.full_name}
          </h2>
          <p style={styles.statusText}>
            Status: <strong>{candidate.scheduling_status || candidate.status || 'Pending'}</strong>
          </p>
        </div>
      )}

      {error && <div style={styles.errorBanner}>{error}</div>}
      {successMsg && <div style={styles.successBanner}>{successMsg}</div>}

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Send Interview Slots</h3>
        <form onSubmit={handleSendSlots} style={styles.form}>
          <input
            type="email"
            placeholder="Interviewer email address"
            value={interviewerEmail}
            onChange={(e) => setInterviewerEmail(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" style={styles.btnPrimary} disabled={sending}>
            {sending ? 'Sending...' : 'Send Interview Slots'}
          </button>
        </form>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Candidate Scheduling Link</h3>
        <div style={styles.linkBox}>
          <code style={styles.linkCode}>{candidateLink}</code>
          <button
            style={styles.btnOutline}
            onClick={() => navigator.clipboard.writeText(candidateLink)}
          >
            Copy Link
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Sent Slots</h3>
        {slots.length === 0 ? (
          <p style={styles.emptyText}>No slots have been sent yet.</p>
        ) : (
          <div style={styles.slotList}>
            {slots.map((slot) => (
              <div key={slot.id} style={styles.slotCard}>
                <div style={styles.slotInfo}>
                  <p style={styles.slotDateTime}>
                    {new Date(slot.start_time || slot.date_time || slot.start).toLocaleString()}
                  </p>
                  <span
                    style={{
                      ...styles.statusBadge,
                      color: getStatusColor(slot.status),
                      background: getStatusBg(slot.status),
                    }}
                  >
                    {slot.status}
                  </span>
                </div>
                {slot.status !== 'confirmed' && (
                  <button
                    style={styles.btnConfirm}
                    onClick={() => handleConfirmSlot(slot.id)}
                    disabled={confirming === slot.id}
                  >
                    {confirming === slot.id ? 'Confirming...' : 'Confirm'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Follow Up Button */}
        {hasTentativeSlots && !hasConfirmedSlot && (
          <div style={{
            marginTop: 16, padding: '16px 20px',
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '1.75rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'all 0.3s ease',
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#92400e', fontFamily: "'Inter Tight', sans-serif" }}>
                Candidate hasn't responded yet
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280', fontFamily: "'Inter Tight', sans-serif" }}>
                Send a reminder email to select a slot or request a different time.
              </p>
            </div>
            <button
              onClick={handleFollowUp}
              disabled={followingUp}
              style={{
                padding: '8px 20px', fontSize: 13, fontWeight: 600,
                color: '#fff', background: '#d97706', border: 'none',
                borderRadius: 9999, cursor: followingUp ? 'not-allowed' : 'pointer',
                opacity: followingUp ? 0.6 : 1, whiteSpace: 'nowrap',
                fontFamily: "'Inter Tight', sans-serif",
                transition: 'all 0.3s ease',
              }}
            >
              {followingUp ? 'Sending...' : '📧 Send Follow-Up'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  heading: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 24px',
    fontFamily: "'Inter Tight', sans-serif",
  },
  candidateInfo: {
    background: '#f9fafb',
    border: '1px solid #e8e8e8',
    borderRadius: '1.75rem',
    padding: 20,
    marginBottom: 24,
    transition: 'all 0.3s ease',
  },
  candidateName: {
    fontSize: 20,
    fontWeight: 600,
    color: '#1a1a2e',
    margin: '0 0 8px',
    fontFamily: "'Inter Tight', sans-serif",
  },
  statusText: {
    fontSize: 14,
    color: '#6b7280',
    margin: 0,
    fontFamily: "'Inter Tight', sans-serif",
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#1a1a2e',
    margin: '0 0 12px',
    fontFamily: "'Inter Tight', sans-serif",
  },
  form: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  input: {
    flex: '1 1 300px',
    padding: '10px 16px',
    fontSize: 14,
    border: '1px solid #e8e8e8',
    borderRadius: 12,
    outline: 'none',
    fontFamily: "'Inter Tight', sans-serif",
    transition: 'all 0.3s ease',
  },
  btnPrimary: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 500,
    color: '#fff',
    background: '#714DFF',
    border: 'none',
    borderRadius: 9999,
    cursor: 'pointer',
    fontFamily: "'Inter Tight', sans-serif",
    transition: 'all 0.3s ease',
  },
  btnOutline: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: '#714DFF',
    background: '#fff',
    border: '1px solid #714DFF',
    borderRadius: 9999,
    cursor: 'pointer',
    fontFamily: "'Inter Tight', sans-serif",
    transition: 'all 0.3s ease',
  },
  btnConfirm: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: '#fff',
    background: '#059669',
    border: 'none',
    borderRadius: 9999,
    cursor: 'pointer',
    fontFamily: "'Inter Tight', sans-serif",
    transition: 'all 0.3s ease',
  },
  linkBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#f9fafb',
    border: '1px solid #e8e8e8',
    borderRadius: '1.75rem',
    padding: '12px 16px',
    transition: 'all 0.3s ease',
  },
  linkCode: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    wordBreak: 'break-all',
    fontFamily: "'Inter Tight', sans-serif",
  },
  slotList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  slotCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#fff',
    border: '1px solid #e8e8e8',
    borderRadius: '1.75rem',
    padding: '14px 18px',
    transition: 'all 0.3s ease',
  },
  slotInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  slotDateTime: {
    fontSize: 14,
    fontWeight: 500,
    color: '#1a1a2e',
    margin: 0,
    fontFamily: "'Inter Tight', sans-serif",
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 9999,
    padding: '3px 10px',
    fontFamily: "'Inter Tight', sans-serif",
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    fontFamily: "'Inter Tight', sans-serif",
  },
  errorBanner: {
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '1.75rem',
    padding: '10px 16px',
    marginBottom: 16,
    fontSize: 14,
    fontFamily: "'Inter Tight', sans-serif",
    transition: 'all 0.3s ease',
  },
  successBanner: {
    background: '#f0fdf4',
    color: '#166534',
    border: '1px solid #bbf7d0',
    borderRadius: '1.75rem',
    padding: '10px 16px',
    marginBottom: 16,
    fontSize: 14,
    fontFamily: "'Inter Tight', sans-serif",
    transition: 'all 0.3s ease',
  },
  loaderWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '4px solid #e8e8e8',
    borderTop: '4px solid #714DFF',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loaderText: {
    marginTop: 16,
    color: '#6b7280',
    fontSize: 15,
    fontFamily: "'Inter Tight', sans-serif",
  },
};

export default SchedulingPage;
