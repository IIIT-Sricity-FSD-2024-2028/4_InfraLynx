export default function Features() {
  const CORE_CAPABILITIES = [
    {
      title: 'Citizen Issue Reporting & Triage',
      desc: 'Residents report civic defects with sector location and photo proof. Desk clerks triage incoming reports, detect duplicate complaints within 100 meters, and assign them directly to departmental queues.',
      points: ['Photo Evidence', '100m Duplicate Detection', 'Direct Department Triage'],
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
    },
    {
      title: 'AMC Schedule of Rates Engine',
      desc: 'Contractors inspect the site and build line-item work orders locked strictly to predefined municipal rate cards, preventing unauthorized cost inflation or budget leakages.',
      points: ['Predefined Rate Cards', 'Material & Labour Specs', 'Zero Arbitrary Markups'],
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="18" rx="2" />
          <line x1="16" y1="8" x2="8" y2="8" />
          <line x1="16" y1="12" x2="8" y2="12" />
          <line x1="10" y1="16" x2="8" y2="16" />
        </svg>
      ),
    },
    {
      title: 'Automated Financial & SLA Governance',
      desc: 'Work order estimates route automatically to Department Heads or Executive Leadership based on expenditure limits, backed by strict SLA timers and automatic escalation clocks.',
      points: ['Expenditure Thresholds', 'SLA Countdown Clocks', 'Managerial Overrides'],
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      title: 'Three-Way Verification & Audit Trail',
      desc: 'Contractors submit mandatory before-and-after photo evidence. Resident sign-off and 3-way invoice reconciliation must clear before Finance authorizes municipal payment release.',
      points: ['Before / After Photo Proof', 'Resident Sign-Off Gate', '3-Way Invoice Audit'],
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
  ]

  return (
    <section id="modules" className="section" style={{ background: 'var(--surface-muted)', padding: '72px 0' }}>
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 48px' }}>
          <div className="badge-eyebrow" style={{ marginBottom: 12 }}>
            Platform Workflow
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 3.8vw, 38px)', color: 'var(--text)' }}>
            Core Platform Capabilities
          </h2>
          <p style={{ marginTop: 12, fontSize: 16, color: 'var(--text-soft)', lineHeight: 1.6 }}>
            End-to-end infrastructure lifecycle orchestration — connecting citizens, contractors,
            and municipal staff on a transparent, single source of truth.
          </p>
        </div>

        {/* 4 Clean Capability Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24,
            maxWidth: 1040,
            margin: '0 auto',
          }}
        >
          {CORE_CAPABILITIES.map((c, idx) => (
            <div
              key={idx}
              className="panel-card"
              style={{
                padding: '28px 26px',
                background: '#ffffff',
                border: '1px solid var(--line-strong)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: 'var(--primary-subtle)',
                    color: 'var(--primary-darker)',
                    display: 'grid',
                    placeItems: 'center',
                    marginBottom: 18,
                  }}
                >
                  {c.icon}
                </div>

                <h3 style={{ fontSize: 18, color: 'var(--text)', marginBottom: 10, fontWeight: 700 }}>
                  {c.title}
                </h3>

                <p style={{ fontSize: 14, color: 'var(--text-soft)', lineHeight: 1.6, margin: 0 }}>
                  {c.desc}
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                {c.points.map((pt) => (
                  <span
                    key={pt}
                    style={{
                      fontSize: 11.5,
                      padding: '4px 10px',
                      borderRadius: 4,
                      background: 'var(--surface)',
                      color: 'var(--primary-dark)',
                      border: '1px solid var(--line)',
                      fontWeight: 600,
                    }}
                  >
                    ✓ {pt}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
