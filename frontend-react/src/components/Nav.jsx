import { useState } from 'react'

export default function Nav({ onOpenAuth }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        borderBottom: '1px solid var(--line)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 74,
        }}
      >
        {/* Brand */}
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src="/assets/CRIMS_logo.png"
            alt="TIMS logo"
            style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'contain' }}
          />
          <div>
            <span
              style={{
                fontFamily: 'var(--font-head)',
                fontWeight: 800,
                fontSize: 22,
                letterSpacing: '-0.02em',
                color: 'var(--text)',
                display: 'block',
              }}
            >
              TIMS
            </span>
            <div style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: -2 }}>
              Township Infrastructure Management System
            </div>
          </div>
        </a>

        {/* Live Active Pill (Desktop) */}
        <div
          className="hide-mobile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 14px',
            background: 'var(--surface-muted)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--line)',
            fontSize: 12,
            color: 'var(--text-soft)',
          }}
        >
          <span className="pulse-dot" />
          <span>Core Telemetry: <strong style={{ color: 'var(--primary-dark)' }}>99.98% Active</strong></span>
        </div>

        {/* Desktop Navigation Links */}
        <nav
          className="hide-mobile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 22,
            fontSize: 14.5,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <a href="#workflow" className="nav-link">14-Step Workflow</a>
          <a href="#roles" className="nav-link">7 Actor Roles</a>
          <a href="#modules" className="nav-link">Modules</a>
          <a href="#pricing" className="nav-link">Subscription</a>
          <a href="#contact" className="nav-link">Contact</a>
        </nav>

        {/* Single Sign In Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button
            type="button"
            onClick={onOpenAuth}
            className="button button-primary"
            style={{
              fontSize: 14,
              padding: '10px 20px',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
            </svg>
            Official Sign In
          </button>

          {/* Mobile menu toggle */}
          <button
            className="show-mobile"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              border: '1px solid var(--line-strong)',
              color: 'var(--text)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          style={{
            background: '#ffffff',
            borderBottom: '1px solid var(--line)',
            padding: '18px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            fontWeight: 600,
          }}
        >
          <a href="#workflow" onClick={() => setMobileMenuOpen(false)}>14-Step Workflow</a>
          <a href="#roles" onClick={() => setMobileMenuOpen(false)}>7 Actor Roles</a>
          <a href="#modules" onClick={() => setMobileMenuOpen(false)}>Modules</a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Subscription</a>
          <a href="#contact" onClick={() => setMobileMenuOpen(false)}>Contact</a>
          <button
            onClick={() => { setMobileMenuOpen(false); onOpenAuth(); }}
            className="button button-primary"
            style={{ width: '100%', marginTop: 8 }}
          >
            Official Sign In
          </button>
        </div>
      )}

      <style>{`
        .nav-link {
          color: var(--text-soft);
          transition: color 0.18s ease;
          white-space: nowrap;
        }
        .nav-link:hover {
          color: var(--primary-darker);
        }
        @media (max-width: 1040px) {
          .hide-mobile { display: none !important; }
          .show-mobile { display: grid !important; }
        }
        @media (min-width: 1041px) {
          .show-mobile { display: none !important; }
        }
      `}</style>
    </header>
  )
}
