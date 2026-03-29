import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/jobs/${id}/`);
        setJob(res.data);
      } catch (err) {
        setError(
          err.response?.status === 404
            ? 'This position is no longer available. It may have been closed or put on hold.'
            : 'Failed to load job details. Please try again later.'
        );
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  if (loading) {
    return (
      <div style={styles.loaderWrap}>
        <div style={styles.spinner} />
        <p style={styles.loaderText}>Loading job details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorWrap}>
        <p style={styles.errorText}>{error}</p>
        <button style={styles.backBtn} onClick={() => navigate('/')}>
          Back to Careers
        </button>
      </div>
    );
  }

  const parseList = (data) => {
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
      return data
        .split(/\n|;/)
        .map((s) => s.replace(/^[-*\d.)\s]+/, '').trim())
        .filter(Boolean);
    }
    return [];
  };

  const responsibilities = parseList(job.responsibilities);
  const requirements = parseList(job.requirements);

  return (
    <div style={styles.page}>
      <button style={styles.backLink} onClick={() => navigate('/')}>
        &larr; Back to All Positions
      </button>

      <div style={styles.card}>
        <div style={styles.titleRow}>
          <h1 style={styles.title}>{job.title}</h1>
          {job.is_remote && <span style={styles.remoteBadge}>Remote</span>}
        </div>

        <div style={styles.metaRow}>
          {job.team && (
            <span style={styles.metaItem}>
              <strong>Team:</strong> {job.team}
            </span>
          )}
          {job.location && (
            <span style={styles.metaItem}>
              <strong>Location:</strong> {job.location}
            </span>
          )}
          {job.experience_level && (
            <span style={styles.metaItem}>
              <strong>Experience:</strong> {job.experience_level}
            </span>
          )}
        </div>

        {job.description && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>About This Role</h2>
            <p style={styles.description}>{job.description}</p>
          </section>
        )}

        {responsibilities.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Responsibilities</h2>
            <ul style={styles.list}>
              {responsibilities.map((item, idx) => (
                <li key={idx} style={styles.listItem}>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {requirements.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Requirements</h2>
            <ul style={styles.list}>
              {requirements.map((item, idx) => (
                <li key={idx} style={styles.listItem}>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div style={styles.applySection}>
          {job.status === 'Closed' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-block', padding: '12px 24px', background: '#fee2e2', borderRadius: 8, border: '1px solid #fecaca', marginBottom: 8 }}>
                <span style={{ color: '#991b1b', fontWeight: 600, fontSize: 15 }}>
                  🔴 This position has been closed
                </span>
              </div>
              <p style={{ color: '#6b7280', fontSize: 13, margin: '8px 0 0' }}>
                This role is no longer accepting applications. Please check our other open positions.
              </p>
            </div>
          ) : job.status === 'Paused' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-block', padding: '12px 24px', background: '#fef3c7', borderRadius: 8, border: '1px solid #fde68a', marginBottom: 8 }}>
                <span style={{ color: '#92400e', fontWeight: 600, fontSize: 15 }}>
                  ⏸️ This position is currently on hold
                </span>
              </div>
              <p style={{ color: '#6b7280', fontSize: 13, margin: '8px 0 0' }}>
                Hiring for this role has been temporarily paused. Please check back later.
              </p>
            </div>
          ) : (
            <button
              style={styles.applyBtn}
              onClick={() => navigate(`/apply/${job.id}`)}
            >
              Apply for this Role
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  backLink: {
    display: 'inline-block',
    marginBottom: 24,
    padding: '8px 0',
    fontSize: 14,
    color: '#4f46e5',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 500,
  },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 32,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: 0,
  },
  remoteBadge: {
    fontSize: 12,
    fontWeight: 600,
    color: '#065f46',
    background: '#d1fae5',
    borderRadius: 6,
    padding: '4px 12px',
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 28,
    paddingBottom: 20,
    borderBottom: '1px solid #f3f4f6',
  },
  metaItem: {
    fontSize: 14,
    color: '#374151',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#1a1a2e',
    margin: '0 0 12px',
  },
  description: {
    fontSize: 15,
    lineHeight: 1.7,
    color: '#4b5563',
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  list: {
    margin: 0,
    paddingLeft: 20,
  },
  listItem: {
    fontSize: 15,
    lineHeight: 1.7,
    color: '#4b5563',
    marginBottom: 6,
  },
  applySection: {
    marginTop: 32,
    paddingTop: 24,
    borderTop: '1px solid #f3f4f6',
    textAlign: 'center',
  },
  applyBtn: {
    padding: '14px 48px',
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    background: '#4f46e5',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
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
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #4f46e5',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loaderText: {
    marginTop: 16,
    color: '#6b7280',
    fontSize: 15,
  },
  errorWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 16,
    marginBottom: 16,
  },
  backBtn: {
    padding: '10px 24px',
    fontSize: 14,
    color: '#fff',
    background: '#4f46e5',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
};

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(styleSheet);
}

export default JobDetail;
