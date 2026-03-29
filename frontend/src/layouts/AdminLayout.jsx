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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter Tight', var(--font), sans-serif" }}>
      {/* Admin Navbar */}
      <nav style={S.nav}>
        <div style={S.navInner}>
          <Link to="/admin" style={S.brand}>
            <span style={S.brandText}>niural</span>
            <span style={S.brandSuffix}>Admin</span>
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
              <div style={{ ...S.pill, background: 'rgba(113,77,255,0.15)', color: '#a78bfa' }}>
                <span style={S.pillDot('#714DFF')} />
                {jobStats.open} Open
              </div>
              {jobStats.paused > 0 && (
                <div style={{ ...S.pill, background: 'rgba(225,81,255,0.12)', color: '#d8a0ff' }}>
                  <span style={S.pillDot('#E151FF')} />
                  {jobStats.paused} Paused
                </div>
              )}
              {jobStats.closed > 0 && (
                <div style={{ ...S.pill, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                  <span style={S.pillDot('rgba(255,255,255,0.35)')} />
                  {jobStats.closed} Closed
                </div>
              )}
            </div>

            <Link to="/" style={S.publicLink} title="View public career page">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              Career Site
            </Link>
          </div>
        </div>

        {/* Gradient accent line at bottom of nav */}
        <div style={S.gradientAccent} />
      </nav>

      {/* Page Content */}
      <main style={{ flex: 1, background: '#f4f2ff' }}>
        <Outlet />
      </main>
    </div>
  );
}

const S = {
  nav: {
    background: '#1a1a2e',
    padding: '0 24px',
    height: 60,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 4px 20px rgba(113,77,255,0.15)',
  },
  gradientAccent: {
    height: 2,
    background: 'linear-gradient(135deg, #714DFF 0%, #E151FF 100%)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
    gap: 8,
    textDecoration: 'none',
    flexShrink: 0,
  },
  brandText: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: '-0.5px',
    background: 'linear-gradient(135deg, #714DFF 0%, #E151FF 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  brandSuffix: {
    fontSize: 14,
    fontWeight: 500,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: '0.5px',
  },
  navCenter: {
    display: 'flex',
    gap: 4,
    alignItems: 'center',
  },
  navLink: {
    color: 'rgba(255,255,255,0.55)',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    padding: '7px 16px',
    borderRadius: 9999,
    transition: 'all 0.3s ease',
  },
  navLinkActive: {
    color: '#fff',
    background: 'rgba(113,77,255,0.25)',
    boxShadow: 'inset 0 0 0 1px rgba(113,77,255,0.3)',
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
    transition: 'all 0.3s ease',
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
    padding: '6px 14px',
    borderRadius: 9999,
    border: '1px solid rgba(113,77,255,0.3)',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
};
