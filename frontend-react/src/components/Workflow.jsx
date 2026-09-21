const steps = [
  { t: 'Report', d: 'RWA representative submits a complaint with category, location, severity and photos.' },
  { t: 'Validate', d: 'Desk Clerk checks the complaint, confirms department and screens for duplicates.' },
  { t: 'Inspect & estimate', d: 'Contractor inspects the site and prepares an estimate using predefined AMC rates.' },
  { t: 'Approve', d: 'Estimate routes by threshold to auto-approval, Department Head, or COO joint approval.' },
  { t: 'Execute', d: 'Contractor completes the repair and uploads before/after evidence.' },
  { t: 'Verify & pay', d: 'Finance checks the invoice against AMC rates; RWA confirms the fix; ticket closes.' },
]

export default function Workflow() {
  return (
    <section id="workflow" className="section">
      <div className="wrap">
        <div className="eyebrow">End-to-end workflow</div>
        <h2 style={{ fontSize: 32, marginTop: 10, maxWidth: 560 }}>From a resident's report to an authorized payment</h2>

        <div style={{ marginTop: 48 }}>
          {steps.map((s, i) => (
            <div
              key={s.t}
              style={{
                display: 'grid',
                gridTemplateColumns: '64px 1fr',
                gap: 20,
                padding: '22px 0',
                borderTop: i === 0 ? '1px solid var(--line)' : 'none',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, color: 'var(--teal)' }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: 18, width: 200, flexShrink: 0 }}>{s.t}</h3>
                <p style={{ color: 'var(--ink-soft)', fontSize: 15, maxWidth: 480 }}>{s.d}</p>
              </div>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 20, fontSize: 13.5, color: 'var(--ink-soft)' }}>
          Disputed work reopens automatically to the contractor and repeats the completion and verification steps.
        </p>
      </div>
    </section>
  )
}
