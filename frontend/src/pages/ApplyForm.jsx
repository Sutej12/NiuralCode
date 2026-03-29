import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';

const VALID_REFERRAL_CODES = ['Sutej1999'];

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ApplyForm = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [jobTitle, setJobTitle] = useState('');
  const [jobStatus, setJobStatus] = useState('Open');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    linkedin_url: '',
    portfolio_url: '',
    resume: null,
    referral_code: '',
  });

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await API.get(`/jobs/${jobId}/`);
        setJobTitle(res.data.title || 'Open Position');
        setJobStatus(res.data.status || 'Open');
      } catch {
        setJobTitle('Open Position');
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [jobId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0] || null;
    setForm((prev) => ({ ...prev, resume: file }));
    if (fieldErrors.resume) {
      setFieldErrors((prev) => ({ ...prev, resume: '' }));
    }
  };

  const validate = () => {
    const errors = {};

    if (!form.full_name.trim()) {
      errors.full_name = 'Full name is required.';
    }

    if (!form.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(form.email)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!form.linkedin_url.trim()) {
      errors.linkedin_url = 'LinkedIn URL is required.';
    }

    if (form.referral_code.trim() && !VALID_REFERRAL_CODES.includes(form.referral_code.trim())) {
      errors.referral_code = 'Invalid referral code. Please check and try again, or leave it blank.';
    }

    if (!form.resume) {
      errors.resume = 'Resume is required.';
    } else {
      if (!ALLOWED_TYPES.includes(form.resume.type)) {
        errors.resume = 'Only PDF and DOCX files are accepted.';
      }
      if (form.resume.size > MAX_FILE_SIZE) {
        errors.resume = 'File size must be less than 5MB.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    const data = new FormData();
    data.append('job', jobId);
    data.append('full_name', form.full_name.trim());
    data.append('email', form.email.trim());
    data.append('linkedin_url', form.linkedin_url.trim());
    if (form.portfolio_url.trim()) {
      data.append('portfolio_url', form.portfolio_url.trim());
    }
    if (form.referral_code.trim()) {
      data.append('referral_code', form.referral_code.trim());
    }
    data.append('resume', form.resume);

    try {
      setSubmitting(true);
      console.log('Submitting form data:');
      for (let [key, value] of data.entries()) {
        console.log(`  ${key}:`, value instanceof File ? `File(${value.name}, ${value.size}bytes, ${value.type})` : value);
      }
      const response = await API.post('/candidates/apply/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      console.log('Success:', response.data);
      navigate('/apply/success');
    } catch (err) {
      console.error('Apply error:', err.response?.status, err.response?.data);
      if (err.response?.data) {
        const serverErrors = err.response.data;
        if (typeof serverErrors === 'object' && !Array.isArray(serverErrors)) {
          const mapped = {};
          const topErrors = [];
          Object.entries(serverErrors).forEach(([key, val]) => {
            const msg = Array.isArray(val) ? val.join(' ') : String(val);
            // Fields that have visible inputs on the form
            const formFields = ['full_name', 'email', 'linkedin_url', 'portfolio_url', 'resume'];
            if (formFields.includes(key)) {
              mapped[key] = msg;
            } else {
              // non_field_errors, job errors, detail, etc. → show as top banner
              topErrors.push(msg);
            }
          });
          if (topErrors.length > 0) {
            setError(topErrors.join(' '));
          }
          setFieldErrors(mapped);
        } else if (Array.isArray(serverErrors)) {
          setError(serverErrors.join(' '));
        } else {
          setError(
            typeof serverErrors === 'string'
              ? serverErrors
              : 'Submission failed. Please try again.'
          );
        }
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loaderWrap}>
        <div style={styles.spinner} />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Apply for Position</h1>
        <p style={styles.jobTitle}>{jobTitle}</p>

        {(jobStatus === 'Closed' || jobStatus === 'Paused') && (
          <div style={{
            textAlign: 'center', padding: '32px 20px', marginBottom: 20,
            background: jobStatus === 'Closed' ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${jobStatus === 'Closed' ? '#fecaca' : '#fde68a'}`,
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>
              {jobStatus === 'Closed' ? '🔴' : '⏸️'}
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, color: jobStatus === 'Closed' ? '#991b1b' : '#92400e' }}>
              {jobStatus === 'Closed'
                ? 'This position has been closed'
                : 'This position is currently on hold'}
            </h2>
            <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 16px', lineHeight: 1.6 }}>
              {jobStatus === 'Closed'
                ? 'This role is no longer accepting applications. Please browse our other open positions.'
                : 'Hiring for this role has been temporarily paused. Please check back later.'}
            </p>
            <button
              onClick={() => navigate('/')}
              style={{ padding: '10px 24px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
            >
              Browse Open Positions
            </button>
          </div>
        )}

        {error && <div style={styles.errorBanner}>{error}</div>}

        {jobStatus === 'Open' && <form onSubmit={handleSubmit} noValidate>
          <div style={styles.field}>
            <label style={styles.label}>
              Full Name <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              style={{
                ...styles.input,
                ...(fieldErrors.full_name ? styles.inputError : {}),
              }}
              placeholder="John Doe"
            />
            {fieldErrors.full_name && (
              <p style={styles.fieldError}>{fieldErrors.full_name}</p>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Email Address <span style={styles.required}>*</span>
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              style={{
                ...styles.input,
                ...(fieldErrors.email ? styles.inputError : {}),
              }}
              placeholder="john@example.com"
            />
            {fieldErrors.email && (
              <p style={styles.fieldError}>{fieldErrors.email}</p>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              LinkedIn URL <span style={styles.required}>*</span>
            </label>
            <input
              type="url"
              name="linkedin_url"
              value={form.linkedin_url}
              onChange={handleChange}
              style={{
                ...styles.input,
                ...(fieldErrors.linkedin_url ? styles.inputError : {}),
              }}
              placeholder="https://linkedin.com/in/yourprofile"
            />
            {fieldErrors.linkedin_url && (
              <p style={styles.fieldError}>{fieldErrors.linkedin_url}</p>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Portfolio URL (Optional)</label>
            <input
              type="url"
              name="portfolio_url"
              value={form.portfolio_url}
              onChange={handleChange}
              style={styles.input}
              placeholder="https://yourportfolio.com"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Referral Code (Optional)</label>
            <input
              type="text"
              name="referral_code"
              value={form.referral_code}
              onChange={handleChange}
              style={{
                ...styles.input,
                ...(fieldErrors.referral_code ? styles.inputError : {}),
              }}
              placeholder="Enter referral code if you have one"
            />
            <p style={styles.hint}>Have a referral? Enter the code to get priority consideration.</p>
            {fieldErrors.referral_code && (
              <p style={styles.fieldError}>{fieldErrors.referral_code}</p>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Resume <span style={styles.required}>*</span>
            </label>
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileChange}
              style={{
                ...styles.fileInput,
                ...(fieldErrors.resume ? styles.inputError : {}),
              }}
            />
            <p style={styles.hint}>PDF or DOCX only. Maximum 5MB.</p>
            {fieldErrors.resume && (
              <p style={styles.fieldError}>{fieldErrors.resume}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...styles.submitBtn,
              ...(submitting ? styles.submitBtnDisabled : {}),
            }}
          >
            {submitting ? (
              <span style={styles.btnInner}>
                <span style={styles.btnSpinner} />
                Submitting...
              </span>
            ) : (
              'Submit Application'
            )}
          </button>
        </form>}
      </div>
    </div>
  );
};

const styles = {
  page: {
    maxWidth: 600,
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 32,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  heading: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 4px',
  },
  jobTitle: {
    fontSize: 16,
    color: '#4f46e5',
    fontWeight: 500,
    margin: '0 0 28px',
  },
  errorBanner: {
    padding: '12px 16px',
    marginBottom: 20,
    background: '#fef2f2',
    color: '#dc2626',
    borderRadius: 8,
    fontSize: 14,
    border: '1px solid #fecaca',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 6,
  },
  required: {
    color: '#dc2626',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  fileInput: {
    width: '100%',
    padding: '10px 0',
    fontSize: 14,
    boxSizing: 'border-box',
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    margin: '4px 0 0',
  },
  fieldError: {
    fontSize: 13,
    color: '#dc2626',
    margin: '4px 0 0',
  },
  submitBtn: {
    width: '100%',
    padding: '14px 0',
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    background: '#4f46e5',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  btnInner: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  },
  btnSpinner: {
    display: 'inline-block',
    width: 16,
    height: 16,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loaderWrap: {
    display: 'flex',
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
};

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(styleSheet);
}

export default ApplyForm;
