const kpis = [
  { label: 'SLA compliance', value: '94%' },
  { label: 'Open tickets', value: '312' },
  { label: 'Avg. resolution time', value: '3.4 days' },
  { label: 'MTD expenditure', value: '₹18.6L' },
]

export default function Dashboard() {
  return (
    <section className="section">
      <div className="wrap" style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 48, alignItems: 'center' }}>
        <div>
          <div className="eyebrow">For the Township COO</div>
          <h2 style={{ fontSize: 32, marginTop: 10 }}>Township-wide visibility, not just ticket-by-ticket status</h2>
          <p style={{ marginTop: 16, fontSize: 15.5, color: 'var(--ink-soft)', maxWidth: 440 }}>
            The COO dashboard rolls up complaints, SLA compliance, resolution times, department
            performance and expenditure — and surfaces major-expenditure approvals that need
            joint sign-off.
          </p>
        </div>

        <div style={{ border: '1px solid var(--line)', borderRadius: 4, background: 'var(--paper-raised)', padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {kpis.map((k) => (
              <div key={k.label} style={{ border: '1px solid var(--line)', borderRadius: 3, padding: '16px 18px' }}>
                <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-head)' }}>{k.value}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>{k.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>2 requests awaiting COO approval</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--amber-deep)' }}>major threshold</span>
          </div>
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
