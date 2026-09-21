import { useState } from 'react'

const HIERARCHY_STEPS = [
  { level: '1. Township', desc: 'Top-level operational municipal boundary' },
  { level: '2. Sector / Zone', desc: 'Geographic and demographic subdivisions' },
  { level: '3. Block / Street', desc: 'Precise micro-location mapping' },
  { level: '4. Physical Asset', desc: 'Identified road, transformer, or pipeline' },
  { level: '5. Complaint', desc: 'Citizen / RWA geo-tagged issue' },
  { level: '6. Work Order', desc: 'AMC contractor assignment & repair' },
]

const TIMS_MODULES = [
  {
    id: 1,
    title: 'User & Role-Based Access Control (RBAC)',
    category: 'governance',
    desc: 'Strict separation of powers between 7 distinct actors with granular read/write permissions and role-based views.',
    tags: ['Security', '7 Actor Roles', 'Audit Guard'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    id: 2,
    title: 'Township & Location Hierarchy',
    category: 'core',
    desc: 'Structured nesting from Township to Sector, Block, and Street for pinpoint geographic issue clustering.',
    tags: ['Geo-spatial', 'Asset Mapping', 'GIS Ready'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
  },
  {
    id: 3,
    title: 'Infrastructure & Asset Management',
    category: 'assets',
    desc: 'Cataloging of township assets across Civil, Electrical, and Water departments with complete maintenance logs.',
    tags: ['Civil', 'Electrical', 'Water Utilities'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    id: 4,
    title: 'Complaint Management & Duplicate Triage',
    category: 'operations',
    desc: 'Citizen and RWA photo complaint intake with automated proximity-based duplicate clustering to avoid redundant jobs.',
    tags: ['Duplicate Filter', 'GPS Photos', 'Triage'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 5,
    title: 'Work Order Management',
    category: 'operations',
    desc: 'Automatic conversion of validated tickets into actionable contractor work orders with SLA deadlines and priorities.',
    tags: ['SLA Timers', 'Contractor Queues', 'Milestones'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: 6,
    title: 'Contractor Management',
    category: 'contracts',
    desc: 'Empanelled contractor directory, licensing records, performance ratings, and active AMC bindings.',
    tags: ['Empanelment', 'Performance', 'Vetting'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 7,
    title: 'Annual Maintenance Contract (AMC) Management',
    category: 'contracts',
    desc: 'Centralized signed rate cards for labour, materials, and service units. Locks in pricing and preserves historical versions.',
    tags: ['Rate Cards', 'Version Lock', 'Zero Overbilling'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="6" x2="12" y2="12" />
        <line x1="12" y1="12" x2="16" y2="14" />
      </svg>
    ),
  },
  {
    id: 8,
    title: 'Approval Management & Threshold Engine',
    category: 'finance',
    desc: 'Tiered authorization: system auto-approval for minor fixes (< ₹25k) and Department Head verification for larger repairs.',
    tags: ['Auto-Approval', 'Dept Head', 'Policy Rules'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    id: 9,
    title: 'Finance & Billing Audit',
    category: 'finance',
    desc: 'Pre-payment validation comparing approved estimates, actual site quantities, and contractual AMC line items.',
    tags: ['Variance Audit', 'Rate Cards', 'Payment Gate'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    id: 10,
    title: 'RWA Verification & Dispute Rework Loop',
    category: 'operations',
    desc: 'Resident inspection sign-off. If work is unsatisfactory, ticket reopens into contractor rework cycle automatically.',
    tags: ['Resident Sign-off', 'Rework Loop', 'Closure'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M23 4v6h-6" />
        <path d="M1 20v-6h6" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    ),
  },
  {
    id: 11,
    title: 'Notifications & SLA Alerts',
    category: 'operations',
    desc: 'Real-time alert dispatching for pending approvals, SLA breach warnings, and contractor status transitions.',
    tags: ['SLA Alerts', 'Escalations', 'SMS/Push'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    id: 12,
    title: 'Analytics & Reporting Dashboards',
    category: 'governance',
    desc: 'Macro operational reports on department performance, resolution timelines, and AMC contractor efficiency.',
    tags: ['KPI Reports', 'Resolution Trends', 'SLA Stats'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: 13,
    title: 'Immutable Audit Logs',
    category: 'governance',
    desc: 'Tamper-evident record of every timestamped approval, estimate revision, file upload, and payment authorization.',
    tags: ['Zero Tampering', 'Traceability', 'Compliance'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <circle cx="10" cy="13" r="2" />
      </svg>
    ),
  },
]

export default function Features() {
  const [filter, setFilter] = useState('all')

  const filteredModules = filter === 'all' 
    ? TIMS_MODULES 
    : TIMS_MODULES.filter(m => m.category === filter)

  return (
    <section id="modules" className="section" style={{ background: 'var(--surface-muted)' }}>
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: 740, margin: '0 auto 52px' }}>
          <div className="badge-eyebrow" style={{ marginBottom: 14 }}>
            System Architecture
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 3.8vw, 40px)', color: 'var(--text)' }}>
            Township Spatial Hierarchy & 13 Core Modules
          </h2>
          <p style={{ marginTop: 14, fontSize: 16, color: 'var(--text-soft)' }}>
            TIMS connects physical township assets to contractual maintenance workflows without
            leaving room for unaccounted inventory or unverified invoices.
          </p>
        </div>

        {/* 6-Tier Location Hierarchy Card */}
        <div
          className="panel-card"
          style={{
            padding: 32,
            marginBottom: 56,
            background: '#ffffff',
            border: '1px solid var(--line-strong)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            <div>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                Operational Boundary Model
              </span>
              <h3 style={{ fontSize: 20, color: 'var(--text)', marginTop: 4 }}>
                Township Spatial Hierarchy
              </h3>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              SECTION 9 · TIMS SPECIFICATION
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 12,
            }}
          >
            {HIERARCHY_STEPS.map((h, idx) => (
              <div
                key={h.level}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderLeft: `3.5px solid ${idx % 2 === 0 ? 'var(--primary)' : 'var(--primary-darker)'}`,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  {h.level}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 4, lineHeight: 1.45 }}>
                  {h.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 36,
          }}
        >
          {[
            { id: 'all', label: 'All 13 Modules' },
            { id: 'operations', label: 'Operations & Triage' },
            { id: 'contracts', label: 'AMC & Contractors' },
            { id: 'finance', label: 'Finance & Thresholds' },
            { id: 'governance', label: 'RBAC & Audit' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '8px 18px',
                borderRadius: 'var(--radius-full)',
                fontSize: 13,
                fontWeight: 700,
                background: filter === tab.id ? 'var(--primary-dark)' : '#ffffff',
                color: filter === tab.id ? '#ffffff' : 'var(--text-soft)',
                border: filter === tab.id ? '1px solid var(--primary-dark)' : '1px solid var(--line)',
                boxShadow: filter === tab.id ? 'var(--shadow-sm)' : 'none',
                transition: 'var(--transition-fast)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 13 Modules Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 20,
          }}
        >
          {filteredModules.map((m) => (
            <div
              key={m.id}
              className="panel-card"
              style={{
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: '#ffffff',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: 'var(--primary-subtle)',
                      color: 'var(--primary-darker)',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    {m.icon}
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                    M{String(m.id).padStart(2, '0')}
                  </span>
                </div>

                <h4 style={{ fontSize: 17, color: 'var(--text)', marginBottom: 8, fontWeight: 700 }}>
                  {m.title}
                </h4>

                <p style={{ fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.55 }}>
                  {m.desc}
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                {m.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: 'var(--surface)',
                      color: 'var(--primary-dark)',
                      border: '1px solid var(--line)',
                      fontWeight: 600,
                    }}
                  >
                    {tag}
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
