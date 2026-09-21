const roles = [
  { role: 'RWA Representative', benefit: 'Report issues, track progress and verify completed work from one place.' },
  { role: 'Field Contractor', benefit: 'Clear work orders, AMC rates built in, no manual rate negotiation per job.' },
  { role: 'Desk Clerk', benefit: 'Validate, triage and assign — with duplicate detection doing the first pass.' },
  { role: 'Department Head', benefit: 'One queue for escalations, SLA risk and budget approvals within authority.' },
  { role: 'Finance Clerk', benefit: 'Invoices pre-checked against approved estimates and the AMC rate card.' },
  { role: 'Township COO', benefit: 'Township-wide KPIs, expenditure and contractor performance, always current.' },
  { role: 'System Administrator', benefit: 'Users, departments, contractors, AMCs and thresholds — configured, not coded.' },
]

export default function Roles() {
  return (
    <section id="roles" className="section" style={{ background: 'var(--ink)', color: 'var(--paper-raised)', borderBottom: 'none' }}>
      <div className="wrap">
        <div className="eyebrow" style={{ color: 'var(--amber)' }}>Built for every seat at the township</div>
        <h2 style={{ fontSize: 32, marginTop: 10, color: 'var(--paper-raised)', maxWidth: 560 }}>
          Seven roles, one shared record of every ticket
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 1, marginTop: 44, background: 'rgba(255,255,255,0.12)' }}>
          {roles.map((r) => (
            <div key={r.role} style={{ background: 'var(--ink)', padding: '26px 24px' }}>
              <h3 style={{ fontSize: 16, color: 'var(--paper-raised)', fontWeight: 700 }}>{r.role}</h3>
              <p style={{ fontSize: 14, color: '#b9c2c9', marginTop: 10, lineHeight: 1.55 }}>{r.benefit}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
