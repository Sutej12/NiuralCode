import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API from '../api';

const OfferPage = () => {
  const { candidateId } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sendingOffer, setSendingOffer] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [form, setForm] = useState({
    job_title: '',
    start_date: '',
    base_salary: '',
    equity: '',
    bonus: '',
    reporting_manager: '',
    custom_terms: '',
  });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [candidateRes, offerRes] = await Promise.all([
          API.get(`/candidates/${candidateId}/`),
          API.get(`/offers/?candidate=${candidateId}`).catch(() => ({ data: [] })),
        ]);
        setCandidate(candidateRes.data);
        const offers = Array.isArray(offerRes.data)
          ? offerRes.data
          : offerRes.data.results || [];
        if (offers.length > 0) {
          setOffer(offers[0]);
        }
      } catch (err) {
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [candidateId]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleGenerateOffer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg('');
    try {
      const payload = { ...form, candidate: candidateId };
      if (payload.base_salary) payload.base_salary = Number(payload.base_salary);
      const res = await API.post('/offers/', payload);
      setOffer(res.data);
      setSuccessMsg('Offer letter generated successfully.');
    } catch (err) {
      setError('Failed to generate offer letter.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOffer = async () => {
    setSendingOffer(true);
    setError(null);
    try {
      const res = await API.post(`/offers/${offer.id}/send-offer/`);
      setOffer((prev) => ({ ...prev, ...res.data }));
      setSuccessMsg('Offer sent to candidate successfully.');
    } catch (err) {
      setError('Failed to send offer.');
    } finally {
      setSendingOffer(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loaderWrap}>
        <div style={styles.spinner} />
        <p style={styles.loaderText}>Loading offer details...</p>
      </div>
    );
  }

  const candidateLink = `${window.location.origin}/candidate/offer/${candidateId}`;

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Offer Letter</h1>

      {candidate && (
        <p style={styles.candidateLabel}>
          Candidate: <strong>{candidate.full_name}</strong>
        </p>
      )}

      {error && <div style={styles.errorBanner}>{error}</div>}
      {successMsg && <div style={styles.successBanner}>{successMsg}</div>}

      {!offer ? (
        <div style={styles.formSection}>
          <h3 style={styles.sectionTitle}>Generate Offer Letter</h3>
          <form onSubmit={handleGenerateOffer} style={styles.form}>
            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Job Title</label>
                <input
                  type="text"
                  name="job_title"
                  value={form.job_title}
                  onChange={handleChange}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  value={form.start_date}
                  onChange={handleChange}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Base Salary ($)</label>
                <input
                  type="number"
                  name="base_salary"
                  value={form.base_salary}
                  onChange={handleChange}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Equity</label>
                <input
                  type="text"
                  name="equity"
                  value={form.equity}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="e.g., 0.1% over 4 years"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Bonus ($)</label>
                <input
                  type="number"
                  name="bonus"
                  value={form.bonus}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Reporting Manager</label>
                <input
                  type="text"
                  name="reporting_manager"
                  value={form.reporting_manager}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Custom Terms</label>
              <textarea
                name="custom_terms"
                value={form.custom_terms}
                onChange={handleChange}
                style={styles.textarea}
                rows={4}
                placeholder="Any additional terms or conditions..."
              />
            </div>
            <button type="submit" style={styles.btnPrimary} disabled={submitting}>
              {submitting ? 'Generating...' : 'Generate Offer Letter'}
            </button>
          </form>
        </div>
      ) : (
        <div>
          <div style={styles.offerPreview}>
            <div style={styles.offerHeader}>
              <h3 style={styles.sectionTitle}>Offer Letter Preview</h3>
              <span style={styles.statusBadge}>
                {offer.status || 'Draft'}
              </span>
            </div>
            {offer.content ? (
              <div
                style={styles.letterContent}
                dangerouslySetInnerHTML={{
                  __html: offer.content,
                }}
              />
            ) : (
              <div style={styles.letterContent}>
                <p><strong>Job Title:</strong> {offer.job_title}</p>
                <p><strong>Start Date:</strong> {offer.start_date}</p>
                <p><strong>Base Salary:</strong> ${Number(offer.base_salary).toLocaleString()}</p>
                {offer.equity && <p><strong>Equity:</strong> {offer.equity}</p>}
                {offer.bonus && <p><strong>Bonus:</strong> ${Number(offer.bonus).toLocaleString()}</p>}
                {offer.reporting_manager && (
                  <p><strong>Reporting Manager:</strong> {offer.reporting_manager}</p>
                )}
                {offer.custom_terms && (
                  <p><strong>Additional Terms:</strong> {offer.custom_terms}</p>
                )}
              </div>
            )}
          </div>

          <div style={styles.actions}>
            <button
              style={styles.btnPrimary}
              onClick={handleSendOffer}
              disabled={sendingOffer || offer.status === 'sent' || offer.status === 'signed'}
            >
              {sendingOffer
                ? 'Sending...'
                : offer.status === 'sent' || offer.status === 'signed'
                ? 'Already Sent'
                : 'Send to Candidate'}
            </button>
          </div>

          <div style={styles.linkSection}>
            <h3 style={styles.sectionTitle}>Candidate Signing Link</h3>
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
        </div>
      )}
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
  heading: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 8px',
  },
  candidateLabel: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 24,
  },
  formSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#1a1a2e',
    margin: '0 0 16px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '10px 14px',
    fontSize: 14,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    outline: 'none',
  },
  textarea: {
    padding: '10px 14px',
    fontSize: 14,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  btnPrimary: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 500,
    color: '#fff',
    background: '#4f46e5',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  btnOutline: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: '#4f46e5',
    background: '#fff',
    border: '1px solid #4f46e5',
    borderRadius: 8,
    cursor: 'pointer',
  },
  offerPreview: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
  },
  offerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusBadge: {
    fontSize: 13,
    fontWeight: 600,
    color: '#4f46e5',
    background: '#eef2ff',
    borderRadius: 6,
    padding: '4px 12px',
    textTransform: 'capitalize',
  },
  letterContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 1.7,
    borderTop: '1px solid #e5e7eb',
    paddingTop: 16,
  },
  actions: {
    marginBottom: 28,
  },
  linkSection: {
    marginBottom: 32,
  },
  linkBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '12px 16px',
  },
  linkCode: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    wordBreak: 'break-all',
  },
  errorBanner: {
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '10px 16px',
    marginBottom: 16,
    fontSize: 14,
  },
  successBanner: {
    background: '#f0fdf4',
    color: '#166534',
    border: '1px solid #bbf7d0',
    borderRadius: 8,
    padding: '10px 16px',
    marginBottom: 16,
    fontSize: 14,
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
};

export default OfferPage;
