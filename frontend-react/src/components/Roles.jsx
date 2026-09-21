import { useState } from 'react'

const ACTORS = [
  {
    id: 'rwa',
    title: 'RWA Representative',
    type: 'External Liaison',
    summary: 'The external voice connecting township residents directly with infrastructure operations.',
    responsibilities: [
      'Report infrastructure issues with category, GPS coordinates, severity, and photo evidence.',
      'Track live ticket progress and view assigned contractor and estimated completion time.',
      'Inspect contractor resolution evidence (mandatory before/after photo documentation).',
      'Officially confirm issue resolution or trigger the dispute/rework cycle for incomplete repairs.',
    ],
    consoleAction: 'Submit Citizen Ticket',
    mockData: {
      activeTickets: 4,
      pendingSignOffs: 2,
      satisfactionRate: '98.2%',
    },
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
      'Upload mandatory geo-tagged before/after proof to mark work completed.',
      'Respond immediately to RWA disputes and perform corrective rework without extra billing.',
    ],
    consoleAction: 'Submit AMC Estimate',
    mockData: {
      activeWorkOrders: 6,
      slaCompliance: '97.5%',
      pendingPayment: '₹1,42,800',
    },
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
    consoleAction: 'Dispatch Work Order',
    mockData: {
      inboxQueue: 18,
      duplicatesMerged: 9,
      avgTriageTime: '14 mins',
    },
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
    consoleAction: 'Authorize Department Budget',
    mockData: {
      pendingApprovals: 3,
      departmentBudgetUsed: '68%',
      escalationTickets: 1,
    },
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
    consoleAction: 'Authorize Invoice Settlement',
    mockData: {
      auditedToday: 12,
      varianceDiscrepancies: 0,
      clearedSpend: '₹3,84,000',
    },
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
    consoleAction: 'Review Executive Telemetry',
    mockData: {
      townshipSla: '96.4%',
      activeAmcContracts: 24,
      quarterlySpend: '₹42.8L',
    },
  },
  {
    id: 'admin',
    title: 'System Administrator',
    type: 'System & RBAC Governance',
    summary: 'Platform administrator configuring system topology, user roles, AMC agreements, and security policies.',
    responsibilities: [
      'Manage user accounts, authentication security, and granular RBAC role policies.',
      'Configure township sectors, zones, blocks, asset categories, and location trees.',
      'Administer contractor empanelment, contract validity dates, and AMC rate cards.',
      'Set SLA escalation timelines, approval monetary thresholds, and audit review rules.',
    ],
    consoleAction: 'Configure AMC Rate Card',
    mockData: {
      activeUsers: 84,
      configuredSectors: 12,
      auditLogHealth: '100%',
    },
  },
]

export default function Roles({ onOpenAuth }) {
  const [activeActorId, setActiveActorId] = useState('rwa')
  const actor = ACTORS.find((a) => a.id === activeActorId) || ACTORS[0]

  return (
    <section id="roles" className="section" style={{ background: '#ffffff' }}>
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: 740, margin: '0 auto 52px' }}>
          <div className="badge-eyebrow" style={{ marginBottom: 14 }}>
            Role-Based Access Control (RBAC)
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 3.8vw, 40px)', color: 'var(--text)' }}>
            Built for Every Seat at the Township
          </h2>
          <p style={{ marginTop: 14, fontSize: 16, color: 'var(--text-soft)' }}>
            Seven distinct operational actors operate on a shared, tamper-evident ledger.
            Select any role to preview their authority matrix and workflow console.
          </p>
        </div>

        {/* Actor Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 14,
            marginBottom: 36,
          }}
        >
          {ACTORS.map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveActorId(a.id)}
              style={{
                flexShrink: 0,
                padding: '9px 18px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13.5,
                fontWeight: 700,
                background: activeActorId === a.id ? 'var(--primary-dark)' : 'var(--surface-muted)',
                color: activeActorId === a.id ? '#ffffff' : 'var(--text-soft)',
                border: activeActorId === a.id ? '1px solid var(--primary-dark)' : '1px solid var(--line)',
                boxShadow: activeActorId === a.id ? 'var(--shadow-sm)' : 'none',
                transition: 'var(--transition-fast)',
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
            padding: 36,
            background: 'var(--surface)',
            border: '1px solid var(--line-strong)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 0.8fr',
              gap: 40,
              alignItems: 'center',
            }}
            className="role-grid"
          >
            {/* Left: Responsibilities */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span className="badge-eyebrow">
                  {actor.type}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  SECTION 1 · TIMS ACTOR
                </span>
              </div>

              <h3 style={{ fontSize: 24, color: 'var(--text)', marginBottom: 8 }}>
                {actor.title}
              </h3>

              <p style={{ fontSize: 15, color: 'var(--text-soft)', lineHeight: 1.6, marginBottom: 20 }}>
                {actor.summary}
              </p>

              <h4 style={{ fontSize: 13, color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12, fontFamily: 'var(--font-mono)' }}>
                CORE RESPONSIBILITIES & AUTHORITY
              </h4>

              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {actor.responsibilities.map((r, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => onOpenAuth(actor.id)}
                  className="button button-primary"
                  style={{ padding: '12px 24px' }}
                >
                  Official Sign In as {actor.title.split(' ')[0]} →
                </button>
              </div>
            </div>

            {/* Right: Simulated Role Console */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid var(--line-strong)',
                borderRadius: 'var(--radius-md)',
                padding: 24,
                boxShadow: 'var(--shadow)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="pulse-dot" />
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--primary-dark)', fontWeight: 700 }}>
                    WORKSPACE TELEMETRY
                  </span>
                </div>
                <span style={{ fontSize: 11, background: 'var(--primary-subtle)', color: 'var(--primary-darker)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                  RBAC Validated
                </span>
              </div>

              {/* Metric Tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
                {Object.entries(actor.mockData).map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      padding: '10px 8px',
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: 6,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-head)', color: 'var(--text)' }}>
                      {v}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-soft)', marginTop: 2, textTransform: 'capitalize' }}>
                      {k.replace(/([A-Z])/g, ' $1')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Authorized Action */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 6,
                  background: 'var(--primary-subtle)',
                  border: '1px solid rgba(22, 163, 74, 0.25)',
                  fontSize: 13,
                  color: 'var(--primary-darker)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>Authorized Role Action:</span>
                <strong>{actor.consoleAction}</strong>
              </div>

              <div style={{ marginTop: 14, fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center' }}>
                Protected by role-based cryptographically verified access tokens.
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .role-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}
