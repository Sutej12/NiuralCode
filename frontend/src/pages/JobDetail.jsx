import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';

const FONT_FAMILY = "'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const PRIMARY = '#714DFF';
const GRADIENT = 'linear-gradient(135deg, #714DFF 0%, #E151FF 100%)';

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applyHover, setApplyHover] = useState(false);
  const [backHover, setBackHover] = useState(false);

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
        <div style={styles.errorCard}>
          <p style={styles.errorText}>{error}</p>
          <button
            style={{
              ...styles.backBtn,
              ...(backHover ? styles.backBtnHover : {}),
            }}
            onMouseEnter={() => setBackHover(true)}
            onMouseLeave={() => setBackHover(false)}
            onClick={() => navigate('/')}
          >
            Back to Careers
          </button>
        </div>
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
      <button
        style={{
          ...styles.backLink,
          ...(backHover ? { opacity: 0.8 } : {}),
        }}
        onMouseEnter={() => setBackHover(true)}
        onMouseLeave={() => setBackHover(false)}
        onClick={() => navigate('/')}
      >
        <span style={{ marginRight: 6, fontSize: 18, lineHeight: 1 }}>&larr;</span>
        Back to All Positions
      </button>

      <div style={styles.card}>
        <div style={styles.titleRow}>
          <h1 style={styles.title}>{job.title}</h1>
          {job.is_remote && <span style={styles.remoteBadge}>Remote</span>}
        </div>

        <div style={styles.metaRow}>
          {job.team && (
            <span style={styles.metaItem}>
              <span style={styles.metaLabel}>Team</span> {job.team}
            </span>
          )}
          {job.location && (
            <span style={styles.metaItem}>
              <span style={styles.metaLabel}>Location</span> {job.location}
            </span>
          )}
          {job.experience_level && (
            <span style={styles.metaItem}>
              <span style={styles.metaLabel}>Experience</span> {job.experience_level}
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
              <div style={styles.closedBadge}>
                This position has been closed
              </div>
              <p style={styles.statusMessage}>
                This role is no longer accepting applications. Please check our other open positions.
              </p>
            </div>
          ) : job.status === 'Paused' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={styles.pausedBadge}>
                This position is currently on hold
              </div>
              <p style={styles.statusMessage}>
                Hiring for this role has been temporarily paused. Please check back later.
              </p>
            </div>
          ) : (
            <button
              style={{
                ...styles.applyBtn,
                ...(applyHover ? styles.applyBtnHover : {}),
              }}
              onMouseEnter={() => setApplyHover(true)}
              onMouseLeave={() => setApplyHover(false)}
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
    fontFamily: FONT_FAMILY,
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    marginBottom: 24,
    padding: '8px 0',
    fontSize: 14,
    color: PRIMARY,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontFamily: FONT_FAMILY,
    transition: 'opacity 0.2s ease',
  },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '1.75rem',
    padding: 36,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: 0,
    fontFamily: FONT_FAMILY,
  },
  remoteBadge: {
    fontSize: 12,
    fontWeight: 600,
    color: '#065f46',
    background: '#d1fae5',
    borderRadius: 9999,
    padding: '4px 14px',
    fontFamily: FONT_FAMILY,
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 24,
    marginBottom: 28,
    paddingBottom: 20,
    borderBottom: '1px solid #f0f0f4',
  },
  metaItem: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: FONT_FAMILY,
  },
  metaLabel: {
    fontWeight: 600,
    color: '#374151',
    marginRight: 4,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 12px',
    fontFamily: FONT_FAMILY,
  },
  description: {
    fontSize: 15,
    lineHeight: 1.75,
    color: '#4b5563',
    margin: 0,
    whiteSpace: 'pre-wrap',
    fontFamily: FONT_FAMILY,
  },
  list: {
    margin: 0,
    paddingLeft: 0,
    listStyle: 'none',
  },
  listItem: {
    fontSize: 15,
    lineHeight: 1.75,
    color: '#4b5563',
    marginBottom: 8,
    paddingLeft: 20,
    position: 'relative',
    fontFamily: FONT_FAMILY,
  },
  applySection: {
    marginTop: 36,
    paddingTop: 28,
    borderTop: '1px solid #f0f0f4',
    textAlign: 'center',
  },
  applyBtn: {
    padding: '14px 52px',
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    background: GRADIENT,
    border: 'none',
    borderRadius: 9999,
    cursor: 'pointer',
    fontFamily: FONT_FAMILY,
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
  },
  applyBtnHover: {
    boxShadow: '0 6px 24px rgba(113, 77, 255, 0.35)',
    transform: 'translateY(-1px)',
  },
  closedBadge: {
    display: 'inline-block',
    padding: '10px 28px',
    background: '#fee2e2',
    borderRadius: 9999,
    border: '1px solid #fecaca',
    color: '#991b1b',
    fontWeight: 600,
    fontSize: 14,
    marginBottom: 10,
    fontFamily: FONT_FAMILY,
  },
  pausedBadge: {
    display: 'inline-block',
    padding: '10px 28px',
    background: '#fef3c7',
    borderRadius: 9999,
    border: '1px solid #fde68a',
    color: '#92400e',
    fontWeight: 600,
    fontSize: 14,
    marginBottom: 10,
    fontFamily: FONT_FAMILY,
  },
  statusMessage: {
    color: '#6b7280',
    fontSize: 13,
    margin: '8px 0 0',
    fontFamily: FONT_FAMILY,
  },
  loaderWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    fontFamily: FONT_FAMILY,
  },
  spinner: {
    width: 40,
    height: 40,
    border: '4px solid #e5e7eb',
    borderTop: `4px solid ${PRIMARY}`,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loaderText: {
    marginTop: 16,
    color: '#6b7280',
    fontSize: 15,
    fontFamily: FONT_FAMILY,
  },
  errorWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    fontFamily: FONT_FAMILY,
  },
  errorCard: {
    background: '#fff',
    borderRadius: '1.75rem',
    padding: '40px 36px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    textAlign: 'center',
    maxWidth: 480,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 16,
    marginBottom: 20,
    fontFamily: FONT_FAMILY,
    lineHeight: 1.6,
  },
  backBtn: {
    padding: '12px 32px',
    fontSize: 14,
    color: '#fff',
    background: GRADIENT,
    border: 'none',
    borderRadius: 9999,
    cursor: 'pointer',
    fontWeight: 600,
    fontFamily: FONT_FAMILY,
    transition: 'box-shadow 0.2s ease',
  },
  backBtnHover: {
    boxShadow: '0 6px 24px rgba(113, 77, 255, 0.35)',
  },
};

/* Inject keyframes and custom bullet styles */
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    ul li[style]::before {
      content: '';
      position: absolute;
      left: 0;
      top: 10px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #714DFF;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default JobDetail;
