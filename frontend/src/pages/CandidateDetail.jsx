import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

const STATUS_OPTIONS = [
  'Applied',
  'Screened',
  'Shortlisted',
  'In Interview',
  'Offer',
  'Hired',
  'Onboarded',
  'Rejected',
];

const STATUS_COLORS = {
  Applied: { bg: '#ede9fe', color: '#714DFF' },
  Screened: { bg: '#dbeafe', color: '#1e40af' },
  Shortlisted: { bg: '#fef9c3', color: '#854d0e' },
  'In Interview': { bg: '#fce7f3', color: '#9d174d' },
  Offer: { bg: '#d1fae5', color: '#065f46' },
  Hired: { bg: '#bbf7d0', color: '#166534' },
  Onboarded: { bg: '#a7f3d0', color: '#064e3b' },
  Rejected: { bg: '#fee2e2', color: '#991b1b' },
};

function getScoreColor(score) {
  if (score == null) return '#6b7280';
  if (score > 70) return '#16a34a';
  if (score >= 40) return '#ca8a04';
  return '#dc2626';
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function CandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusOverride, setStatusOverride] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [statusSuccess, setStatusSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const fetchCandidate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/candidates/${id}/`);
      setCandidate(res.data);
      setStatusOverride(res.data.status || '');
    } catch (err) {
      console.error('Failed to fetch candidate:', err);
      setError('Failed to load candidate details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidate();
  }, [id]);

  const handleStatusUpdate = async () => {
    if (!statusOverride) return;
    setStatusUpdating(true);
    setStatusError('');
    setStatusSuccess('');
    try {
      await api.patch(`/candidates/${id}/`, { status: statusOverride, note: statusNote });
      setStatusNote('');
      const action = statusOverride === 'Rejected' ? 'rejected (rejection email sent)' : `updated to ${statusOverride}`;
      setStatusSuccess(`Status ${action} successfully.`);
      await fetchCandidate();
    } catch (err) {
      console.error('Status update failed:', err);
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Status update failed. Please try again.';
      setStatusError(msg);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleScreen = async () => {
    setActionLoading((p) => ({ ...p, screen: true }));
    try {
      await api.post(`/candidates/${id}/screen/`);
      await fetchCandidate();
    } catch (err) {
      console.error('Screen failed:', err);
    } finally {
      setActionLoading((p) => ({ ...p, screen: false }));
    }
  };

  const handleResearch = async () => {
    setActionLoading((p) => ({ ...p, research: true }));
    try {
      await api.post(`/candidates/${id}/research/`);
      await fetchCandidate();
    } catch (err) {
      console.error('Research failed:', err);
    } finally {
      setActionLoading((p) => ({ ...p, research: false }));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
        Loading candidate details...
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <div style={{ color: '#dc2626', marginBottom: '16px' }}>{error || 'Candidate not found.'}</div>
        <button onClick={() => navigate('/admin')} style={linkBtnStyle}>Back to Dashboard</button>
      </div>
    );
  }

  const c = candidate;
  const statusColor = STATUS_COLORS[c.status] || { bg: '#f3f4f6', color: '#374151' };
  const parsed = c.parsed_resume;
  const research = c.research_profile;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/admin')}
        style={{ ...linkBtnStyle, marginBottom: '20px' }}
      >
        &larr; Back to Dashboard
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Header */}
          <Section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px' }}>
                  {c.full_name}
                </h1>
                <div style={{ color: '#6b7280', fontSize: '14px' }}>{c.email}</div>
                <div style={{ color: '#374151', fontSize: '14px', marginTop: '4px' }}>
                  {c.job_title || c.job?.title || '—'}
                </div>
              </div>
              <span style={{
                display: 'inline-block', padding: '6px 14px', borderRadius: '9999px',
                fontSize: '13px', fontWeight: 600,
                background: statusColor.bg, color: statusColor.color,
                transition: 'all 0.3s ease',
              }}>
                {c.status}
              </span>
            </div>
          </Section>

          {/* Contact */}
          {(c.linkedin_url || c.portfolio_url) && (
            <Section title="Contact">
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {c.linkedin_url && (
                  <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" style={extLinkStyle}>
                    LinkedIn
                  </a>
                )}
                {c.portfolio_url && (
                  <a href={c.portfolio_url} target="_blank" rel="noopener noreferrer" style={extLinkStyle}>
                    Portfolio
                  </a>
                )}
              </div>
            </Section>
          )}

          {/* Resume */}
          {c.resume && (
            <Section title="Resume">
              <a href={c.resume} target="_blank" rel="noopener noreferrer" style={extLinkStyle}>
                Download Resume
              </a>
            </Section>
          )}

          {/* AI Screening */}
          {(c.ai_score != null || c.ai_rationale) && (
            <Section title="AI Screening">
              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                {c.ai_score != null && (
                  <div style={{
                    fontSize: '48px', fontWeight: 800, lineHeight: 1,
                    color: getScoreColor(c.ai_score), minWidth: '80px', textAlign: 'center',
                  }}>
                    {c.ai_score}
                  </div>
                )}
                {c.ai_rationale && (
                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6, flex: 1 }}>
                    {c.ai_rationale}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Parsed Resume */}
          {parsed && (
            <Section title="Parsed Resume">
              {parsed.skills && parsed.skills.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <Label>Skills</Label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {parsed.skills.map((skill, i) => (
                      <span key={i} style={{
                        padding: '4px 10px', borderRadius: '9999px', fontSize: '12px',
                        background: '#ede9fe', color: '#714DFF', fontWeight: 500,
                        transition: 'all 0.3s ease',
                      }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {parsed.experience && (
                <div style={{ marginBottom: '16px' }}>
                  <Label>Experience</Label>
                  <PreText>{typeof parsed.experience === 'string' ? parsed.experience : JSON.stringify(parsed.experience, null, 2)}</PreText>
                </div>
              )}
              {parsed.education && (
                <div style={{ marginBottom: '16px' }}>
                  <Label>Education</Label>
                  <PreText>{typeof parsed.education === 'string' ? parsed.education : JSON.stringify(parsed.education, null, 2)}</PreText>
                </div>
              )}
              {parsed.achievements && (
                <div>
                  <Label>Achievements</Label>
                  <PreText>{typeof parsed.achievements === 'string' ? parsed.achievements : JSON.stringify(parsed.achievements, null, 2)}</PreText>
                </div>
              )}
            </Section>
          )}

          {/* Research Profile */}
          {(research || c.candidate_brief) && (
            <Section title="Research Profile">
              {research?.summary && (
                <div style={{ marginBottom: '16px' }}>
                  <Label>Summary</Label>
                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>{research.summary}</div>
                </div>
              )}
              {research?.strengths && research.strengths.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <Label>Strengths</Label>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {research.strengths.map((item, i) => (
                      <li key={i} style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6, marginBottom: '4px' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {research?.concerns && research.concerns.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <Label>Concerns</Label>
                  <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '12px' }}>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {research.concerns.map((item, i) => (
                        <li key={i} style={{ fontSize: '14px', color: '#991b1b', lineHeight: 1.6, marginBottom: '4px' }}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {research?.talking_points && research.talking_points.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <Label>Interview Talking Points</Label>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {research.talking_points.map((item, i) => (
                      <li key={i} style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6, marginBottom: '4px' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {research?.online_presence && (
                <div style={{ marginBottom: '16px' }}>
                  <Label>Online Presence</Label>
                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>{research.online_presence}</div>
                </div>
              )}
              {c.candidate_brief && (
                <div>
                  <Label>Candidate Brief</Label>
                  <div style={{
                    fontSize: '14px', color: '#374151', lineHeight: 1.6,
                    padding: '12px', background: '#f0fdf4', borderRadius: '12px', borderLeft: '3px solid #714DFF',
                  }}>
                    {c.candidate_brief}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Status History */}
          {c.status_history && c.status_history.length > 0 && (
            <Section title="Status History">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {c.status_history.map((entry, i) => {
                  const oldColor = STATUS_COLORS[entry.old_status] || { bg: '#f3f4f6', color: '#374151' };
                  const newColor = STATUS_COLORS[entry.new_status] || { bg: '#f3f4f6', color: '#374151' };
                  return (
                    <div key={i} style={{
                      display: 'flex', gap: '12px', alignItems: 'flex-start',
                      paddingLeft: '16px', borderLeft: '2px solid #e5e7eb',
                    }}>
                      <div style={{ minWidth: '140px', fontSize: '12px', color: '#6b7280', paddingTop: '2px' }}>
                        {formatDateTime(entry.created_at)}
                      </div>
                      <div>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: '9999px',
                          fontSize: '12px', fontWeight: 600,
                          background: oldColor.bg, color: oldColor.color,
                        }}>
                          {entry.old_status}
                        </span>
                        <span style={{ margin: '0 6px', color: '#9ca3af' }}>&rarr;</span>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: '9999px',
                          fontSize: '12px', fontWeight: 600,
                          background: newColor.bg, color: newColor.color,
                        }}>
                          {entry.new_status}
                        </span>
                        {entry.changed_by && entry.changed_by !== 'system' && (
                          <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '8px' }}>by {entry.changed_by}</span>
                        )}
                        {entry.note && (
                          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{entry.note}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
        </div>

        {/* Action Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '24px' }}>

          {/* Status Override */}
          <Section title="Update Status">
            {(['Hired', 'Onboarded', 'Rejected'].includes(c.status)) ? (
              <div style={{
                padding: '12px',
                background: c.status === 'Rejected' ? '#fef2f2' : '#f0fdf4',
                borderRadius: '12px',
                color: c.status === 'Rejected' ? '#991b1b' : '#065f46',
                fontSize: '13px', fontWeight: 500, textAlign: 'center',
                border: `1px solid ${c.status === 'Rejected' ? '#fecaca' : '#bbf7d0'}`,
              }}>
                Candidate has been {c.status.toLowerCase()}. Status cannot be changed.
              </div>
            ) : (
              <>
                {statusError && (
                  <div style={{
                    padding: '8px 12px', background: '#fef2f2', color: '#dc2626',
                    borderRadius: '12px', fontSize: '13px', marginBottom: '8px',
                    border: '1px solid #fecaca',
                  }}>
                    {statusError}
                  </div>
                )}
                {statusSuccess && (
                  <div style={{
                    padding: '8px 12px', background: '#f0fdf4', color: '#166534',
                    borderRadius: '12px', fontSize: '13px', marginBottom: '8px',
                    border: '1px solid #bbf7d0',
                  }}>
                    {statusSuccess}
                  </div>
                )}
                <select
                  value={statusOverride}
                  onChange={(e) => setStatusOverride(e.target.value)}
                  style={inputStyle}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {statusOverride === 'Rejected' && (
                  <div style={{
                    padding: '8px 12px', background: '#fef2f2', color: '#991b1b',
                    borderRadius: '12px', fontSize: '12px', marginTop: '8px',
                    border: '1px solid #fecaca',
                  }}>
                    A professional rejection email will be sent to the candidate.
                  </div>
                )}
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Add a note (optional)"
                  rows={3}
                  style={{ ...inputStyle, marginTop: '8px', resize: 'vertical' }}
                />
                <button
                  onClick={handleStatusUpdate}
                  disabled={statusUpdating || statusOverride === c.status}
                  style={{
                    ...primaryBtnStyle, marginTop: '8px',
                    opacity: (statusUpdating || statusOverride === c.status) ? 0.6 : 1,
                    background: statusOverride === 'Rejected' ? '#dc2626' : '#714DFF',
                  }}
                >
                  {statusUpdating ? 'Updating...' : statusOverride === 'Rejected' ? 'Reject Candidate' : 'Update Status'}
                </button>
              </>
            )}
          </Section>

          {/* Navigation Actions */}
          <Section title="Actions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={handleScreen}
                disabled={actionLoading.screen}
                style={{ ...actionBtnFull('#714DFF'), opacity: actionLoading.screen ? 0.6 : 1 }}
              >
                {actionLoading.screen ? 'Screening...' : 'Screen Candidate'}
              </button>

              <button
                onClick={handleResearch}
                disabled={actionLoading.research}
                style={{ ...actionBtnFull('#0891b2'), opacity: actionLoading.research ? 0.6 : 1 }}
              >
                {actionLoading.research ? 'Researching...' : 'Research Candidate'}
              </button>

              {(c.status === 'Shortlisted' || c.status === 'In Interview') && (
                <button
                  onClick={() => navigate(`/admin/scheduling/${c.id}`)}
                  style={actionBtnFull('#7c3aed')}
                >
                  📅 Schedule Interview
                </button>
              )}

              {c.status === 'In Interview' && (
                <button
                  onClick={() => navigate(`/admin/interviews/${c.id}`)}
                  style={actionBtnFull('#db2777')}
                >
                  🎙️ Interview Room
                </button>
              )}

              {['Offer', 'Hired', 'Onboarded'].includes(c.status) && (
                <button
                  onClick={() => navigate(`/admin/interviews/${c.id}`)}
                  style={actionBtnFull('#db2777')}
                >
                  📝 Interview Transcripts
                </button>
              )}

              {(c.status === 'In Interview' || c.status === 'Offer') && (
                <button
                  onClick={() => navigate(`/admin/offers/${c.id}`)}
                  style={actionBtnFull('#059669')}
                >
                  📄 Generate Offer
                </button>
              )}

              {c.status === 'Onboarded' && (
                <button
                  onClick={() => navigate(`/admin/onboarding/${c.id}`)}
                  style={actionBtnFull('#d97706')}
                >
                  🚀 Trigger Onboarding
                </button>
              )}

              {c.status === 'Hired' && (
                <button
                  onClick={() => navigate(`/admin/onboarding/${c.id}`)}
                  style={actionBtnFull('#d97706')}
                >
                  📋 Onboarding
                </button>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

/* Reusable sub-components */

function Section({ title, children }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '1.75rem', border: '1px solid #e5e7eb',
      padding: '20px', transition: 'all 0.3s ease',
    }}>
      {title && (
        <h2 style={{
          fontSize: '14px', fontWeight: 700, textTransform: 'uppercase',
          color: '#6b7280', letterSpacing: '0.05em', marginTop: 0, marginBottom: '12px',
        }}>
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '6px' }}>
      {children}
    </div>
  );
}

function PreText({ children }) {
  return (
    <pre style={{
      fontSize: '13px', color: '#374151', lineHeight: 1.5,
      background: '#f9fafb', padding: '12px', borderRadius: '12px',
      whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
    }}>
      {children}
    </pre>
  );
}

/* Styles */

const linkBtnStyle = {
  background: 'none', border: 'none', color: '#714DFF',
  cursor: 'pointer', fontSize: '14px', padding: 0, fontWeight: 500,
  transition: 'all 0.3s ease',
};

const extLinkStyle = {
  color: '#714DFF', textDecoration: 'none', fontWeight: 500, fontSize: '14px',
  transition: 'all 0.3s ease',
};

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: '12px',
  border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box',
  transition: 'all 0.3s ease',
};

const primaryBtnStyle = {
  width: '100%', padding: '10px', borderRadius: '9999px', border: 'none',
  background: '#714DFF', color: '#fff', fontSize: '14px', fontWeight: 600,
  cursor: 'pointer', transition: 'all 0.3s ease',
};

function actionBtnFull(color) {
  return {
    width: '100%', padding: '10px', borderRadius: '9999px', border: 'none',
    background: color, color: '#fff', fontSize: '14px', fontWeight: 600,
    cursor: 'pointer', textAlign: 'center', transition: 'all 0.3s ease',
  };
}
