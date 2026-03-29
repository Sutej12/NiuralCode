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
        <button style={styles.retryBtn} onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.heading}>Career Opportunities</h1>
        <p style={styles.subheading}>
          Join our team and help build something meaningful.
        </p>
      </header>

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

      {filtered.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>No positions match your search criteria.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((job) => (
            <div key={job.id} style={styles.card}>
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
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  View Details
                </button>
                <button
                  style={styles.btnPrimary}
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
    maxWidth: 1100,
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  header: {
    textAlign: 'center',
    marginBottom: 36,
  },
  heading: {
    fontSize: 32,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 8px',
  },
  subheading: {
    fontSize: 16,
    color: '#6b7280',
    margin: 0,
  },
  filterBar: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 32,
  },
  searchInput: {
    flex: '1 1 300px',
    padding: '10px 16px',
    fontSize: 14,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    outline: 'none',
  },
  select: {
    padding: '10px 16px',
    fontSize: 14,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    background: '#fff',
    outline: 'none',
    minWidth: 180,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 24,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 24,
    transition: 'box-shadow 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  cardBody: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#1a1a2e',
    margin: '0 0 12px',
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  tag: {
    fontSize: 13,
    color: '#374151',
    background: '#f3f4f6',
    borderRadius: 6,
    padding: '4px 10px',
  },
  tagIcon: {
    marginRight: 4,
  },
  remoteBadge: {
    fontSize: 12,
    fontWeight: 600,
    color: '#065f46',
    background: '#d1fae5',
    borderRadius: 6,
    padding: '4px 10px',
  },
  experience: {
    fontSize: 14,
    color: '#6b7280',
    margin: '8px 0 0',
  },
  cardFooter: {
    display: 'flex',
    gap: 10,
  },
  btnOutline: {
    flex: 1,
    padding: '10px 0',
    fontSize: 14,
    fontWeight: 500,
    color: '#4f46e5',
    background: '#fff',
    border: '1px solid #4f46e5',
    borderRadius: 8,
    cursor: 'pointer',
  },
  btnPrimary: {
    flex: 1,
    padding: '10px 0',
    fontSize: 14,
    fontWeight: 500,
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
  retryBtn: {
    padding: '10px 24px',
    fontSize: 14,
    color: '#fff',
    background: '#4f46e5',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 0',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
  },
};

// Inject keyframe animation for spinner
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(styleSheet);
}

export default CareerPage;
