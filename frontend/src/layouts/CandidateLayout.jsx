import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

export default function CandidateLayout() {
  const location = useLocation();
  const isPortal = location.pathname.startsWith('/candidate/portal');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Candidate Navbar */}
      <nav style={S.nav}>
        <div style={S.navInner}>
          <Link to="/" style={S.brand}>
            <span style={S.brandIcon}>💼</span>
            <span style={S.brandText}>Niural Careers</span>
          </Link>
          <div style={S.navLinks}>
            <Link to="/" style={{
              ...S.navLink,
              ...(location.pathname === '/' ? S.navLinkActive : {}),
            }}>
              Open Positions
            </Link>
            {isPortal && (
              <span style={{ ...S.navLink, ...S.navLinkActive }}>
                My Application
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={S.footer}>
        <div style={S.footerInner}>
          <p style={S.footerText}>
            &copy; {new Date().getFullYear()} Niural Inc. &mdash; We&apos;re hiring! Explore open roles above.
          </p>
          <div style={S.footerLinks}>
            <Link to="/" style={S.footerLink}>Careers</Link>
            <span style={S.footerDot}>&middot;</span>
            <a href="mailto:hiring@niural.com" style={S.footerLink}>Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const S = {
  nav: {
    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
    padding: '0 24px',
    height: 60,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
  },
  navInner: {
    maxWidth: 1200,
    margin: '0 auto',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textDecoration: 'none',
    color: '#fff',
  },
  brandIcon: { fontSize: 24 },
  brandText: { fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' },
  navLinks: { display: 'flex', gap: 8, alignItems: 'center' },
  navLink: {
    color: 'rgba(255,255,255,0.7)',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    padding: '6px 14px',
    borderRadius: 6,
    transition: 'all 0.2s',
  },
  navLinkActive: {
    color: '#fff',
    background: 'rgba(255,255,255,0.12)',
  },
  footer: {
    background: '#1e1b4b',
    padding: '20px 24px',
    marginTop: 'auto',
  },
  footerInner: {
    maxWidth: 1200,
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  footerText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 },
  footerLinks: { display: 'flex', alignItems: 'center', gap: 8 },
  footerLink: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none' },
  footerDot: { color: 'rgba(255,255,255,0.3)' },
};
