export default function Pricing({ onOpenAuth }) {
  const tiers = [
    {
      name: 'Municipal Starter',
      target: 'Single department pilot or smaller township zones.',
      price: '₹24,000',
      period: '/ month',
      features: [
        'Single Department (Civil, Electrical, or Water)',
        'Complaint & Work Order Management',
        'Up to 25 Users & 5 Empanelled Contractors',
        'Predefined AMC Rate Card Lock',
        'Resident Photo Sign-off Portal',
        'Standard Municipal Support',
      ],
      featured: false,
    },
    {
      name: 'Integrated Township',
      target: 'Standard multi-sector townships with full AMC workflows.',
      price: '₹68,000',
      period: '/ month',
      features: [
        'All Departments (Civil, Electrical & Water)',
        '14-Step Complete Governance Workflow',
        'Three-Tier Financial Approval Engine',
        'Location-Based Duplicate Detection Triage',
        'Unlimited AMC Rate Cards & Historical Versions',
        'Mandatory Before/After GPS Photo Evidence Gate',
        '24/7 SLA Alert Dispatching & Escalations',
      ],
      featured: true,
    },
    {
      name: 'Metropolitan Smart City',
      target: 'Large scale municipal bodies & multi-township conglomerates.',
      price: 'Custom',
      period: 'Annual SLA',
      features: [
        'Multi-Township Federated Executive Cockpit',
        'Unlimited Contractors, Assets & User Seats',
        'Custom GIS Asset Map Integration',
        'Smart Meter & IoT Sensor Deployment Hooks',
        'Municipal ERP & Treasury Payment Gateway Integration',
        'Dedicated Technical Account Manager & On-Prem Options',
      ],
      featured: false,
    },
  ]

  return (
    <section id="pricing" className="section" style={{ background: 'var(--surface)' }}>
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: 740, margin: '0 auto 52px' }}>
          <div className="badge-eyebrow" style={{ marginBottom: 14 }}>
            Transparent Deployment
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 3.8vw, 40px)', color: 'var(--text)' }}>
            Township-Scale Pricing. Zero Per-Ticket Tolls.
          </h2>
          <p style={{ marginTop: 14, fontSize: 16, color: 'var(--text-soft)' }}>
            Every subscription includes complete RBAC security, immutable audit logs, and the 14-step
            contractual AMC governance engine.
          </p>
        </div>

        {/* Pricing Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
            alignItems: 'stretch',
          }}
          className="pricing-grid"
        >
          {tiers.map((t) => (
            <div
              key={t.name}
              className="panel-card"
              style={{
                padding: 36,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: t.featured ? '#ffffff' : 'var(--surface-contrast)',
                border: t.featured ? '2px solid var(--primary)' : '1px solid var(--line)',
                boxShadow: t.featured ? 'var(--shadow-lg)' : 'var(--shadow)',
                position: 'relative',
              }}
            >
              {t.featured && (
                <div
                  style={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--primary-dark)',
                    color: '#ffffff',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    padding: '3px 14px',
                    borderRadius: 'var(--radius-full)',
                    textTransform: 'uppercase',
                  }}
                >
                  Most Deployed
                </div>
              )}

              <div>
                <h3 style={{ fontSize: 22, color: 'var(--text)' }}>{t.name}</h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-soft)', marginTop: 6, minHeight: 40 }}>
                  {t.target}
                </p>

                <div style={{ marginTop: 20, marginBottom: 24, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span
                    style={{
                      fontSize: 36,
                      fontWeight: 800,
                      fontFamily: 'var(--font-head)',
                      color: t.featured ? 'var(--primary-dark)' : 'var(--text)',
                    }}
                  >
                    {t.price}
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{t.period}</span>
                </div>

                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 14 }}>
                    Included Capabilities:
                  </div>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {t.features.map((f) => (
                      <li key={f} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: 'var(--text)' }}>
                        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div style={{ marginTop: 32 }}>
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className={`button ${t.featured ? 'button-primary' : 'button-secondary'}`}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  Sign In to Activate {t.name} →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
