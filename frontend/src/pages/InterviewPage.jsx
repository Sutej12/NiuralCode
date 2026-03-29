import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';

const InterviewPage = () => {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [savingTranscript, setSavingTranscript] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Live recording state
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [speakerLabel, setSpeakerLabel] = useState('Interviewer');

  // Video state
  const [cameraOn, setCameraOn] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const pollRef = useRef(null);
  const lineCountRef = useRef(0);
  const speakerLabelRef = useRef('Interviewer');
  const recordingTimeRef = useRef(0);

  const fetchData = async () => {
    try {
      const [intRes, candRes] = await Promise.all([
        API.get(`/interviews/?candidate=${candidateId}`),
        API.get(`/candidates/${candidateId}/`),
      ]);
      const data = Array.isArray(intRes.data) ? intRes.data : intRes.data.results || [];
      setInterview(data.length > 0 ? data[0] : null);
      setCandidate(candRes.data);
    } catch (err) {
      setError('Failed to load data.');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    init();
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [candidateId]);

  // Keep refs in sync to avoid stale closures in speech recognition callbacks
  useEffect(() => { speakerLabelRef.current = speakerLabel; }, [speakerLabel]);
  useEffect(() => { recordingTimeRef.current = recordingTime; }, [recordingTime]);

  const toggleCamera = async () => {
    if (cameraOn) {
      // Turn off
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraOn(false);
    } else {
      // Turn on
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        setCameraOn(true);
        setMicMuted(false);
      } catch (err) {
        setError('Could not access camera. Please allow camera permissions.');
      }
    }
  };

  // Attach stream to video element after it renders
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOn]);

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = micMuted; // toggle
      });
      setMicMuted(!micMuted);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await API.post('/interviews/', { candidate: candidateId });
      setInterview(res.data);
      setSuccessMsg('Interview created. You can now start the mock interview.');
    } catch (err) {
      setError('Failed to create interview.');
    } finally {
      setCreating(false);
    }
  };

  // Speech recognition setup
  const startRecording = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in your browser. Please use Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }
      if (finalText) {
        // Use refs to get current values (avoids stale closure)
        const currentSpeaker = speakerLabelRef.current;
        const currentTime = recordingTimeRef.current;
        const timestamp = formatTime(currentTime);
        const line = `[${timestamp}] ${currentSpeaker}: ${finalText.trim()}`;
        setLiveTranscript((prev) => (prev ? prev + '\n' + line : line));

        // Send line to backend for shared transcript
        if (interview?.id) {
          API.post(`/interviews/${interview.id}/append-line/`, {
            speaker: currentSpeaker,
            text: finalText.trim(),
            timestamp: timestamp,
          }).catch(() => {});
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        console.error('Speech recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still recording
      if (isRecording) {
        try { recognition.start(); } catch (e) {}
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setError(null);

    // Start timer
    const startTime = Date.now() - (recordingTime * 1000);
    timerRef.current = setInterval(() => {
      setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  }, [recordingTime, speakerLabel, isRecording]);

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setInterimText('');
  };

  // Poll for remote lines (from candidate side) when recording
  useEffect(() => {
    if (isRecording && interview?.id) {
      lineCountRef.current = 0;
      pollRef.current = setInterval(async () => {
        try {
          const res = await API.get(`/interviews/${interview.id}/live-lines/?since=${lineCountRef.current}`);
          const newLines = res.data.lines || [];
          if (newLines.length > 0) {
            // Only add lines from the Candidate (remote side) — interviewer lines are already local
            const remoteLines = newLines.filter((l) => l.speaker === 'Candidate');
            if (remoteLines.length > 0) {
              const formatted = remoteLines.map((l) => `[${l.timestamp}] ${l.speaker}: ${l.text}`).join('\n');
              setLiveTranscript((prev) => (prev ? prev + '\n' + formatted : formatted));
            }
            lineCountRef.current = res.data.total;
          }
        } catch {}
      }, 3000);
      return () => clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isRecording, interview?.id, speakerLabel]);

  // Finalize live transcript to saved transcript (merges local + remote lines)
  const handleFinalize = async () => {
    if (!interview?.id) return;
    setSavingTranscript(true);
    setError(null);
    try {
      const res = await API.post(`/interviews/${interview.id}/finalize-transcript/`, {
        local_transcript: liveTranscript,
      });
      setInterview((prev) => ({ ...prev, ...res.data }));
      setSuccessMsg('Live transcript finalized and saved! You can now run AI analysis.');
      setLiveTranscript('');
      setRecordingTime(0);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to finalize transcript.';
      setError(msg);
    } finally {
      setSavingTranscript(false);
    }
  };

  const handleSaveTranscript = async () => {
    if (!liveTranscript.trim()) {
      setError('No transcript to save. Start recording first.');
      return;
    }
    setSavingTranscript(true);
    setError(null);
    try {
      const res = await API.post(`/interviews/${interview.id}/save-transcript/`, {
        transcript: liveTranscript,
      });
      setInterview((prev) => ({ ...prev, ...res.data }));
      setSuccessMsg('Transcript saved successfully! You can now run AI analysis.');
      setLiveTranscript('');
      setRecordingTime(0);
    } catch (err) {
      setError('Failed to save transcript.');
    } finally {
      setSavingTranscript(false);
    }
  };

  const handleFetchMockTranscript = async () => {
    setError(null);
    try {
      const res = await API.post(`/interviews/${interview.id}/fetch-transcript/`);
      setInterview((prev) => ({ ...prev, ...res.data }));
      setSuccessMsg('Mock transcript loaded. You can now run AI analysis.');
    } catch (err) {
      setError('Failed to fetch transcript.');
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await API.post(`/interviews/${interview.id}/analyze-interview/`);
      setInterview((prev) => ({ ...prev, ...res.data }));
      setSuccessMsg('AI analysis complete!');
    } catch (err) {
      setError('Failed to analyze interview. Make sure a transcript exists.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Auto-scroll live transcript
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveTranscript, interimText]);

  if (loading) {
    return (
      <div style={styles.loaderWrap}>
        <div style={styles.spinner} />
        <p style={styles.loaderText}>Loading interview...</p>
      </div>
    );
  }

  if (!interview) {
    return (
      <div style={styles.page}>
        <button onClick={() => navigate(`/admin/candidates/${candidateId}`)} style={styles.backBtn}>
          &larr; Back to Candidate
        </button>
        <h1 style={styles.heading}>Interview</h1>
        {error && <div style={styles.errorBanner}>{error}</div>}
        <div style={styles.emptyWrap}>
          <div style={styles.emptyIcon}>🎙️</div>
          <p style={styles.emptyText}>No interview has been created for this candidate yet.</p>
          <button style={styles.btnPrimary} onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating...' : 'Create Interview'}
          </button>
        </div>
      </div>
    );
  }

  const feedback = interview.ai_feedback;

  return (
    <div style={styles.page}>
      <button onClick={() => navigate(`/admin/candidates/${candidateId}`)} style={styles.backBtn}>
        &larr; Back to Candidate
      </button>
      <h1 style={styles.heading}>
        Interview — {candidate?.full_name || 'Candidate'}
      </h1>

      {error && <div style={styles.errorBanner}>{error}</div>}
      {successMsg && (
        <div style={styles.successBanner}>
          {successMsg}
          <button onClick={() => setSuccessMsg('')} style={styles.dismissBtn}>✕</button>
        </div>
      )}

      {/* Status Card */}
      <div style={styles.infoCard}>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Status</span>
          <span style={{
            ...styles.infoBadge,
            background: interview.status === 'completed' ? '#d1fae5' : '#f0ecff',
            color: interview.status === 'completed' ? '#065f46' : PRIMARY,
          }}>{interview.status}</span>
        </div>
        {candidate?.job_title && (
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Position</span>
            <span style={styles.infoValue}>{candidate.job_title}</span>
          </div>
        )}
      </div>

      {/* Mock Interview Room — hidden for Hired/Onboarded (read-only records) */}
      {!['Hired', 'Onboarded'].includes(candidate?.status) && <div style={styles.roomCard}>
        <div style={styles.roomHeader}>
          <h2 style={styles.roomTitle}>🎙️ Interview Room</h2>
          <div style={styles.roomStatus}>
            {isRecording && <span style={styles.recordingDot} />}
            <span style={{ color: isRecording ? '#dc2626' : '#6b7280', fontWeight: 600, fontSize: 14 }}>
              {isRecording ? 'Recording' : 'Not Recording'}
            </span>
            <span style={styles.timer}>{formatTime(recordingTime)}</span>
          </div>
        </div>

        {/* Video Call Area */}
        <div style={styles.videoGrid}>
          {/* Main video (Interviewer) */}
          <div style={styles.videoMain}>
            {cameraOn ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={styles.videoElement}
              />
            ) : (
              <div style={styles.videoPlaceholder}>
                <div style={styles.avatarCircle}>👤</div>
                <div style={styles.videoName}>Interviewer</div>
                <div style={styles.videoCamOff}>Camera Off</div>
              </div>
            )}
            <div style={styles.videoLabel}>
              <span style={styles.videoLabelText}>You (Interviewer)</span>
              {isRecording && <span style={styles.recBadge}>● REC</span>}
            </div>
          </div>

          {/* Candidate video (simulated) */}
          <div style={styles.videoSecondary}>
            <div style={styles.videoPlaceholderSmall}>
              <div style={styles.avatarCircleSmall}>🎓</div>
              <div style={styles.videoNameSmall}>{candidate?.full_name || 'Candidate'}</div>
            </div>
            <div style={styles.videoLabelSmall}>
              <span style={styles.videoLabelText}>{candidate?.full_name || 'Candidate'}</span>
            </div>
          </div>
        </div>

        {/* Video Controls Bar */}
        <div style={styles.videoControls}>
          <button
            onClick={toggleMic}
            style={{
              ...styles.controlBtn,
              background: micMuted ? '#dc2626' : '#374151',
            }}
            title={micMuted ? 'Unmute' : 'Mute'}
          >
            {micMuted ? '🔇' : '🎤'}
          </button>
          <button
            onClick={toggleCamera}
            style={{
              ...styles.controlBtn,
              background: cameraOn ? '#374151' : '#dc2626',
            }}
            title={cameraOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {cameraOn ? '📹' : '📷'}
          </button>
          {!isRecording ? (
            <button onClick={startRecording} style={{ ...styles.controlBtn, background: '#059669' }} title="Start Notetaker">
              ⏺
            </button>
          ) : (
            <button onClick={stopRecording} style={{ ...styles.controlBtn, background: '#dc2626' }} title="Stop Notetaker">
              ⏹
            </button>
          )}
          <button
            onClick={handleSaveTranscript}
            disabled={savingTranscript || !liveTranscript.trim()}
            style={{
              ...styles.controlBtn,
              background: PRIMARY,
              opacity: (!liveTranscript.trim() || savingTranscript) ? 0.4 : 1,
            }}
            title="Save Local Transcript"
          >
            💾
          </button>
          <button
            onClick={handleFinalize}
            disabled={savingTranscript || !interview?.id}
            style={{
              ...styles.controlBtn,
              background: '#059669',
              opacity: savingTranscript ? 0.4 : 1,
              fontSize: 14,
              width: 'auto',
              borderRadius: 8,
              padding: '0 14px',
            }}
            title="Finalize shared live transcript (both sides)"
          >
            ✅ Finalize
          </button>
        </div>

        {/* Speaker Selector */}
        <div style={styles.speakerRow}>
          <span style={styles.speakerLabel}>Label speech as:</span>
          <div style={styles.speakerButtons}>
            {['Interviewer', 'Candidate'].map((label) => (
              <button
                key={label}
                onClick={() => setSpeakerLabel(label)}
                style={{
                  ...styles.speakerBtn,
                  background: speakerLabel === label ? (label === 'Interviewer' ? '#714DFF' : '#059669') : '#f3f4f6',
                  color: speakerLabel === label ? '#fff' : '#374151',
                  border: speakerLabel === label ? 'none' : '1px solid #374151',
                }}
              >
                {label === 'Interviewer' ? '👤' : '🎓'} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Transcript Area */}
        <div style={styles.liveTranscriptBox}>
          {!liveTranscript && !interimText && !isRecording && (
            <div style={styles.placeholderText}>
              Click ⏺ to start the notetaker. Speak into your microphone and the transcript will appear here in real-time.
            </div>
          )}
          {liveTranscript && (
            <pre style={styles.liveText}>{liveTranscript}</pre>
          )}
          {interimText && (
            <pre style={styles.interimText}>
              [{formatTime(recordingTime)}] {speakerLabel}: {interimText}...
            </pre>
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Secondary Controls */}
        <div style={styles.controlRow}>
          <button
            onClick={() => { setLiveTranscript(''); setRecordingTime(0); }}
            style={styles.clearBtn}
            disabled={isRecording}
          >
            🗑 Clear Transcript
          </button>
        </div>

        <div style={styles.dividerRow}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <span style={styles.dividerLine} />
        </div>

        <button onClick={handleFetchMockTranscript} style={styles.mockBtn}>
          📋 Load Mock Transcript (for testing)
        </button>
      </div>}

      {/* Saved Transcript */}
      {interview.transcript && (
        <div style={styles.section}>
          <button
            style={styles.collapseToggle}
            onClick={() => setTranscriptOpen(!transcriptOpen)}
          >
            📝 Saved Transcript ({interview.transcript.split('\n').length} lines)
            <span style={styles.chevron}>{transcriptOpen ? ' ▲' : ' ▼'}</span>
          </button>
          {transcriptOpen && (
            <div style={styles.transcriptBox}>
              <pre style={styles.transcriptText}>{interview.transcript}</pre>
            </div>
          )}
        </div>
      )}

      {/* AI Analysis Section */}
      <div style={styles.section}>
        <div style={styles.analyzeRow}>
          <h3 style={styles.sectionTitle}>🤖 AI Analysis</h3>
          <button
            style={{
              ...styles.btnPrimary,
              opacity: analyzing || !interview.transcript ? 0.5 : 1,
            }}
            onClick={handleAnalyze}
            disabled={analyzing || !interview.transcript}
          >
            {analyzing ? 'Analyzing...' : 'Run AI Analysis'}
          </button>
        </div>

        {!interview.transcript && !feedback && (
          <p style={styles.hintText}>
            Record or load a transcript first, then run AI analysis.
          </p>
        )}

        {interview.summary && (
          <div style={styles.summaryBox}>
            <h4 style={styles.feedbackLabel}>Summary</h4>
            <p style={styles.summaryText}>{interview.summary}</p>
          </div>
        )}

        {feedback && (
          <div style={styles.feedbackGrid}>
            {feedback.strengths && (
              <div style={{ ...styles.feedbackCard, borderLeft: '4px solid #059669' }}>
                <h4 style={styles.feedbackLabel}>✅ Strengths</h4>
                <ul style={styles.feedbackList}>
                  {(Array.isArray(feedback.strengths) ? feedback.strengths : [feedback.strengths]).map((item, i) => (
                    <li key={i} style={styles.feedbackItem}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {feedback.weaknesses && (
              <div style={{ ...styles.feedbackCard, borderLeft: '4px solid #dc2626' }}>
                <h4 style={styles.feedbackLabel}>⚠️ Areas of Concern</h4>
                <ul style={styles.feedbackList}>
                  {(Array.isArray(feedback.weaknesses) ? feedback.weaknesses : [feedback.weaknesses]).map((item, i) => (
                    <li key={i} style={styles.feedbackItem}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {feedback.recommendation && (
              <div style={{ ...styles.feedbackCard, borderLeft: `4px solid ${PRIMARY}` }}>
                <h4 style={styles.feedbackLabel}>📊 Recommendation</h4>
                <p style={styles.feedbackText}>{feedback.recommendation}</p>
              </div>
            )}
            {feedback.score != null && (
              <div style={{ ...styles.feedbackCard, borderLeft: '4px solid #d97706' }}>
                <h4 style={styles.feedbackLabel}>🏆 Interview Score</h4>
                <div style={{
                  fontSize: 48, fontWeight: 800,
                  color: feedback.score >= 70 ? '#16a34a' : feedback.score >= 40 ? '#ca8a04' : '#dc2626',
                }}>
                  {feedback.score}/100
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const FONT = "'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const PRIMARY = '#714DFF';
const GRADIENT = 'linear-gradient(135deg, #714DFF 0%, #E151FF 100%)';

const styles = {
  page: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '24px 20px',
    fontFamily: FONT,
  },
  backBtn: {
    background: 'none', border: 'none', color: PRIMARY,
    cursor: 'pointer', fontSize: 14, padding: 0, fontWeight: 600, marginBottom: 16,
    fontFamily: FONT, transition: 'opacity 0.2s',
  },
  heading: { fontSize: 26, fontWeight: 700, color: '#1a1a2e', margin: '0 0 20px', fontFamily: FONT },
  infoCard: {
    background: '#f9fafb', border: '1px solid #e8e8e8',
    borderRadius: '1.75rem', padding: 20, marginBottom: 24,
    transition: 'all 0.3s ease',
  },
  infoRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' },
  infoLabel: { fontSize: 14, fontWeight: 500, color: '#6b7280', fontFamily: FONT },
  infoValue: { fontSize: 14, color: '#374151', fontWeight: 500, fontFamily: FONT },
  infoBadge: {
    fontSize: 13, fontWeight: 600, borderRadius: 9999, padding: '3px 12px',
    textTransform: 'capitalize', fontFamily: FONT,
  },

  // Interview Room
  roomCard: {
    background: '#1a1a2e', border: '2px solid #374151', borderRadius: '1.75rem',
    padding: 24, marginBottom: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  },
  roomHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  roomTitle: { fontSize: 20, fontWeight: 700, color: '#fff', margin: 0, fontFamily: FONT },
  roomStatus: { display: 'flex', alignItems: 'center', gap: 8 },
  recordingDot: {
    width: 10, height: 10, borderRadius: '50%', background: '#dc2626',
    display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite',
  },
  timer: {
    fontFamily: 'monospace', fontSize: 16, fontWeight: 600, color: '#e5e7eb',
    background: '#374151', padding: '4px 10px', borderRadius: 6,
  },

  // Video Grid
  videoGrid: {
    display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12,
    marginBottom: 12, minHeight: 320,
  },
  videoMain: {
    position: 'relative', borderRadius: 16, overflow: 'hidden',
    background: '#0f0f1a', border: '1px solid #374151',
  },
  videoElement: {
    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
    transform: 'scaleX(-1)', minHeight: 320,
  },
  videoPlaceholder: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100%', minHeight: 320,
    background: 'linear-gradient(135deg, #1e1b4b, #0f172a)',
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: '50%', background: '#374151',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 36, marginBottom: 12,
  },
  videoName: { color: '#e5e7eb', fontSize: 16, fontWeight: 600 },
  videoCamOff: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  videoLabel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: '8px 12px', background: 'rgba(0,0,0,0.6)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  videoLabelText: { color: '#fff', fontSize: 13, fontWeight: 500 },
  recBadge: {
    color: '#dc2626', fontSize: 11, fontWeight: 700,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  videoSecondary: {
    position: 'relative', borderRadius: 16, overflow: 'hidden',
    background: '#0f0f1a', border: '1px solid #374151',
  },
  videoPlaceholderSmall: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100%', minHeight: 320,
    background: 'linear-gradient(135deg, #1e3a5f, #0f172a)',
  },
  avatarCircleSmall: {
    width: 60, height: 60, borderRadius: '50%', background: '#374151',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, marginBottom: 10,
  },
  videoNameSmall: { color: '#e5e7eb', fontSize: 14, fontWeight: 500 },
  videoLabelSmall: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: '6px 10px', background: 'rgba(0,0,0,0.6)',
  },

  // Video Controls
  videoControls: {
    display: 'flex', justifyContent: 'center', gap: 12,
    padding: '12px 0', marginBottom: 12,
  },
  controlBtn: {
    width: 48, height: 48, borderRadius: '50%', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, cursor: 'pointer', color: '#fff',
    transition: 'transform 0.15s, opacity 0.15s',
  },

  speakerRow: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
  },
  speakerLabel: { fontSize: 14, fontWeight: 500, color: '#9ca3af' },
  speakerButtons: { display: 'flex', gap: 8 },
  speakerBtn: {
    padding: '6px 14px', borderRadius: 8, border: '1px solid #374151',
    cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
  },
  liveTranscriptBox: {
    background: '#0f0f1a', borderRadius: 16, padding: 20,
    minHeight: 160, maxHeight: 280, overflow: 'auto', marginBottom: 12,
    border: '1px solid #374151',
  },
  placeholderText: {
    color: '#6b7280', fontSize: 14, textAlign: 'center', paddingTop: 50,
    lineHeight: 1.6,
  },
  liveText: {
    color: '#e5e7eb', fontSize: 13, whiteSpace: 'pre-wrap', fontFamily: 'monospace',
    margin: 0, lineHeight: 1.8,
  },
  interimText: {
    color: '#9ca3af', fontSize: 13, whiteSpace: 'pre-wrap', fontFamily: 'monospace',
    margin: 0, fontStyle: 'italic', lineHeight: 1.8,
  },
  controlRow: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 },
  startBtn: {
    padding: '10px 20px', fontSize: 14, fontWeight: 600, color: '#fff',
    background: '#059669', border: 'none', borderRadius: 8, cursor: 'pointer',
  },
  stopBtn: {
    padding: '10px 20px', fontSize: 14, fontWeight: 600, color: '#fff',
    background: '#dc2626', border: 'none', borderRadius: 8, cursor: 'pointer',
  },
  saveBtn: {
    padding: '10px 20px', fontSize: 14, fontWeight: 600, color: '#fff',
    background: PRIMARY, border: 'none', borderRadius: 8, cursor: 'pointer',
  },
  clearBtn: {
    padding: '10px 20px', fontSize: 14, fontWeight: 500, color: '#9ca3af',
    background: '#1e1b4b', border: '1px solid #374151', borderRadius: 8, cursor: 'pointer',
  },
  mockBtn: {
    width: '100%', padding: '10px', fontSize: 14, fontWeight: 500,
    color: '#a5b4fc', background: '#1e1b4b', border: '1px solid #374151',
    borderRadius: 8, cursor: 'pointer',
  },
  dividerRow: {
    display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0',
  },
  dividerLine: { flex: 1, height: 1, background: '#374151' },
  dividerText: { fontSize: 12, color: '#6b7280', fontWeight: 500 },

  // Transcript & Analysis
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: 600, color: '#1a1a2e', margin: 0, fontFamily: FONT },
  analyzeRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  hintText: { color: '#9ca3af', fontSize: 14, fontStyle: 'italic' },
  collapseToggle: {
    background: 'none', border: 'none', fontSize: 15, fontWeight: 500,
    color: PRIMARY, cursor: 'pointer', padding: 0, marginBottom: 8,
    fontFamily: FONT,
  },
  chevron: { fontSize: 12 },
  transcriptBox: {
    background: '#f9fafb', border: '1px solid #e8e8e8',
    borderRadius: '1.75rem', padding: 16, maxHeight: 400, overflow: 'auto',
  },
  transcriptText: {
    fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap',
    fontFamily: 'monospace', margin: 0, lineHeight: 1.6,
  },
  summaryBox: {
    background: '#f0ecff', border: '1px solid #ddd6fe',
    borderRadius: '1.75rem', padding: 16, marginBottom: 14,
  },
  summaryText: { fontSize: 14, color: '#374151', margin: '8px 0 0', lineHeight: 1.6, fontFamily: FONT },
  feedbackGrid: { display: 'flex', flexDirection: 'column', gap: 14 },
  feedbackCard: {
    background: '#fff', border: '1px solid #e8e8e8', borderRadius: '1.75rem', padding: '16px 20px',
    transition: 'all 0.3s ease',
  },
  feedbackLabel: { fontSize: 15, fontWeight: 600, color: '#1a1a2e', margin: '0 0 8px', fontFamily: FONT },
  feedbackList: { margin: 0, paddingLeft: 20 },
  feedbackItem: { fontSize: 14, color: '#374151', marginBottom: 4, lineHeight: 1.5 },
  feedbackText: { fontSize: 14, color: '#374151', margin: 0, lineHeight: 1.5 },
  emptyWrap: { textAlign: 'center', padding: '60px 0' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#6b7280', fontSize: 15, marginBottom: 20, fontFamily: FONT },
  btnPrimary: {
    padding: '10px 24px', fontSize: 14, fontWeight: 600, color: '#fff',
    background: GRADIENT, border: 'none', borderRadius: 9999, cursor: 'pointer',
    fontFamily: FONT, transition: 'all 0.3s ease',
  },
  errorBanner: {
    background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
    borderRadius: '1.75rem', padding: '10px 16px', marginBottom: 16, fontSize: 14,
    fontFamily: FONT,
  },
  successBanner: {
    background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
    borderRadius: '1.75rem', padding: '10px 16px', marginBottom: 16, fontSize: 14,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontFamily: FONT,
  },
  dismissBtn: {
    background: 'none', border: 'none', color: '#166534', cursor: 'pointer',
    fontSize: 16, padding: '0 4px',
  },
  loaderWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '60vh',
  },
  spinner: {
    width: 40, height: 40, border: '4px solid #ede9fe',
    borderTop: `4px solid ${PRIMARY}`, borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loaderText: { marginTop: 16, color: '#6b7280', fontSize: 15, fontFamily: FONT },
};

// Add CSS animations
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  `;
  document.head.appendChild(styleSheet);
}

export default InterviewPage;
