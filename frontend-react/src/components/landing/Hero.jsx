export default function Hero({ onOpenAuth }) {
  return (
    <section
      style={{
        position: 'relative',
        minHeight: '76vh',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid var(--line)',
        overflow: 'hidden',
        backgroundImage: `
          linear-gradient(180deg, rgba(248, 250, 248, 0.88) 0%, rgba(248, 250, 248, 0.96) 80%, var(--surface) 100%),
          url('/assets/civic_smart_township.jpg')
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="ambient-orb left" />
      <div className="ambient-orb right" />
      <div className="grid-sheen" />

      <div
        className="container"
        style={{
          paddingTop: 72,
          paddingBottom: 76,
          position: 'relative',
          zIndex: 2,
          width: '100%',
        }}
      >
        <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
          {/* Eyebrow Badges */}
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            <div className="badge-eyebrow">
              <span className="pulse-dot" />
              Citizen-First Infrastructure Portal
            </div>
            <div className="badge-eyebrow" style={{ background: '#ecfdf5', color: '#047857' }}>
              AMC-Governed Financials
            </div>
          </div>

          {/* Main Title */}
          <h1
            style={{
              fontSize: 'clamp(36px, 5.2vw, 58px)',
              lineHeight: 1.1,
              fontWeight: 800,
              color: 'var(--text)',
              letterSpacing: '-0.025em',
            }}
          >
            Every pothole, outage & leak.{' '}
            <span style={{ color: 'var(--primary-dark)' }}>One verifiable record.</span>
          </h1>

          {/* Subtitle */}
          <p
            style={{
              marginTop: 22,
              fontSize: 'clamp(16px, 2vw, 18.5px)',
              lineHeight: 1.65,
              color: 'var(--text-soft)',
              maxWidth: 680,
              margin: '22px auto 0',
            }}
          >
            TIMS connects residents, empanelled contractors, and township staff on one unified platform:
            predefined AMC rate cards prevent budget leakages, automated thresholds streamline approvals,
            and mandatory resident photo sign-offs guarantee accountability at every turn.
          </p>

          {/* CTA Actions: Only Official Sign In + Workflow */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: 14,
              marginTop: 36,
            }}
          >
            <button
              type="button"
              onClick={onOpenAuth}
              className="button button-primary"
              style={{
                padding: '14px 32px',
                fontSize: 15.5,
                fontWeight: 700,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
              </svg>
              Official Sign In
            </button>

            <a
              href="#workflow"
              className="button button-secondary"
              style={{
                padding: '14px 28px',
                fontSize: 15.5,
                fontWeight: 600,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
              </svg>
              Explore 14-Step Workflow
            </a>
          </div>

          {/* Key Platform Highlights Banner */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 18,
              marginTop: 54,
              paddingTop: 36,
              borderTop: '1px solid var(--line)',
            }}
            className="hero-highlights"
          >
            <div className="panel-card" style={{ padding: '20px 16px', textAlign: 'center', background: '#ffffff' }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800, color: 'var(--primary-dark)' }}>
                100%
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
                Predefined AMC Rates
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>
                Zero arbitrary rate inflation
              </div>
            </div>

            <div className="panel-card" style={{ padding: '20px 16px', textAlign: 'center', background: '#ffffff' }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800, color: 'var(--primary-darker)' }}>
                14 Stages
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
                Complete Lifecycle
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>
                Report to payment settlement
              </div>
            </div>

            <div className="panel-card" style={{ padding: '20px 16px', textAlign: 'center', background: '#ffffff' }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800, color: '#b45309' }}>
                7 Roles
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
                Separation of Duties
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>
                RBAC governance & audit logs
              </div>
            </div>

            <div className="panel-card" style={{ padding: '20px 16px', textAlign: 'center', background: '#ffffff' }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800, color: 'var(--primary)' }}>
                RWA Gate
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
                Resident Sign-Off
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>
                Mandatory before/after photo proof
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .hero-highlights {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 520px) {
          .hero-highlights {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}
