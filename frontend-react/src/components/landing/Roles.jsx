import { useState } from 'react'

const ACTORS = [
  {
    id: 'rwa',
    title: 'RWA Representative',
    type: 'External Liaison',
    summary: 'The external voice connecting township residents directly with infrastructure operations.',
    responsibilities: [
      'Report infrastructure issues with category, sector/location, severity, and photo evidence.',
      'Track live ticket progress and view assigned contractor and estimated completion time.',
      'Inspect contractor resolution evidence (mandatory before/after photo documentation).',
      'Officially confirm issue resolution and star rating to authorize payment release.',
    ],
  },
  {
    id: 'contractor',
    title: 'Field Contractor',
    type: 'External AMC Partner',
    summary: 'Empanelled contractor executing ground-level repairs strictly under contractual AMC rate terms.',
    responsibilities: [
      'Receive dispatched work orders with SLA deadlines and severity level.',
      'Perform technical site inspections and log actual labour and material needs.',
      'Prepare AMC-based estimates using fixed rate cards — no arbitrary markups.',
      'Upload mandatory before/after photo proof to mark work completed.',
      'Deliver high-quality execution meeting municipal standards under AMC warranty.',
    ],
  },
  {
    id: 'clerk',
    title: 'Desk Clerk',
    type: 'Internal Operations',
    summary: 'Operational gatekeeper responsible for complaint validation, duplicate triage, and contractor dispatch.',
    responsibilities: [
      'Validate incoming citizen reports, verify photos, and confirm departmental domain.',
      'Use location-based duplicate detection to associate nearby reports with master tickets.',
      'Convert validated issues into work orders and assign to empanelled AMC contractors.',
      'Monitor queues and escalate SLA breaches and contractor delays to Department Heads.',
    ],
  },
  {
    id: 'dept_head',
    title: 'Department Head',
    type: 'Internal Management',
    summary: 'Senior managerial layer governing Civil, Electrical, or Water departments and approving budgets.',
    responsibilities: [
      'Supervise department operations, open work orders, and contractor performance.',
      'Resolve field exceptions, technical variances, and critical SLA breaches.',
      'Approve work order estimates that fall within configured departmental budget authority.',
      'Monitor quarterly fund headroom and contractor SLA fulfillment.',
    ],
  },
  {
    id: 'finance',
    title: 'Finance Clerk',
    type: 'Internal Audit',
    summary: 'Financial safeguard ensuring all contractor invoices match signed AMC rate agreements and approved estimates.',
    responsibilities: [
      'Audit contractor invoices against approved estimates and actual site quantities.',
      'Verify line-item rates against the applicable AMC contractual rate schedule.',
      'Flag unauthorized variations and cost discrepancies for managerial investigation.',
      'Authorize verified invoices for final municipal payment processing.',
    ],
  },
  {
    id: 'coo',
    title: 'Township COO',
    type: 'Executive Leadership',
    summary: 'Top operational executive focused on macro township performance and strategic governance.',
    responsibilities: [
      'Review township-wide dashboards covering total volume, SLA rates, and expenditure.',
      'Approve high-value capital requests that exceed major expenditure thresholds.',
      'Monitor cross-departmental contractor performance using aggregated operational data.',
      'Strategic oversight of long-term civic resource planning.',
    ],
  },
]

export default function Roles() {
  const [activeActorId, setActiveActorId] = useState('rwa')
  const actor = ACTORS.find((a) => a.id === activeActorId) || ACTORS[0]

  return (
    <section id="roles" className="section" style={{ background: '#ffffff' }}>
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: 740, margin: '0 auto 48px' }}>
          <div className="badge-eyebrow" style={{ marginBottom: 14 }}>
            Role-Based Access Control (RBAC)
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 3.8vw, 40px)', color: 'var(--text)' }}>
            Built for Every Seat at the Township
          </h2>
          <p style={{ marginTop: 14, fontSize: 16, color: 'var(--text-soft)' }}>
            Seven distinct platform actors operate on a shared, tamper-evident ledger.
            Select any role to view their operational responsibilities and authority matrix.
          </p>
        </div>

        {/* Centered Content Wrapper (aligns tabs and panel card) */}
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {/* Actor Tabs */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: 28,
            }}
          >
            {ACTORS.map((a) => (
              <button
                key={a.id}
                onClick={() => setActiveActorId(a.id)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13.5,
                  fontWeight: 700,
                  background: activeActorId === a.id ? 'var(--primary-dark)' : 'var(--surface-muted)',
                  color: activeActorId === a.id ? '#ffffff' : 'var(--text-soft)',
                  border: activeActorId === a.id ? '1px solid var(--primary-dark)' : '1px solid var(--line)',
                  boxShadow: activeActorId === a.id ? 'var(--shadow-sm)' : 'none',
                  transition: 'var(--transition-fast)',
                  cursor: 'pointer',
                }}
              >
                {a.title}
              </button>
            ))}
          </div>

          {/* Actor Detail Panel */}
          <div
            className="panel-card"
            style={{
              padding: '36px 40px',
              background: 'var(--surface)',
              border: '1px solid var(--line-strong)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span className="badge-eyebrow">
                  {actor.type}
                </span>
              </div>

              <h3 style={{ fontSize: 24, color: 'var(--text)', marginBottom: 8 }}>
                {actor.title}
              </h3>

              <p style={{ fontSize: 15, color: 'var(--text-soft)', lineHeight: 1.6, marginBottom: 24 }}>
                {actor.summary}
              </p>

              <h4 style={{ fontSize: 13, color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 14, fontFamily: 'var(--font-mono)' }}>
                CORE RESPONSIBILITIES & AUTHORITY
              </h4>

              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, padding: 0, margin: 0 }}>
                {actor.responsibilities.map((r, i) => (
                  <li key={i} style={{ display: 'flex', gap: 12, fontSize: 14.5, color: 'var(--text)', lineHeight: 1.55 }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
