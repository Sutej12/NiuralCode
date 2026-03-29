import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import api from '../api';

export default function AdminLayout() {
  const location = useLocation();
  const [jobStats, setJobStats] = useState({ open: 0, paused: 0, closed: 0 });

  useEffect(() => {
    api.get('/jobs/?all=true').then((res) => {
      const jobs = res.data.results || res.data || [];
      setJobStats({
        open: jobs.filter((j) => j.status === 'Open').length,
        paused: jobs.filter((j) => j.status === 'Paused').length,
        closed: jobs.filter((j) => j.status === 'Closed').length,
      });
    }).catch(() => {});
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Admin Navbar */}
      <nav style={S.nav}>
        <div style={S.navInner}>
          <Link to="/admin" style={S.brand}>
            <span style={S.brandIcon}>⚡</span>
            <span style={S.brandText}>Niural Admin</span>
          </Link>

          <div style={S.navCenter}>
            <Link to="/admin" style={{
              ...S.navLink,
              ...(isActive('/admin') ? S.navLinkActive : {}),
            }}>
              Dashboard
            </Link>
            <Link to="/admin/analytics" style={{
              ...S.navLink,
              ...(isActive('/admin/analytics') ? S.navLinkActive : {}),
            }}>
              Analytics
            </Link>
          </div>

          <div style={S.navRight}>
            {/* Role Stats Pills */}
            <div style={S.statsPills}>
              <div style={{ ...S.pill, background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                <span style={S.pillDot('#10b981')} />
                {jobStats.open} Open
              </div>
              {jobStats.paused > 0 && (
                <div style={{ ...S.pill, background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>
                  <span style={S.pillDot('#f59e0b')} />
                  {jobStats.paused} Paused
                </div>
              )}
              {jobStats.closed > 0 && (
                <div style={{ ...S.pill, background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                  <span style={S.pillDot('#ef4444')} />
                  {jobStats.closed} Closed
                </div>
              )}
            </div>

            <Link to="/" style={S.publicLink} title="View public career page">
              🌐 Career Site
            </Link>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main style={{ flex: 1, background: '#f8fafc' }}>
        <Outlet />
      </main>
    </div>
  );
}

const S = {
  nav: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    padding: '0 24px',
    height: 60,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
  },
  navInner: {
    maxWidth: 1400,
    margin: '0 auto',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textDecoration: 'none',
    color: '#fff',
    flexShrink: 0,
  },
  brandIcon: { fontSize: 22 },
  brandText: { fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' },
  navCenter: { display: 'flex', gap: 4, alignItems: 'center' },
  navLink: {
    color: 'rgba(255,255,255,0.6)',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    padding: '6px 14px',
    borderRadius: 6,
    transition: 'all 0.2s',
  },
  navLinkActive: {
    color: '#fff',
    background: 'rgba(255,255,255,0.1)',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexShrink: 0,
  },
  statsPills: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  pill: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 600,
  },
  pillDot: (color) => ({
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: color,
    display: 'inline-block',
    flexShrink: 0,
  }),
  publicLink: {
    color: 'rgba(255,255,255,0.5)',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 500,
    padding: '5px 12px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.15)',
    transition: 'all 0.2s',
  },
};
