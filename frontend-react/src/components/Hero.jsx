const chain = ['Complaint', 'Work Order', 'AMC Estimate', 'Approval', 'Execution', 'Invoice', 'Verification', 'Closure']

export default function Hero() {
  return (
    <section
      style={{
        borderBottom: '1px solid var(--line)',
        backgroundImage:
          'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        backgroundPosition: 'center top',
        backgroundColor: 'var(--paper)',
      }}
    >
      <div className="wrap" style={{ padding: '96px 32px 72px', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 48 }}>
        <div>
          <div className="eyebrow">Township infrastructure, one system of record</div>
          <h1 style={{ fontSize: 'clamp(34px, 5vw, 54px)', lineHeight: 1.08, marginTop: 14, fontWeight: 800 }}>
            Every pothole, outage and leak — tracked from report to closure.
          </h1>
          <p style={{ marginTop: 20, fontSize: 18, color: 'var(--ink-soft)', maxWidth: 480 }}>
            TIMS connects residents, contractors and township staff on one platform: AMC-based
            estimates, threshold-driven approvals, finance verification and resident sign-off —
            with a clear audit trail at every step.
          </p>
          <div style={{ display: 'flex', gap: 14, marginTop: 32 }}>
            <a href="#contact" className="btn btn-primary">Request a demo</a>
            <a href="#workflow" className="btn btn-ghost">See how it works</a>
          </div>
        </div>

        <div style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 4, padding: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Ticket #TIMS-2291 · Civil · Sector 4</div>
          {chain.map((step, i) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0' }}>
              <span
                style={{
                  width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: 11, flexShrink: 0,
                  background: i <= 4 ? 'var(--teal)' : 'transparent',
                  color: i <= 4 ? 'var(--paper-raised)' : 'var(--ink-soft)',
                  border: i <= 4 ? 'none' : '1px solid var(--line)',
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: 14.5, color: i <= 4 ? 'var(--ink)' : 'var(--ink-soft)', fontWeight: i === 4 ? 600 : 400 }}>
                {step}
              </span>
              {i === 4 && (
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber-deep)' }}>
                  in progress
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          section > .wrap { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
