import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import API from '../api';

const ONBOARDING_STEPS = [
  { key: 'offer_signed', label: 'Offer Signed' },
  { key: 'slack_invite_sent', label: 'Slack Invite Sent', tsKey: 'slack_invite_sent_at' },
  { key: 'slack_joined', label: 'Joined Slack', tsKey: 'slack_joined_at' },
  { key: 'welcome_message_sent', label: 'Welcome Sent' },
  { key: 'hr_notified', label: 'HR Notified' },
];

const OnboardingPage = () => {
  const { candidateId } = useParams();
  const [onboarding, setOnboarding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const pollingRef = useRef(null);

  const fetchOnboarding = async () => {
    try {
      const res = await API.get(`/onboarding/?candidate=${candidateId}`);
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      if (data.length > 0) {
        setOnboarding(data[0]);
      } else {
        setOnboarding(null);
      }
    } catch (err) {
      setError('Failed to load onboarding status.');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchOnboarding();
      setLoading(false);
    };
    init();
  }, [candidateId]);

  useEffect(() => {
    pollingRef.current = setInterval(() => {
      fetchOnboarding();
    }, 10000);
    return () => clearInterval(pollingRef.current);
  }, [candidateId]);

  const handleTrigger = async () => {
    setTriggering(true);
    setError(null);
    setSuccessMsg('');
    try {
      await API.post('/onboarding/trigger/', { candidate_id: candidateId });
      setSuccessMsg('Slack onboarding triggered successfully.');
      await fetchOnboarding();
    } catch (err) {
      setError('Failed to trigger Slack onboarding.');
    } finally {
      setTriggering(false);
    }
  };

  const handleRefresh = async () => {
    setError(null);
    await fetchOnboarding();
  };

  const handleCheckSlackJoin = async () => {
    setChecking(true);
    setError(null);
    setSuccessMsg('');
    try {
      const res = await API.post('/onboarding/check-slack-join/', { candidate_id: candidateId });
      if (res.data.joined) {
        setSuccessMsg(res.data.message);
      } else {
        setSuccessMsg('Candidate has not joined Slack yet. Ask them to use the invite link.');
      }
      await fetchOnboarding();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check Slack join status.');
    } finally {
      setChecking(false);
    }
  };

  const getStepStatus = (stepKey) => {
    if (!onboarding) return 'pending';
    // offer_signed is always true if onboarding record exists (candidate is Hired)
    if (stepKey === 'offer_signed') return 'completed';
    if (onboarding[stepKey]) return 'completed';
    return 'pending';
  };

  const getStepTimestamp = (step) => {
    if (!onboarding) return null;
    if (step.tsKey && onboarding[step.tsKey]) return onboarding[step.tsKey];
    return null;
  };

  const completedCount = ONBOARDING_STEPS.filter(
    (s) => getStepStatus(s.key) === 'completed'
  ).length;
  const progressPercent = Math.round((completedCount / ONBOARDING_STEPS.length) * 100);

  if (loading) {
    return (
      <div style={styles.loaderWrap}>
        <div style={styles.spinner} />
        <p style={styles.loaderText}>Loading onboarding status...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <h1 style={styles.heading}>Onboarding Progress</h1>
        <button style={styles.btnRefresh} onClick={handleRefresh}>
          Refresh
        </button>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}
      {successMsg && <div style={styles.successBanner}>{successMsg}</div>}

      <div style={styles.progressSection}>
        <div style={styles.progressBarOuter}>
          <div
            style={{
              ...styles.progressBarInner,
              width: `${progressPercent}%`,
            }}
          />
        </div>
        <p style={styles.progressLabel}>
          {completedCount} of {ONBOARDING_STEPS.length} steps completed ({progressPercent}%)
        </p>
      </div>

      <div style={styles.stepsContainer}>
        {ONBOARDING_STEPS.map((step, index) => {
          const status = getStepStatus(step.key);
          const timestamp = getStepTimestamp(step);
          const isCompleted = status === 'completed';
          const isActive =
            !isCompleted &&
            (index === 0 || getStepStatus(ONBOARDING_STEPS[index - 1].key) === 'completed');

          return (
            <div key={step.key} style={styles.stepRow}>
              <div style={styles.stepIndicatorCol}>
                <div
                  style={{
                    ...styles.stepCircle,
                    background: isCompleted ? '#059669' : isActive ? '#714DFF' : '#d1d5db',
                    color: isCompleted || isActive ? '#fff' : '#9ca3af',
                  }}
                >
                  {isCompleted ? '\u2713' : index + 1}
                </div>
                {index < ONBOARDING_STEPS.length - 1 && (
                  <div
                    style={{
                      ...styles.stepLine,
                      background: isCompleted ? '#059669' : '#e5e7eb',
                    }}
                  />
                )}
              </div>
              <div style={styles.stepContent}>
                <p
                  style={{
                    ...styles.stepLabel,
                    color: isCompleted ? '#059669' : isActive ? '#1a1a2e' : '#9ca3af',
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  {step.label}
                </p>
                {timestamp && (
                  <p style={styles.stepTimestamp}>
                    {new Date(timestamp).toLocaleString()}
                  </p>
                )}
                {isCompleted && !timestamp && (
                  <p style={styles.stepTimestamp}>Completed</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.actions}>
        {!onboarding?.slack_invite_sent && (
          <button
            style={styles.btnPrimary}
            onClick={handleTrigger}
            disabled={triggering}
          >
            {triggering ? 'Triggering...' : 'Trigger Slack Onboarding'}
          </button>
        )}
        {onboarding?.slack_invite_sent && !onboarding?.slack_joined && (
          <button
            style={styles.btnPrimary}
            onClick={handleCheckSlackJoin}
            disabled={checking}
          >
            {checking ? 'Checking...' : 'Check if Joined Slack'}
          </button>
        )}
        {onboarding?.slack_joined && (
          <div style={{
            padding: '12px 24px', background: '#d1fae5', color: '#065f46',
            borderRadius: 9999, fontWeight: 600, fontSize: 14,
            fontFamily: "'Inter Tight', sans-serif",
          }}>
            Onboarding Complete
          </div>
        )}
      </div>

      <p style={styles.pollNote}>
        {!onboarding?.slack_invite_sent
          ? 'Slack invite is automatically sent when the candidate signs their offer. You can also trigger it manually above.'
          : !onboarding?.slack_joined
          ? 'The candidate received a Slack invite email. Once they join the workspace, click "Check if Joined Slack" to send the welcome message and notify HR.'
          : 'All onboarding steps are complete! The candidate has been welcomed to the team.'}
      </p>
    </div>
  );
};

const styles = {
  page: {
    maxWidth: 700,
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: 0,
  },
  btnRefresh: {
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 500,
    color: '#714DFF',
    background: '#eef2ff',
    border: '1px solid #e8e8e8',
    borderRadius: 9999,
    cursor: 'pointer',
    fontFamily: "'Inter Tight', sans-serif",
    transition: 'all 0.3s ease',
  },
  progressSection: {
    marginBottom: 32,
  },
  progressBarOuter: {
    width: '100%',
    height: 10,
    background: '#e5e7eb',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarInner: {
    height: '100%',
    background: '#059669',
    borderRadius: 5,
    transition: 'width 0.4s ease',
  },
  progressLabel: {
    fontSize: 13,
    color: '#6b7280',
    margin: 0,
  },
  stepsContainer: {
    marginBottom: 32,
    border: '1px solid #e8e8e8',
    borderRadius: '1.75rem',
    padding: '24px',
  },
  stepRow: {
    display: 'flex',
    gap: 16,
    minHeight: 64,
  },
  stepIndicatorCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 32,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
    transition: 'all 0.3s ease',
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    transition: 'all 0.3s ease',
  },
  stepContent: {
    paddingTop: 4,
    paddingBottom: 12,
  },
  stepLabel: {
    fontSize: 15,
    margin: '0 0 2px',
    transition: 'all 0.3s ease',
  },
  stepTimestamp: {
    fontSize: 12,
    color: '#9ca3af',
    margin: 0,
  },
  actions: {
    marginBottom: 16,
  },
  btnPrimary: {
    padding: '12px 28px',
    fontSize: 14,
    fontWeight: 500,
    color: '#fff',
    background: '#714DFF',
    border: 'none',
    borderRadius: 9999,
    cursor: 'pointer',
    fontFamily: "'Inter Tight', sans-serif",
    transition: 'all 0.3s ease',
  },
  btnSecondary: {
    padding: '12px 28px',
    fontSize: 14,
    fontWeight: 500,
    color: '#714DFF',
    background: '#eef2ff',
    border: '1px solid #e8e8e8',
    borderRadius: 9999,
    cursor: 'pointer',
    fontFamily: "'Inter Tight', sans-serif",
    transition: 'all 0.3s ease',
  },
  pollNote: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  errorBanner: {
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '1.75rem',
    padding: '10px 16px',
    marginBottom: 16,
    fontSize: 14,
  },
  successBanner: {
    background: '#f0fdf4',
    color: '#166534',
    border: '1px solid #bbf7d0',
    borderRadius: '1.75rem',
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
    borderTop: '4px solid #714DFF',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loaderText: {
    marginTop: 16,
    color: '#6b7280',
    fontSize: 15,
  },
};

export default OnboardingPage;
