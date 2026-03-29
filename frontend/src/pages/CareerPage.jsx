import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

const CareerPage = () => {
  const [jobs, setJobs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const res = await API.get('/jobs/');
        const data = Array.isArray(res.data) ? res.data : res.data.results || [];
        setJobs(data);
        setFiltered(data);
      } catch (err) {
        setError('Failed to load job listings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  useEffect(() => {
    let result = jobs;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (job) =>
          job.title?.toLowerCase().includes(q) ||
          job.team?.toLowerCase().includes(q) ||
          job.location?.toLowerCase().includes(q)
      );
    }
    if (locationFilter) {
      result = result.filter((job) => job.location === locationFilter);
    }
    if (experienceFilter) {
      result = result.filter((job) => job.experience_level === experienceFilter);
    }
    setFiltered(result);
  }, [search, locationFilter, experienceFilter, jobs]);

  const uniqueLocations = [...new Set(jobs.map((j) => j.location).filter(Boolean))];
  const uniqueExperience = [...new Set(jobs.map((j) => j.experience_level).filter(Boolean))];

  if (loading) {
    return (
      <div style={styles.loaderWrap}>
        <div style={styles.spinner} />
        <p style={styles.loaderText}>Loading open positions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorWrap}>
        <p style={styles.errorText}>{error}</p>
        <button
          style={styles.retryBtn}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#6041e0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#714DFF';
          }}
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Gradient Hero Header */}
      <header style={styles.header}>
        <div style={styles.heroBar}>
          <h1 style={styles.heading}>Career Opportunities</h1>
          <p style={styles.subheading}>
            Join our team and help build something meaningful.
          </p>
        </div>
      </header>

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="Search by title, team, or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          style={styles.select}
        >
          <option value="">All Locations</option>
          {uniqueLocations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
        <select
          value={experienceFilter}
          onChange={(e) => setExperienceFilter(e.target.value)}
          style={styles.select}
        >
          <option value="">All Experience Levels</option>
          {uniqueExperience.map((exp) => (
            <option key={exp} value={exp}>
              {exp}
            </option>
          ))}
        </select>
      </div>

      {/* Job Listings */}
      {filtered.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>No positions match your search criteria.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((job, index) => (
            <div
              key={job.id}
              style={{
                ...styles.card,
                animationDelay: `${index * 0.07}s`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={styles.cardBody}>
                <h2 style={styles.cardTitle}>{job.title}</h2>
                <div style={styles.meta}>
                  {job.team && (
                    <span style={styles.tag}>
                      <span style={styles.tagIcon}>&#128101;</span> {job.team}
                    </span>
                  )}
                  {job.location && (
                    <span style={styles.tag}>
                      <span style={styles.tagIcon}>&#128205;</span> {job.location}
                    </span>
                  )}
                  {job.is_remote && <span style={styles.remoteBadge}>Remote</span>}
                </div>
                {job.experience_level && (
                  <p style={styles.experience}>
                    Experience: <strong>{job.experience_level}</strong>
                  </p>
                )}
              </div>
              <div style={styles.cardFooter}>
                <button
                  style={styles.btnOutline}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#714DFF';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.color = '#714DFF';
                  }}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  View Details
                </button>
                <button
                  style={styles.btnPrimary}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#6041e0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#714DFF';
                  }}
                  onClick={() => navigate(`/apply/${job.id}`)}
                >
                  Apply Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  page: {
    background: '#fafafa',
    minHeight: '100vh',
    fontFamily: "var(--font-inter-tight, 'Inter Tight', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
  },
  header: {
    marginBottom: 48,
  },
  heroBar: {
    background: 'linear-gradient(135deg, #714DFF 0%, #E151FF 100%)',
    padding: '64px 24px 56px',
    textAlign: 'center',
  },
  heading: {
    fontSize: 40,
    fontWeight: 700,
    color: '#fff',
    margin: '0 0 12px',
    letterSpacing: '-0.02em',
  },
  subheading: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
    margin: 0,
    fontWeight: 400,
  },
  filterBar: {
    display: 'flex',
    gap: 14,
    flexWrap: 'wrap',
    maxWidth: 1100,
    margin: '0 auto 40px',
    padding: '0 24px',
  },
  searchInput: {
    flex: '1 1 340px',
    padding: '14px 22px',
    fontSize: 15,
    border: '1px solid #e8e8e8',
    borderRadius: 28,
    outline: 'none',
    background: '#fff',
    color: '#1a1a2e',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  select: {
    padding: '14px 22px',
    fontSize: 15,
    border: '1px solid #e8e8e8',
    borderRadius: 9999,
    background: '#fff',
    outline: 'none',
    minWidth: 190,
    color: '#1a1a2e',
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236b7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 18px center',
    paddingRight: 44,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: 28,
    maxWidth: 1100,
    margin: '0 auto',
    padding: '0 24px 64px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    background: '#fff',
    border: '1px solid #e8e8e8',
    borderRadius: '1.75rem',
    padding: 28,
    transition: 'box-shadow 0.25s ease, transform 0.25s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    animation: 'fadeInUp 0.5s ease both',
  },
  cardBody: {
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#1a1a2e',
    margin: '0 0 14px',
    letterSpacing: '-0.01em',
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    fontSize: 13,
    fontWeight: 500,
    color: '#714DFF',
    background: '#ede9fe',
    borderRadius: 9999,
    padding: '5px 14px',
  },
  tagIcon: {
    marginRight: 4,
  },
  remoteBadge: {
    fontSize: 12,
    fontWeight: 600,
    color: '#065f46',
    background: '#d1fae5',
    borderRadius: 9999,
    padding: '5px 14px',
  },
  experience: {
    fontSize: 14,
    color: '#6b7280',
    margin: '10px 0 0',
  },
  cardFooter: {
    display: 'flex',
    gap: 12,
  },
  btnOutline: {
    flex: 1,
    padding: '11px 0',
    fontSize: 14,
    fontWeight: 600,
    color: '#714DFF',
    background: '#fff',
    border: '1.5px solid #714DFF',
    borderRadius: 9999,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.2s, color 0.2s',
  },
  btnPrimary: {
    flex: 1,
    padding: '11px 0',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    background: '#714DFF',
    border: 'none',
    borderRadius: 9999,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.2s',
  },
  loaderWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80vh',
    background: '#fafafa',
    fontFamily: "var(--font-inter-tight, 'Inter Tight', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
  },
  spinner: {
    width: 44,
    height: 44,
    border: '4px solid #ede9fe',
    borderTop: '4px solid #714DFF',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loaderText: {
    marginTop: 18,
    color: '#6b7280',
    fontSize: 15,
    fontWeight: 500,
  },
  errorWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80vh',
    background: '#fafafa',
    fontFamily: "var(--font-inter-tight, 'Inter Tight', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
  },
  errorText: {
    color: '#dc2626',
    fontSize: 16,
    marginBottom: 20,
    fontWeight: 500,
  },
  retryBtn: {
    padding: '12px 32px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    background: '#714DFF',
    border: 'none',
    borderRadius: 9999,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.2s',
  },
  empty: {
    textAlign: 'center',
    padding: '80px 24px',
    maxWidth: 1100,
    margin: '0 auto',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: 500,
  },
};

// Inject keyframe animations for spinner and fade-in
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(16px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default CareerPage;
