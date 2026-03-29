import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

export default function CandidateLayout() {
  const location = useLocation();
  const isPortal = location.pathname.startsWith('/candidate/portal');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter Tight', sans-serif" }}>
      {/* Navbar */}
      <nav style={S.nav}>
        <div style={S.navInner}>
          <Link to="/" style={S.brand}>
            <span style={S.brandName}>niural</span>
            <span style={S.brandSuffix}>careers</span>
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
          <div style={S.footerTop}>
            <span style={S.footerBrand}>niural</span>
            <p style={S.footerTagline}>
              Global payroll & HR platform
            </p>
          </div>
          <div style={S.footerBottom}>
            <p style={S.footerText}>
              &copy; {new Date().getFullYear()} Niural Inc. All rights reserved.
            </p>
            <div style={S.footerLinks}>
              <Link to="/" style={S.footerLink}>Careers</Link>
              <span style={S.footerDot}>&middot;</span>
              <a href="mailto:hiring@niural.com" style={S.footerLink}>Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const S = {
  /* ---- Navbar ---- */
  nav: {
    background: '#ffffff',
    padding: '0 24px',
    height: 64,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    borderBottom: '1px solid #e8e8e8',
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
    alignItems: 'baseline',
    gap: 4,
    textDecoration: 'none',
  },
  brandName: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.5px',
    background: 'linear-gradient(135deg, #714DFF 0%, #E151FF 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  brandSuffix: {
    fontSize: 13,
    fontWeight: 500,
    color: '#9ca3af',
    letterSpacing: '0.02em',
  },
  navLinks: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  navLink: {
    color: '#6b7280',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    padding: '7px 16px',
    borderRadius: 9999,
    transition: 'all 300ms ease',
  },
  navLinkActive: {
    color: '#714DFF',
    background: 'rgba(113, 77, 255, 0.08)',
    fontWeight: 600,
  },

  /* ---- Footer ---- */
  footer: {
    background: '#1a1a2e',
    padding: '32px 24px 24px',
    marginTop: 'auto',
  },
  footerInner: {
    maxWidth: 1200,
    margin: '0 auto',
  },
  footerTop: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  footerBrand: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: '-0.4px',
    background: 'linear-gradient(135deg, #714DFF 0%, #E151FF 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  footerTagline: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    margin: '4px 0 0',
  },
  footerBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  footerText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    margin: 0,
  },
  footerLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  footerLink: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textDecoration: 'none',
    transition: 'color 300ms ease',
  },
  footerDot: {
    color: 'rgba(255,255,255,0.2)',
  },
};
