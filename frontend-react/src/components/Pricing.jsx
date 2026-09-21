const tiers = [
  {
    name: 'Starter',
    desc: 'One department, getting off spreadsheets.',
    features: ['Single department', 'Complaint & work order management', 'Up to 15 users', 'Email support'],
  },
  {
    name: 'Growth',
    desc: 'Multi-department townships with AMC contractors.',
    features: ['All departments', 'AMC & approval management', 'Finance & billing', 'Analytics dashboard', 'Priority support'],
    featured: true,
  },
  {
    name: 'Enterprise',
    desc: 'Full township deployment with custom needs.',
    features: ['Unlimited contractors & users', 'Custom SLA & approval rules', 'Full audit & RBAC controls', 'Dedicated onboarding'],
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="section">
      <div className="wrap">
        <div className="eyebrow">Subscription</div>
        <h2 style={{ fontSize: 32, marginTop: 10, maxWidth: 560 }}>Priced by township, not per ticket</h2>
        <p style={{ marginTop: 12, fontSize: 15, color: 'var(--ink-soft)', maxWidth: 480 }}>
          Every plan includes RBAC, audit logs and the full complaint-to-closure workflow. Final
          pricing depends on department count, contractor volume and SLA configuration.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 44 }} className="tier-grid">
          {tiers.map((t) => (
            <div
              key={t.name}
              style={{
                border: t.featured ? '1px solid var(--ink)' : '1px solid var(--line)',
                borderRadius: 4,
                padding: 28,
                background: t.featured ? 'var(--ink)' : 'var(--paper-raised)',
                color: t.featured ? 'var(--paper-raised)' : 'var(--ink)',
              }}
            >
              <h3 style={{ fontSize: 20 }}>{t.name}</h3>
              <p style={{ fontSize: 14, marginTop: 8, color: t.featured ? '#b9c2c9' : 'var(--ink-soft)' }}>{t.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {t.features.map((f) => (
                  <li key={f} style={{ fontSize: 14, display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--amber)' }}>—</span> {f}
                  </li>
                ))}
              </ul>
              <a
                href="#contact"
                className="btn"
                style={{
                  marginTop: 26, width: '100%', justifyContent: 'center',
                  background: t.featured ? 'var(--amber)' : 'var(--ink)',
                  color: t.featured ? 'var(--ink)' : 'var(--paper-raised)',
                }}
              >
                Contact for pricing
              </a>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 860px) {
          .tier-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
