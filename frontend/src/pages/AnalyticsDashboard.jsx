import React, { useState, useEffect } from 'react';
import api from '../api';

const STATUS_COLORS = {
  Applied: '#6366f1',
  Screened: '#8b5cf6',
  Shortlisted: '#3b82f6',
  'In Interview': '#06b6d4',
  Offer: '#f59e0b',
  Hired: '#10b981',
  Onboarded: '#059669',
  Rejected: '#ef4444',
};

const SCORE_BUCKET_COLORS = {
  '0-30': '#ef4444',
  '31-50': '#f97316',
  '51-70': '#eab308',
  '71-100': '#22c55e',
};

const JOB_STATUS_COLORS = {
  Open: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  Paused: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  Closed: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
};

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/candidates/analytics/')
      .then((res) => { setData(res.data); setLoading(false); })
      .catch((err) => { setError('Failed to load analytics'); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.loadingWrap}>
          <div style={S.spinner} />
          <p style={{ color: '#64748b', marginTop: 16 }}>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={S.page}>
        <div style={S.emptyState}>{error}</div>
      </div>
    );
  }

  const {
    pipeline_snapshot,
    funnel,
    ai_score_distribution,
    per_role_stats,
    time_metrics,
    role_health,
  } = data;

  const maxFunnel = Math.max(...funnel.map((f) => f.count), 1);
  const maxScoreBucket = Math.max(...ai_score_distribution.map((b) => b.count), 1);
  const maxRoleCandidates = Math.max(...(per_role_stats || []).map((r) => r.total), 1);
  const stageEntries = Object.entries(time_metrics.avg_days_per_stage || {});
  const maxStageDays = Math.max(...stageEntries.map(([, d]) => d), 1);

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <h1 style={S.title}>Hiring Analytics</h1>
        <p style={S.subtitle}>Overview of your hiring pipeline performance</p>
      </div>

      <div className="analytics-grid" style={S.grid}>
        {/* Card 1 - Pipeline Snapshot */}
        <Card title="Pipeline Snapshot" subtitle="Current candidates per status" span={2}>
          {Object.values(pipeline_snapshot).every((v) => v === 0) ? (
            <Empty />
          ) : (
            <div style={S.kpiRow}>
              {Object.entries(pipeline_snapshot).map(([status, count]) => (
                <div key={status} style={{
                  ...S.kpiBox,
                  borderTop: `3px solid ${STATUS_COLORS[status] || '#94a3b8'}`,
                }}>
                  <div style={S.kpiCount}>{count}</div>
                  <div style={S.kpiLabel}>{status}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Card 2 - Hiring Funnel */}
        <Card title="Hiring Funnel" subtitle="Stage-by-stage conversion">
          {funnel.every((f) => f.count === 0) ? (
            <Empty />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {funnel.map((f, i) => (
                <div key={f.stage}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>{f.stage}</span>
                    <span style={{ fontSize: 13, color: '#64748b' }}>
                      {f.count}
                      {f.conversion !== null && (
                        <span style={{ marginLeft: 8, fontSize: 11, color: '#94a3b8' }}>
                          {f.conversion}% from prev
                        </span>
                      )}
                    </span>
                  </div>
                  <div style={S.barTrack}>
                    <div style={{
                      ...S.barFill,
                      width: `${(f.count / maxFunnel) * 100}%`,
                      background: STATUS_COLORS[f.stage] || '#94a3b8',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Card 3 - AI Score Distribution */}
        <Card title="AI Score Distribution" subtitle="Score breakdown across candidates">
          {ai_score_distribution.every((b) => b.count === 0) ? (
            <Empty msg="No scored candidates yet" />
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 180, paddingTop: 12 }}>
              {ai_score_distribution.map((b) => (
                <div key={b.bucket} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>{b.count}</span>
                  <div style={{
                    width: '100%',
                    maxWidth: 60,
                    height: `${(b.count / maxScoreBucket) * 140}px`,
                    minHeight: b.count > 0 ? 8 : 0,
                    background: SCORE_BUCKET_COLORS[b.bucket],
                    borderRadius: '6px 6px 0 0',
                    transition: 'height 0.3s',
                  }} />
                  <span style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>{b.bucket}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Card 4 - Applications Per Role */}
        <Card title="Applications Per Role" subtitle="Candidate count by job">
          {(!per_role_stats || per_role_stats.length === 0) ? (
            <Empty msg="No roles yet" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {per_role_stats.map((r) => (
                <div key={r.job_id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#334155', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                    <span style={{ fontSize: 13, color: '#64748b' }}>{r.total}</span>
                  </div>
                  <div style={S.barTrack}>
                    <div style={{
                      ...S.barFill,
                      width: `${(r.total / maxRoleCandidates) * 100}%`,
                      background: '#6366f1',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Card 5 - Average Time Per Stage */}
        <Card title="Average Time Per Stage" subtitle={time_metrics.avg_days_to_hire != null ? `Avg time to hire: ${time_metrics.avg_days_to_hire} days` : 'Time spent in each pipeline stage'}>
          {stageEntries.length === 0 ? (
            <Empty msg="No stage transition data yet" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stageEntries.map(([stage, days]) => (
                <div key={stage}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>{stage}</span>
                    <span style={{ fontSize: 13, color: '#64748b' }}>{days} days</span>
                  </div>
                  <div style={S.barTrack}>
                    <div style={{
                      ...S.barFill,
                      width: `${(days / maxStageDays) * 100}%`,
                      background: STATUS_COLORS[stage] || '#94a3b8',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Card 6 - Role Health */}
        <Card title="Role Health" subtitle="Status and metrics per open role" span={2}>
          {(!role_health || role_health.length === 0) ? (
            <Empty msg="No roles yet" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Role</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Candidates</th>
                    <th style={S.th}>Days Open</th>
                    <th style={S.th}>Avg AI Score</th>
                  </tr>
                </thead>
                <tbody>
                  {role_health.map((r) => {
                    const sc = JOB_STATUS_COLORS[r.status] || { bg: '#f1f5f9', color: '#64748b' };
                    return (
                      <tr key={r.job_id}>
                        <td style={S.td}>
                          <span style={{ fontWeight: 500, color: '#1e293b' }}>{r.title}</span>
                        </td>
                        <td style={S.td}>
                          <span style={{ ...S.badge, background: sc.bg, color: sc.color }}>{r.status}</span>
                        </td>
                        <td style={S.td}>{r.candidate_count}</td>
                        <td style={S.td}>{r.days_open}</td>
                        <td style={S.td}>{r.avg_ai_score != null ? r.avg_ai_score : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ── Reusable Card Component ──────────────────────────────────── */
function Card({ title, subtitle, children, span = 1 }) {
  return (
    <div style={{ ...S.card, gridColumn: span === 2 ? '1 / -1' : undefined }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={S.cardTitle}>{title}</h2>
        {subtitle && <p style={S.cardSubtitle}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Empty({ msg = 'No data yet' }) {
  return (
    <div style={S.emptyState}>{msg}</div>
  );
}

/* ── Styles ───────────────────────────────────────────────────── */
const S = {
  page: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '32px 24px',
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 20,
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    border: '1px solid #e2e8f0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    margin: '4px 0 0',
  },
  kpiRow: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  kpiBox: {
    flex: '1 1 100px',
    minWidth: 90,
    background: '#f8fafc',
    borderRadius: 8,
    padding: '16px 12px',
    textAlign: 'center',
  },
  kpiCount: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1e293b',
    lineHeight: 1,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: '#64748b',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  barTrack: {
    width: '100%',
    height: 8,
    background: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.4s ease',
    minWidth: 0,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '2px solid #e2e8f0',
    color: '#64748b',
    fontWeight: 600,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #f1f5f9',
    color: '#334155',
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 600,
  },
  emptyState: {
    textAlign: 'center',
    color: '#94a3b8',
    padding: '32px 0',
    fontSize: 14,
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};
