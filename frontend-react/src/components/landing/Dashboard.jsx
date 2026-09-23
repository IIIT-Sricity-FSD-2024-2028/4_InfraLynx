import { useState } from 'react'

const INITIAL_MAJOR_APPROVALS = [
  {
    id: 'TIMS-2026-0811',
    sector: 'Sector 5 & 6 Arterial Junction',
    title: 'Replacement of 400kVA Burned Transformer Unit',
    contractor: 'Voltex Power Systems (AMC-2026-E02)',
    amount: '₹3,45,000',
    threshold: 'Exceeds ₹2,00,000 Major Threshold',
    deptApprovedBy: 'Dept Head (Electrical)',
    status: 'Pending COO Joint Sign-Off',
  },
  {
    id: 'TIMS-2026-0794',
    sector: 'Sector 9 Outer Ring Drain',
    title: 'Reinforced Concrete Culvert Reconstruction',
    contractor: 'Apex Civil Infra (AMC-2026-C04)',
    amount: '₹4,80,000',
    threshold: 'Exceeds ₹2,00,000 Major Threshold',
    deptApprovedBy: 'Dept Head (Civil)',
    status: 'Pending COO Joint Sign-Off',
  },
]

export default function Dashboard({ onOpenAuth }) {
  const [approvals, setApprovals] = useState(INITIAL_MAJOR_APPROVALS)

  function handleAuthorize(id) {
    setApprovals(
      approvals.map((item) =>
        item.id === id ? { ...item, status: 'Authorized by Township COO ✓' } : item
      )
    )
  }

  return (
    <section id="dashboard" className="section" style={{ background: 'var(--bg-dark)' }}>
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: 740, margin: '0 auto 56px' }}>
          <div className="badge-eyebrow badge-amber" style={{ marginBottom: 14 }}>
            Section 7 & 13 · Executive Governance
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#ffffff' }}>
            Township COO Command Center
          </h2>
          <p style={{ marginTop: 14, fontSize: 16, color: 'var(--text-secondary)' }}>
            Macro-level operational telemetry, automated expenditure threshold gates, and joint
            high-value capital authorizations for township executive leadership.
          </p>
        </div>

        {/* Executive KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 18,
            marginBottom: 40,
          }}
        >
          <div className="glass-panel" style={{ padding: 24, borderLeft: '4px solid var(--cyan-bright)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>SLA Compliance Rate</span>
              <span style={{ fontSize: 11, color: 'var(--emerald-bright)', fontFamily: 'var(--font-mono)' }}>+3.2% vs target</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-head)', color: '#ffffff', marginTop: 8 }}>
              96.4%
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Across 824 monthly civic tickets
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 24, borderLeft: '4px solid var(--emerald-bright)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Mean Time to Resolution</span>
              <span style={{ fontSize: 11, color: 'var(--emerald-bright)', fontFamily: 'var(--font-mono)' }}>-1.1 days</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-head)', color: '#ffffff', marginTop: 8 }}>
              2.1 Days
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Down from 5.8d before TIMS
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 24, borderLeft: '4px solid var(--amber-bright)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>MTD Authorized Spend</span>
              <span style={{ fontSize: 11, color: 'var(--cyan-bright)', fontFamily: 'var(--font-mono)' }}>100% AMC verified</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-head)', color: '#ffffff', marginTop: 8 }}>
              ₹42.8 Lakh
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Within quarterly allocated budget
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 24, borderLeft: '4px solid var(--violet)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Active AMC Contracts</span>
              <span style={{ fontSize: 11, color: 'var(--emerald-bright)', fontFamily: 'var(--font-mono)' }}>18 Valid</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-head)', color: '#ffffff', marginTop: 8 }}>
              24 Empanelled
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Zero off-contract vendor work
            </div>
          </div>
        </div>

        {/* 3-Tier Approval Threshold Matrix */}
        <div
          className="glass-panel"
          style={{
            padding: 32,
            marginBottom: 40,
            background: 'linear-gradient(135deg, rgba(12, 20, 36, 0.9) 0%, rgba(8, 14, 26, 0.95) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            <div>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--amber-bright)' }}>
                SECTION 13 FINANCIAL POLICY
              </span>
              <h3 style={{ fontSize: 20, color: '#ffffff', marginTop: 4 }}>
                Three-Tier Approval Authority Routing
              </h3>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Configured by Township Executive Authority
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ padding: 18, borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--emerald-bright)' }}>Tier 1: Auto-Approval</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#fff' }}>&lt; ₹25,000</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                System immediately releases work order to empanelled contractor if line items conform to AMC rate schedule.
              </p>
            </div>

            <div style={{ padding: 18, borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan-bright)' }}>Tier 2: Dept Head</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#fff' }}>₹25,000 – ₹2,00,000</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Requires Department Head (Civil, Electrical, or Water) verification of scope and quarterly fund headroom.
              </p>
            </div>

            <div style={{ padding: 18, borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber-bright)' }}>Tier 3: COO Joint Sign-Off</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#fff' }}>&gt; ₹2,00,000 Major</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Major capital expenditure requests mandate joint authorization by Department Head and Township COO.
              </p>
            </div>
          </div>
        </div>

        {/* Live Pending Major Approvals Awaiting COO */}
        <div
          className="glass-panel"
          style={{
            padding: 32,
            border: '1px solid rgba(6, 182, 212, 0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="pulse-dot" />
              <h3 style={{ fontSize: 19, color: '#ffffff' }}>
                Major Capital Requests Awaiting COO Joint Approval
              </h3>
            </div>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--amber-bright)' }}>
              {approvals.filter(a => a.status.includes('Pending')).length} ACTIONABLE
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {approvals.map((req) => {
              const isAuthorized = req.status.includes('Authorized')
              return (
                <div
                  key={req.id}
                  style={{
                    padding: '20px 24px',
                    borderRadius: 'var(--radius-sm)',
                    background: isAuthorized ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                    border: isAuthorized ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 16,
                  }}
                >
                  <div style={{ maxWidth: 540 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--cyan-bright)', fontWeight: 700 }}>
                        {req.id}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        • {req.sector}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#ffffff', marginTop: 4 }}>
                      {req.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      Contractor: {req.contractor} · Verified by {req.deptApprovedBy}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-head)', color: '#ffffff' }}>
                        {req.amount}
                      </div>
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: isAuthorized ? 'var(--emerald-bright)' : 'var(--amber-bright)' }}>
                        {req.status}
                      </div>
                    </div>

                    {!isAuthorized ? (
                      <button
                        type="button"
                        onClick={() => handleAuthorize(req.id)}
                        className="btn btn-emerald"
                        style={{ padding: '9px 16px', fontSize: 13 }}
                      >
                        Authorize Spend
                      </button>
                    ) : (
                      <span
                        style={{
                          fontSize: 13,
                          color: 'var(--emerald-bright)',
                          fontWeight: 600,
                          padding: '6px 14px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          borderRadius: 4,
                        }}
                      >
                        COO Signed ✓
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
