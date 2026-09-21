const modules = [
  { title: 'Complaint Management', desc: 'Residents report issues with category, location, severity and photos. Duplicate detection groups nearby reports automatically.' },
  { title: 'Work Order Management', desc: 'Validated complaints become work orders, assigned to empanelled AMC contractors with SLA and priority tracking.' },
  { title: 'AMC Management', desc: 'Contractor rate cards, contract terms and historical versions — so old work orders always reference the rates that applied at the time.' },
  { title: 'Approval Management', desc: 'Estimates route automatically by threshold: auto-approval, Department Head, or joint Department Head + COO sign-off.' },
  { title: 'Finance & Billing', desc: 'Invoices are checked against approved estimates, actual quantities and the applicable AMC rate card before payment is authorized.' },
  { title: 'RWA Verification', desc: 'Residents confirm or dispute completed work, with an auto-close window and a built-in rework loop for reopened tickets.' },
  { title: 'Analytics & Dashboards', desc: 'Township-wide KPIs on SLA compliance, resolution time, expenditure and contractor performance.' },
  { title: 'RBAC & Audit Logs', desc: 'Every status change, approval and configuration change is attributable and reviewable.' },
]

export default function Features() {
  return (
    <section id="modules" className="section">
      <div className="wrap">
        <h2 style={{ fontSize: 32, maxWidth: 560 }}>One platform, thirteen modules, no spreadsheets in between</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0', marginTop: 48, border: '1px solid var(--line)', borderRadius: 4, overflow: 'hidden' }} className="mod-grid">
          {modules.map((m, i) => (
            <div
              key={m.title}
              style={{
                padding: 28,
                borderRight: (i + 1) % 4 !== 0 ? '1px solid var(--line)' : 'none',
                borderBottom: i < 4 ? '1px solid var(--line)' : 'none',
                background: 'var(--paper-raised)',
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--teal-deep)' }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <h3 style={{ fontSize: 16.5, marginTop: 10, fontWeight: 700 }}>{m.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginTop: 8, lineHeight: 1.55 }}>{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .mod-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .mod-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
