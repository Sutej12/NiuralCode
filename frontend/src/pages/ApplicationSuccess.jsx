import React from 'react';
import { useNavigate } from 'react-router-dom';

const ApplicationSuccess = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.checkmarkWrap}>
          <div style={styles.checkmarkCircle}>
            <div style={styles.checkmark} />
          </div>
        </div>

        <h1 style={styles.heading}>Application Submitted!</h1>
        <p style={styles.message}>
          Your application has been submitted successfully!
        </p>
        <p style={styles.submessage}>
          You will receive a confirmation email shortly with a link to track
          your application status in real-time. Our team will review your
          application and get back to you within a few business days.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
          <div style={styles.emailTip}>
            📧 Check your email for a <strong>Track My Application</strong> link
          </div>
          <button
            style={styles.btn}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
            onClick={() => navigate('/')}
          >
            Browse More Positions
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const styles = {
  page: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '70vh',
    padding: 20,
    fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  card: {
    textAlign: 'center',
    background: '#fff',
    borderRadius: 28,
    padding: '52px 44px',
    maxWidth: 480,
    width: '100%',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04)',
  },
  checkmarkWrap: {
    marginBottom: 28,
  },
  checkmarkCircle: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #714DFF 0%, #E151FF 100%)',
    animation: 'scaleIn 0.5s ease-out',
  },
  checkmark: {
    width: 36,
    height: 20,
    borderLeft: '4px solid #fff',
    borderBottom: '4px solid #fff',
    transform: 'rotate(-45deg)',
    marginTop: -6,
  },
  heading: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 12px',
  },
  message: {
    fontSize: 16,
    color: '#374151',
    margin: '0 0 8px',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  submessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 1.7,
    margin: '0 0 32px',
  },
  emailTip: {
    padding: '12px 22px',
    background: '#ede9fe',
    borderRadius: 9999,
    fontSize: 13,
    color: '#714DFF',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  btn: {
    display: 'inline-block',
    padding: '13px 36px',
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, #714DFF 0%, #E151FF 100%)',
    border: 'none',
    borderRadius: 9999,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'opacity 0.2s ease, transform 0.2s ease',
    fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
};

export default ApplicationSuccess;
