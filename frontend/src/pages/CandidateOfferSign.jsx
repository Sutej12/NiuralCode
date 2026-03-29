import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import API from '../api';

const CandidateOfferSign = () => {
  const { candidateId } = useParams();
  const canvasRef = useRef(null);
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [error, setError] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/offers/candidate/${candidateId}/`);
        const data = res.data;
        if (data.status === 'signed') {
          setAlreadySigned(true);
        }
        setOffer(data);
      } catch (err) {
        setError('Failed to load offer letter.');
      } finally {
        setLoading(false);
      }
    };
    fetchOffer();
  }, [candidateId]);

  const getCanvasCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const redrawCanvas = useCallback(
    (pathsToDraw) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      pathsToDraw.forEach((path) => {
        if (path.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();
      });
    },
    []
  );

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCanvasCoords(e);
    setCurrentPath([coords]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    setCurrentPath((prev) => {
      const updated = [...prev, coords];
      redrawCanvas([...paths, updated]);
      return updated;
    });
  };

  const handleMouseUp = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    if (currentPath.length > 0) {
      setPaths((prev) => [...prev, currentPath]);
      setHasSignature(true);
    }
    setCurrentPath([]);
  };

  const handleClear = () => {
    setPaths([]);
    setCurrentPath([]);
    setHasSignature(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleUndo = () => {
    setPaths((prev) => {
      const updated = prev.slice(0, -1);
      redrawCanvas(updated);
      if (updated.length === 0) setHasSignature(false);
      return updated;
    });
  };

  const handleSign = async () => {
    if (!hasSignature || !offer) return;
    setSigning(true);
    setError(null);
    try {
      const canvas = canvasRef.current;
      const signatureData = canvas.toDataURL();
      await API.post(`/offers/${offer.id}/sign-offer/`, {
        signature_data: signatureData,
      });
      setSigned(true);
    } catch (err) {
      setError('Failed to sign offer. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loaderWrap}>
        <div style={styles.spinner} />
        <p style={styles.loaderText}>Loading offer letter...</p>
      </div>
    );
  }

  if (signed) {
    return (
      <div style={styles.confirmWrap}>
        <div style={styles.confirmCard}>
          <div style={styles.checkmark}>&#10003;</div>
          <h2 style={styles.confirmTitle}>Congratulations!</h2>
          <p style={styles.confirmText}>
            Your offer has been signed. Welcome to the team! You will receive further
            onboarding instructions shortly.
          </p>
        </div>
      </div>
    );
  }

  if (alreadySigned) {
    return (
      <div style={styles.confirmWrap}>
        <div style={styles.confirmCard}>
          <div style={styles.checkmark}>&#10003;</div>
          <h2 style={styles.confirmTitle}>Offer Already Signed</h2>
          <p style={styles.confirmText}>
            This offer has already been signed. If you have any questions, please contact the
            hiring team.
          </p>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div style={styles.page}>
        <div style={styles.emptyWrap}>
          <p style={styles.emptyText}>No offer letter found. Please contact the recruiter.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Your Offer Letter</h1>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <div style={styles.letterCard}>
        {offer.content ? (
          <div
            style={styles.letterBody}
            dangerouslySetInnerHTML={{
              __html: offer.content,
            }}
          />
        ) : (
          <div style={styles.letterBody}>
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

      <div style={styles.signatureSection}>
        <h3 style={styles.sectionTitle}>Your Signature</h3>
        <p style={styles.signatureHint}>Draw your signature in the box below.</p>
        <div style={styles.canvasWrap}>
          <canvas
            ref={canvasRef}
            width={500}
            height={160}
            style={styles.canvas}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          />
        </div>
        <div style={styles.canvasActions}>
          <button style={styles.btnOutline} onClick={handleUndo} disabled={paths.length === 0}>
            Undo
          </button>
          <button style={styles.btnOutline} onClick={handleClear} disabled={!hasSignature}>
            Clear
          </button>
        </div>
      </div>

      <button
        style={{
          ...styles.btnSign,
          opacity: hasSignature ? 1 : 0.5,
          cursor: hasSignature ? 'pointer' : 'not-allowed',
        }}
        onClick={handleSign}
        disabled={!hasSignature || signing}
      >
        {signing ? 'Signing...' : 'Sign & Accept Offer'}
      </button>
    </div>
  );
};

const styles = {
  page: {
    maxWidth: 700,
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  heading: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 24px',
  },
  letterCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 28,
    marginBottom: 32,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  letterBody: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 1.8,
  },
  signatureSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#1a1a2e',
    margin: '0 0 6px',
  },
  signatureHint: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  canvasWrap: {
    border: '2px dashed #d1d5db',
    borderRadius: 10,
    padding: 4,
    background: '#fafafa',
    display: 'inline-block',
    maxWidth: '100%',
  },
  canvas: {
    display: 'block',
    maxWidth: '100%',
    cursor: 'crosshair',
    touchAction: 'none',
  },
  canvasActions: {
    display: 'flex',
    gap: 10,
    marginTop: 10,
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
  btnSign: {
    width: '100%',
    padding: '14px 0',
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    background: '#059669',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
  },
  confirmWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  confirmCard: {
    textAlign: 'center',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 16,
    padding: '40px 48px',
    maxWidth: 440,
  },
  checkmark: {
    fontSize: 48,
    color: '#059669',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#065f46',
    margin: '0 0 12px',
  },
  confirmText: {
    fontSize: 15,
    color: '#374151',
    margin: 0,
    lineHeight: 1.6,
  },
  emptyWrap: {
    textAlign: 'center',
    padding: '60px 0',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 15,
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

export default CandidateOfferSign;
