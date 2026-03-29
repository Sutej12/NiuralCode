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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <div style={{
            padding: '12px 20px', background: '#eef2ff', borderRadius: 8,
            border: '1px solid #c7d2fe', fontSize: 13, color: '#4f46e5',
            fontWeight: 500, lineHeight: 1.5,
          }}>
            📧 Check your email for a <strong>Track My Application</strong> link
          </div>
          <button style={styles.btn} onClick={() => navigate('/')}>
            Browse More Positions
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes drawCheck {
          0% { stroke-dashoffset: 30; }
          100% { stroke-dashoffset: 0; }
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
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  card: {
    textAlign: 'center',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: '48px 40px',
    maxWidth: 480,
    width: '100%',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
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
    background: '#d1fae5',
    animation: 'scaleIn 0.5s ease-out',
  },
  checkmark: {
    width: 36,
    height: 20,
    borderLeft: '4px solid #059669',
    borderBottom: '4px solid #059669',
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
  },
  submessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 1.6,
    margin: '0 0 32px',
  },
  btn: {
    display: 'inline-block',
    padding: '12px 32px',
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
    background: '#4f46e5',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    textDecoration: 'none',
  },
};

export default ApplicationSuccess;
