import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [rescheduleRequests, setRescheduleRequests] = useState([]);
  const [rescheduleLoading, setRescheduleLoading] = useState({});
  const [count, setCount] = useState(0);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [rolesOpen, setRolesOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  // Close bell dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    };
    if (bellOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [bellOpen]);

  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
  const [filterJob, setFilterJob] = useState(searchParams.get('job') || '');
  const [filterDateFrom, setFilterDateFrom] = useState(searchParams.get('date_from') || '');
  const [filterDateTo, setFilterDateTo] = useState(searchParams.get('date_to') || '');
  const [filterReferred, setFilterReferred] = useState(searchParams.get('referred') === 'true');

  const fetchCandidates = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = { page: pageNum };
      if (filterStatus) params.status = filterStatus;
      if (filterJob) params.role = filterJob;
      if (filterDateFrom) params.date_from = filterDateFrom;
      if (filterDateTo) params.date_to = filterDateTo;
      if (filterReferred) params.referred = 'true';

      const res = await api.get('/candidates/', { params });
      setCandidates(res.data.results || []);
      setCount(res.data.count || 0);
      setNextUrl(res.data.next);
      setPrevUrl(res.data.previous);
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterJob, filterDateFrom, filterDateTo, filterReferred]);

  useEffect(() => {
    api.get('/jobs/?all=true').then((res) => {
      setJobs(res.data.results || res.data || []);
    }).catch(() => setJobs([]));

    // Fetch signed offers for notifications
    api.get('/offers/').then((res) => {
      const offers = res.data.results || res.data || [];
      const signed = offers.filter((o) => o.status === 'signed');
      setNotifications(signed);
    }).catch(() => setNotifications([]));

    // Fetch reschedule requests for notifications
    fetchRescheduleRequests();
  }, []);

  const fetchRescheduleRequests = () => {
    api.get('/scheduling/').then((res) => {
      const reqs = res.data.results || res.data || [];
      const pending = reqs.filter((r) => r.status === 'reschedule_requested');
      setRescheduleRequests(pending);
    }).catch(() => setRescheduleRequests([]));
  };

  useEffect(() => {
    setPage(1);
    fetchCandidates(1);

    const params = {};
    if (filterStatus) params.status = filterStatus;
    if (filterJob) params.job = filterJob;
    if (filterDateFrom) params.date_from = filterDateFrom;
    if (filterDateTo) params.date_to = filterDateTo;
    if (filterReferred) params.referred = 'true';
    setSearchParams(params);
  }, [fetchCandidates, setSearchParams, filterStatus, filterJob, filterDateFrom, filterDateTo, filterReferred]);

  const handlePageChange = (direction) => {
    const newPage = direction === 'next' ? page + 1 : page - 1;
    setPage(newPage);
    fetchCandidates(newPage);
  };

  const handleScreen = async (e, id) => {
    e.stopPropagation();
    setActionLoading((prev) => ({ ...prev, [`screen-${id}`]: true }));
    try {
      await api.post(`/candidates/${id}/screen/`);
      fetchCandidates(page);
    } catch (err) {
      console.error('Screen failed:', err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`screen-${id}`]: false }));
    }
  };

  const handleResearch = async (e, id) => {
    e.stopPropagation();
    setActionLoading((prev) => ({ ...prev, [`research-${id}`]: true }));
    try {
      await api.post(`/candidates/${id}/research/`);
      fetchCandidates(page);
    } catch (err) {
      console.error('Research failed:', err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`research-${id}`]: false }));
    }
  };

  const handleRescheduleAction = async (candidateId, approved) => {
    setRescheduleLoading((prev) => ({ ...prev, [candidateId]: true }));
    try {
      const res = await api.post('/scheduling/interviewer-approve/', {
        candidate_id: candidateId,
        approved,
      });
      alert(res.data.message || (approved ? 'Approved — new slots sent to candidate.' : 'Rejected — next available slots sent to candidate.'));
      fetchRescheduleRequests();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to process request.');
    } finally {
      setRescheduleLoading((prev) => ({ ...prev, [candidateId]: false }));
    }
  };

  const totalNotifications = notifications.length + rescheduleRequests.length;

  const [jobActionLoading, setJobActionLoading] = useState({});

  const handleJobStatusChange = async (jobId, newStatus) => {
    const label = newStatus === 'Closed' ? 'close' : 'put on hold';
    if (!window.confirm(`Are you sure you want to ${label} this role? All active candidates will be notified via email.`)) {
      return;
    }
    setJobActionLoading((prev) => ({ ...prev, [jobId]: newStatus }));
    try {
      const res = await api.post(`/jobs/${jobId}/close-or-hold/`, { status: newStatus });
      // Refresh jobs list
      const jobsRes = await api.get('/jobs/?all=true');
      setJobs(jobsRes.data.results || jobsRes.data || []);
      alert(res.data.message || `Job ${newStatus.toLowerCase()} successfully.`);
    } catch (err) {
      const msg = err.response?.data?.error || `Failed to ${label} role.`;
      alert(msg);
    } finally {
      setJobActionLoading((prev) => ({ ...prev, [jobId]: null }));
    }
  };

  const handleReopenJob = async (jobId) => {
    setJobActionLoading((prev) => ({ ...prev, [jobId]: 'Open' }));
    try {
      await api.patch(`/jobs/${jobId}/`, { status: 'Open' });
      const jobsRes = await api.get('/jobs/?all=true');
      setJobs(jobsRes.data.results || jobsRes.data || []);
    } catch {
      alert('Failed to reopen role.');
    } finally {
      setJobActionLoading((prev) => ({ ...prev, [jobId]: null }));
    }
  };

  const clearFilters = () => {
    setFilterStatus('');
    setFilterJob('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterReferred(false);
  };

  const totalPages = Math.ceil(count / 20) || 1;

  const JOB_STATUS_STYLES = {
    Open: { bg: '#d1fae5', color: '#065f46', icon: '🟢' },
    Paused: { bg: '#fef3c7', color: '#92400e', icon: '⏸️' },
    Closed: { bg: '#fee2e2', color: '#991b1b', icon: '🔴' },
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, fontFamily: "'Inter Tight', sans-serif" }}>Candidate Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#6b7280', fontSize: '14px' }}>
            {count} candidate{count !== 1 ? 's' : ''} total
          </span>

          {/* Bell Icon for Notifications */}
          <div ref={bellRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setBellOpen(!bellOpen)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
                fontSize: '22px', lineHeight: 1, position: 'relative',
              }}
              title="Notifications"
            >
              🔔
              {totalNotifications > 0 && (
                <span style={{
                  position: 'absolute', top: 0, right: 0,
                  background: '#714DFF', color: '#fff', fontSize: '10px', fontWeight: 700,
                  width: '18px', height: '18px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid #fff',
                }}>
                  {totalNotifications}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {bellOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                width: '380px', background: '#fff', borderRadius: '16px',
                border: '1px solid #e5e7eb', boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
                zIndex: 1000, overflow: 'hidden',
              }}>
                <div style={{
                  padding: '14px 16px', borderBottom: '1px solid #e5e7eb',
                  fontWeight: 700, fontSize: '14px', color: '#1a1a2e',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span>Notifications</span>
                  <span style={{
                    fontSize: '11px', fontWeight: 500, color: '#714DFF',
                    background: '#ede9fe', padding: '2px 8px', borderRadius: '9999px',
                  }}>
                    {totalNotifications} new
                  </span>
                </div>
                <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  {/* Reschedule Requests */}
                  {rescheduleRequests.map((req) => (
                    <div
                      key={`resched-${req.id}`}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f3f4f6',
                        background: '#fffbeb',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{ fontSize: '20px', marginTop: '2px' }}>📅</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: '#92400e' }}>
                            Reschedule Request — {req.candidate_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '3px' }}>
                            {req.job_title}
                          </div>
                          {(req.preferred_date || req.preferred_time) && (
                            <div style={{ fontSize: '12px', color: '#374151', marginTop: '4px' }}>
                              Preferred: {req.preferred_date || ''} {req.preferred_time || ''}
                            </div>
                          )}
                          {req.candidate_note && (
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px', fontStyle: 'italic' }}>
                              "{req.candidate_note}"
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button
                              onClick={() => handleRescheduleAction(req.candidate, true)}
                              disabled={rescheduleLoading[req.candidate]}
                              style={{
                                padding: '4px 12px', fontSize: '11px', fontWeight: 600,
                                background: '#059669', color: '#fff', border: 'none',
                                borderRadius: '9999px', cursor: rescheduleLoading[req.candidate] ? 'not-allowed' : 'pointer',
                                opacity: rescheduleLoading[req.candidate] ? 0.6 : 1,
                              }}
                            >
                              {rescheduleLoading[req.candidate] ? 'Processing...' : '✓ Approve'}
                            </button>
                            <button
                              onClick={() => handleRescheduleAction(req.candidate, false)}
                              disabled={rescheduleLoading[req.candidate]}
                              style={{
                                padding: '4px 12px', fontSize: '11px', fontWeight: 600,
                                background: '#dc2626', color: '#fff', border: 'none',
                                borderRadius: '9999px', cursor: rescheduleLoading[req.candidate] ? 'not-allowed' : 'pointer',
                                opacity: rescheduleLoading[req.candidate] ? 0.6 : 1,
                              }}
                            >
                              {rescheduleLoading[req.candidate] ? 'Processing...' : '✕ Reject & Send Next Available'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Offer Signed Notifications */}
                  {totalNotifications === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                      No notifications
                    </div>
                  ) : (
                    notifications.map((offer) => (
                      <div
                        key={offer.id}
                        onClick={() => { setBellOpen(false); navigate(`/admin/candidates/${offer.candidate}`); }}
                        style={{
                          padding: '12px 16px', cursor: 'pointer',
                          borderBottom: '1px solid #f3f4f6',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <span style={{ fontSize: '20px', marginTop: '2px' }}>🎉</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: '#166534' }}>
                              Offer Signed — {offer.candidate_name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '3px' }}>
                              {offer.job_title}
                              {offer.signed_at && (
                                <span style={{ marginLeft: '8px' }}>
                                  {new Date(offer.signed_at).toLocaleString()}
                                </span>
                              )}
                            </div>
                            {offer.signer_ip && (
                              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                                IP: {offer.signer_ip}
                              </div>
                            )}
                          </div>
                          <span style={{
                            padding: '2px 8px', borderRadius: '9999px', fontSize: '11px',
                            fontWeight: 600, background: '#bbf7d0', color: '#166534',
                            whiteSpace: 'nowrap', flexShrink: 0,
                          }}>
                            Hired ✓
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manage Roles */}
      {jobs.length > 0 && (
        <div style={{
          marginBottom: '28px', background: '#fff', borderRadius: '1.75rem',
          border: '1px solid #e5e7eb', overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(113,77,255,0.06)',
        }}>
          {/* Section Header — clickable to toggle */}
          <div
            onClick={() => setRolesOpen(!rolesOpen)}
            style={{
              padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'linear-gradient(135deg, #714DFF 0%, #E151FF 100%)',
              cursor: 'pointer', userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{
                fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0,
                fontFamily: "'Inter Tight', sans-serif", letterSpacing: '0.02em',
              }}>
                Manage Roles
              </h2>
              <span style={{
                fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontFamily: "'Inter Tight', sans-serif",
              }}>
                {jobs.filter(j => j.status === 'Open').length} open · {jobs.filter(j => j.status === 'Paused').length} on hold · {jobs.filter(j => j.status === 'Closed').length} closed
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                background: 'rgba(255,255,255,0.2)', borderRadius: '9999px', padding: '4px 12px',
                fontSize: '12px', fontWeight: 600, color: '#fff',
              }}>
                {jobs.length} {jobs.length === 1 ? 'Role' : 'Roles'}
              </span>
              <span style={{
                color: '#fff', fontSize: '14px', transition: 'transform 0.3s ease',
                display: 'inline-block', transform: rolesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}>
                ▼
              </span>
            </div>
          </div>

          {/* Role Cards — collapsible */}
          <div style={{
            maxHeight: rolesOpen ? '2000px' : '0px',
            overflow: 'hidden',
            transition: 'max-height 0.35s ease',
          }}>
          <div style={{ padding: '12px 20px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {jobs.map((job) => {
              const st = JOB_STATUS_STYLES[job.status] || JOB_STATUS_STYLES.Open;
              const isLoading = jobActionLoading[job.id];
              const statusAccent = job.status === 'Open' ? '#059669' : job.status === 'Paused' ? '#d97706' : '#dc2626';
              return (
                <div
                  key={job.id}
                  style={{
                    background: '#fafafa', borderRadius: '16px',
                    padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px',
                    borderLeft: `4px solid ${statusAccent}`,
                    transition: 'all 0.25s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f5f3ff';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(113,77,255,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fafafa';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Role Icon */}
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '12px',
                    background: `linear-gradient(135deg, ${statusAccent}15, ${statusAccent}25)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', flexShrink: 0,
                  }}>
                    {job.status === 'Open' ? '💼' : job.status === 'Paused' ? '⏸️' : '🔒'}
                  </div>

                  {/* Role Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600, fontSize: '15px', color: '#1a1a2e', marginBottom: '4px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontFamily: "'Inter Tight', sans-serif",
                    }}>
                      {job.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '3px 12px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600,
                        background: st.bg, color: st.color,
                        border: `1px solid ${statusAccent}30`,
                      }}>
                        <span style={{
                          width: '6px', height: '6px', borderRadius: '50%',
                          background: statusAccent, display: 'inline-block',
                        }} />
                        {job.status}
                      </span>
                      {job.team && (
                        <span style={{
                          fontSize: '12px', color: '#6b7280', fontFamily: "'Inter Tight', sans-serif",
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                        }}>
                          <span style={{ opacity: 0.5 }}>│</span> {job.team}
                        </span>
                      )}
                      {job.location && (
                        <span style={{
                          fontSize: '12px', color: '#9ca3af', fontFamily: "'Inter Tight', sans-serif",
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                        }}>
                          📍 {job.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {job.status === 'Open' && (
                      <>
                        <button
                          onClick={() => handleJobStatusChange(job.id, 'Paused')}
                          disabled={!!isLoading}
                          style={{
                            padding: '7px 16px', borderRadius: '10px', border: '1.5px solid #d97706',
                            background: isLoading === 'Paused' ? '#fef3c7' : '#fffbeb',
                            color: '#b45309', fontSize: '12px', fontWeight: 600,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.6 : 1,
                            fontFamily: "'Inter Tight', sans-serif",
                            transition: 'all 0.2s ease',
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                          }}
                          onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.background = '#fef3c7'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#fffbeb'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                          ⏸ {isLoading === 'Paused' ? 'Holding...' : 'Hold'}
                        </button>
                        <button
                          onClick={() => handleJobStatusChange(job.id, 'Closed')}
                          disabled={!!isLoading}
                          style={{
                            padding: '7px 16px', borderRadius: '10px', border: '1.5px solid #dc2626',
                            background: isLoading === 'Closed' ? '#fee2e2' : '#fef2f2',
                            color: '#b91c1c', fontSize: '12px', fontWeight: 600,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.6 : 1,
                            fontFamily: "'Inter Tight', sans-serif",
                            transition: 'all 0.2s ease',
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                          }}
                          onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                          ✕ {isLoading === 'Closed' ? 'Closing...' : 'Close'}
                        </button>
                      </>
                    )}
                    {job.status === 'Paused' && (
                      <>
                        <button
                          onClick={() => handleReopenJob(job.id)}
                          disabled={!!isLoading}
                          style={{
                            padding: '7px 16px', borderRadius: '10px', border: '1.5px solid #059669',
                            background: isLoading === 'Open' ? '#d1fae5' : '#ecfdf5',
                            color: '#047857', fontSize: '12px', fontWeight: 600,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.6 : 1,
                            fontFamily: "'Inter Tight', sans-serif",
                            transition: 'all 0.2s ease',
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                          }}
                          onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.background = '#d1fae5'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#ecfdf5'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                          ▶ {isLoading === 'Open' ? 'Reopening...' : 'Reopen'}
                        </button>
                        <button
                          onClick={() => handleJobStatusChange(job.id, 'Closed')}
                          disabled={!!isLoading}
                          style={{
                            padding: '7px 16px', borderRadius: '10px', border: '1.5px solid #dc2626',
                            background: '#fef2f2', color: '#b91c1c', fontSize: '12px', fontWeight: 600,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.6 : 1,
                            fontFamily: "'Inter Tight', sans-serif",
                            transition: 'all 0.2s ease',
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                          }}
                          onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                          ✕ {isLoading === 'Closed' ? 'Closing...' : 'Close'}
                        </button>
                      </>
                    )}
                    {job.status === 'Closed' && (
                      <button
                        onClick={() => handleReopenJob(job.id)}
                        disabled={!!isLoading}
                        style={{
                          padding: '7px 16px', borderRadius: '10px', border: '1.5px solid #059669',
                          background: isLoading === 'Open' ? '#d1fae5' : '#ecfdf5',
                          color: '#047857', fontSize: '12px', fontWeight: 600,
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          opacity: isLoading ? 0.6 : 1,
                          fontFamily: "'Inter Tight', sans-serif",
                          transition: 'all 0.2s ease',
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                        }}
                        onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.background = '#d1fae5'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#ecfdf5'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        ▶ {isLoading === 'Open' ? 'Reopening...' : 'Reopen'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{
        display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end',
        marginBottom: '20px', padding: '16px', background: '#fff', borderRadius: '1.75rem', border: '1px solid #e5e7eb',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Role</label>
          <select
            value={filterJob}
            onChange={(e) => setFilterJob(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '12px', border: '1.5px solid #d1d5db', fontSize: '14px', minWidth: '180px' }}
          >
            <option value="">All Roles</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.title}>{job.title}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '12px', border: '1.5px solid #d1d5db', fontSize: '14px', minWidth: '150px' }}
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>From</label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '12px', border: '1.5px solid #d1d5db', fontSize: '14px' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>To</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '12px', border: '1.5px solid #d1d5db', fontSize: '14px' }}
          />
        </div>

        <button
          onClick={() => setFilterReferred(!filterReferred)}
          style={{
            padding: '8px 18px', borderRadius: '9999px', fontSize: '13px', cursor: 'pointer',
            border: filterReferred ? '2px solid #714DFF' : '1.5px solid #d1d5db',
            background: filterReferred ? 'linear-gradient(135deg, #714DFF 0%, #E151FF 100%)' : '#fff',
            color: filterReferred ? '#fff' : '#374151',
            fontWeight: 600, alignSelf: 'flex-end',
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            transition: 'all 0.2s ease',
            boxShadow: filterReferred ? '0 2px 10px rgba(113,77,255,0.3)' : 'none',
          }}
        >
          🏷️ Referred Candidates {filterReferred && '✓'}
        </button>

        <button
          onClick={clearFilters}
          style={{
            padding: '8px 16px', borderRadius: '9999px', border: '1.5px solid #d1d5db',
            background: '#fff', cursor: 'pointer', fontSize: '13px', color: '#6b7280',
            fontWeight: 500, alignSelf: 'flex-end',
            transition: 'all 0.2s ease',
          }}
        >
          ✕ Clear Filters
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280', background: '#fff', borderRadius: '1.75rem', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>Loading candidates...</div>
        </div>
      ) : candidates.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0', color: '#6b7280',
          background: '#fff', borderRadius: '1.75rem', border: '1px solid #e5e7eb',
        }}>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>No candidates found</div>
          <div style={{ fontSize: '14px' }}>Try adjusting your filters or check back later.</div>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', borderRadius: '1.75rem', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#714DFF' }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Role Applied</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>AI Score</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => {
                  const statusColor = STATUS_COLORS[c.status] || { bg: '#f3f4f6', color: '#374151' };
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/admin/candidates/${c.id}`)}
                      style={{ cursor: 'pointer', borderTop: '1px solid #e5e7eb' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    >
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600 }}>{c.full_name}</span>
                          {c.is_referred && (
                            <span style={{
                              display: 'inline-block', padding: '1px 6px', borderRadius: '9999px',
                              fontSize: '10px', fontWeight: 700, background: '#ede9fe', color: '#714DFF',
                              border: '1px solid #ddd6fe',
                            }}>
                              Referred
                            </span>
                          )}
                        </div>
                        {c.email && <div style={{ fontSize: '12px', color: '#6b7280' }}>{c.email}</div>}
                      </td>
                      <td style={tdStyle}>{c.job_title || c.job?.title || '—'}</td>
                      <td style={tdStyle}>{formatDate(c.created_at)}</td>
                      <td style={tdStyle}>
                        {c.ai_score != null ? (
                          <span style={{
                            fontWeight: 700, fontSize: '16px',
                            color: getScoreColor(c.ai_score),
                          }}>
                            {c.ai_score}
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>—</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block', padding: '4px 10px', borderRadius: '9999px',
                          fontSize: '12px', fontWeight: 600,
                          background: statusColor.bg, color: statusColor.color,
                        }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {c.status === 'Applied' && (
                            <button
                              onClick={(e) => handleScreen(e, c.id)}
                              disabled={actionLoading[`screen-${c.id}`]}
                              style={actionBtnStyle('#714DFF', actionLoading[`screen-${c.id}`])}
                            >
                              {actionLoading[`screen-${c.id}`] ? 'Screening...' : 'Screen'}
                            </button>
                          )}
                          {(c.status === 'Screened' || c.status === 'Shortlisted') && (
                            <button
                              onClick={(e) => handleResearch(e, c.id)}
                              disabled={actionLoading[`research-${c.id}`]}
                              style={actionBtnStyle('#0891b2', actionLoading[`research-${c.id}`])}
                            >
                              {actionLoading[`research-${c.id}`] ? 'Researching...' : 'Research'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: '16px', fontSize: '14px', color: '#6b7280',
          }}>
            <span>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handlePageChange('prev')}
                disabled={!prevUrl}
                style={{
                  padding: '8px 16px', borderRadius: '9999px', border: '1px solid #d1d5db',
                  background: prevUrl ? '#fff' : '#f3f4f6', cursor: prevUrl ? 'pointer' : 'not-allowed',
                  color: prevUrl ? '#374151' : '#9ca3af',
                }}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange('next')}
                disabled={!nextUrl}
                style={{
                  padding: '8px 16px', borderRadius: '9999px', border: '1px solid #d1d5db',
                  background: nextUrl ? '#fff' : '#f3f4f6', cursor: nextUrl ? 'pointer' : 'not-allowed',
                  color: nextUrl ? '#374151' : '#9ca3af',
                }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const thStyle = {
  textAlign: 'left', padding: '12px 16px', fontWeight: 600, fontSize: '12px',
  textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.05em',
};

const tdStyle = {
  padding: '12px 16px', verticalAlign: 'middle',
};

function actionBtnStyle(color, disabled) {
  return {
    padding: '4px 12px', borderRadius: '9999px', border: 'none',
    background: disabled ? '#d1d5db' : color, color: '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600,
    whiteSpace: 'nowrap',
  };
}
