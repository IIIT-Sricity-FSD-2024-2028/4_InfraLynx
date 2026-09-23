import { useState } from 'react'

const WORKFLOW_STEPS = [
  {
    num: '01',
    name: 'Citizen / RWA Reporting',
    actor: 'RWA Representative',
    stage: 'Intake',
    desc: 'Complaint submitted with GPS coordinates, domain (Civil/Electrical/Water), severity, and before-repair photographs.',
    output: 'Status: REPORTED',
  },
  {
    num: '02',
    name: 'Spatial & Duplicate Check',
    actor: 'System Engine',
    stage: 'Validation',
    desc: 'TIMS clusters tickets within configurable radius of existing assets to prevent duplicate contractor dispatches.',
    output: 'Status: VALIDATED',
  },
  {
    num: '03',
    name: 'Desk Clerk Triage',
    actor: 'Desk Clerk',
    stage: 'Triage',
    desc: 'Departmental clerk verifies domain alignment, filters noise, and assigns appropriate priority SLA queue.',
    output: 'Status: TRIAGED',
  },
  {
    num: '04',
    name: 'Work Order Creation',
    actor: 'Desk Clerk',
    stage: 'Dispatch',
    desc: 'Approved issue converts into a work order dispatched to an empanelled AMC contractor with target SLA.',
    output: 'Status: WORK_ORDER_CREATED',
  },
  {
    num: '05',
    name: 'Contractor Site Inspection',
    actor: 'Field Contractor',
    stage: 'Inspection',
    desc: 'Contractor arrives on-site, inspects physical asset damage, and records required labour and materials.',
    output: 'Status: INSPECTION',
  },
  {
    num: '06',
    name: 'AMC-Based Rate Estimation',
    actor: 'Field Contractor',
    stage: 'Estimation',
    desc: 'Contractor selects predefined AMC rate items. TIMS calculates total using signed contract pricing — zero arbitrary rates allowed.',
    output: 'Status: ESTIMATE_SUBMITTED',
  },
  {
    num: '07',
    name: 'Multi-Tier Financial Approval',
    actor: 'Dept Head / Finance',
    stage: 'Approval',
    desc: 'Automated threshold routing: Auto-approved (<₹25k) or Department Head verification for larger municipal works.',
    output: 'Status: APPROVED',
  },
  {
    num: '08',
    name: 'Work Execution on Site',
    actor: 'Field Contractor',
    stage: 'Execution',
    desc: 'Contractor mobilizes crew, executes physical repair according to technical standards, and logs milestone hours.',
    output: 'Status: IN_PROGRESS',
  },
  {
    num: '09',
    name: 'Mandatory Photo Evidence',
    actor: 'Field Contractor',
    stage: 'Execution',
    desc: 'Contractor uploads geo-tagged, time-stamped after-repair photographs and marks work completed.',
    output: 'Status: COMPLETED',
  },
  {
    num: '10',
    name: 'Finance & Rate Card Audit',
    actor: 'Finance Clerk',
    stage: 'Audit',
    desc: 'Finance cross-checks invoice quantities against original approved estimate and signed AMC rate schedule.',
    output: 'Status: VARIANCE_CHECKED',
  },
  {
    num: '11',
    name: 'Payment Authorization',
    actor: 'Finance Clerk',
    stage: 'Audit',
    desc: 'Verified claim is authorized for settlement. Prepares bank release voucher against contractor account.',
    output: 'Status: PAYMENT_AUTHORIZED',
  },
  {
    num: '12',
    name: 'RWA Resident Sign-Off',
    actor: 'RWA Representative',
    stage: 'Verification',
    desc: 'Original resident / RWA representative inspects fix and approves closure or flags defects.',
    output: 'Status: PENDING_VERIFICATION',
  },
  {
    num: '13',
    name: 'Township Ticket Closure',
    actor: 'System / RWA',
    stage: 'Closure',
    desc: 'Satisfied ticket is officially closed into permanent ledger. Auto-close triggers if RWA fails to respond within 72 hours.',
    output: 'Status: CLOSED',
  },
  {
    num: '14',
    name: 'Dispute & Rework Loop',
    actor: 'Contractor & Clerk',
    stage: 'Exception',
    desc: 'If RWA disputes work quality, ticket automatically reopens into contractor queue for free contractual rectification.',
    output: 'Exception: REOPENED → REWORK',
  },
]

export default function Workflow() {
  const [activeStepIdx, setActiveStepIdx] = useState(5)
  const currentStep = WORKFLOW_STEPS[activeStepIdx]

  return (
    <section id="workflow" className="section" style={{ background: 'var(--surface)' }}>
      <div className="container">
        {/* Section Title */}
        <div style={{ textAlign: 'center', maxWidth: 740, margin: '0 auto 52px' }}>
          <div className="badge-eyebrow" style={{ marginBottom: 14 }}>
            Lifecycle & Contract Governance
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 3.8vw, 40px)', color: 'var(--text)' }}>
            The 14-Step End-to-End Workflow
          </h2>
          <p style={{ marginTop: 14, fontSize: 16, color: 'var(--text-soft)' }}>
            From the moment a resident spots an issue to the final authorized payment, TIMS enforces
            uncompromising transparency with zero arbitrary price changes.
          </p>
        </div>

        {/* Interactive Step Explorer */}
        <div
          className="panel-card"
          style={{
            padding: 28,
            background: '#ffffff',
            border: '1px solid var(--line-strong)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--primary-dark)', fontWeight: 700 }}>
                INTERACTIVE LIFECYCLE EXPLORER
              </span>
              <h3 style={{ fontSize: 20, color: 'var(--text)', marginTop: 4 }}>
                Stage {currentStep.num}: {currentStep.name}
              </h3>
            </div>
            <span
              style={{
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                background: currentStep.num === '14' ? 'var(--accent-red-bg)' : 'var(--primary-subtle)',
                color: currentStep.num === '14' ? 'var(--accent-red)' : 'var(--primary-darker)',
                border: currentStep.num === '14' ? '1px solid rgba(220, 38, 38, 0.25)' : '1px solid rgba(22, 163, 74, 0.25)',
                fontWeight: 600,
              }}
            >
              {currentStep.output}
            </span>
          </div>

          {/* Stepper Pill Scroller */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 12,
              marginBottom: 24,
            }}
          >
            {WORKFLOW_STEPS.map((step, idx) => (
              <button
                key={step.num}
                onClick={() => setActiveStepIdx(idx)}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  fontWeight: 600,
                  background: activeStepIdx === idx ? 'var(--primary-dark)' : '#ffffff',
                  color: activeStepIdx === idx ? '#ffffff' : 'var(--text-soft)',
                  border: activeStepIdx === idx ? '1px solid var(--primary-dark)' : '1px solid var(--line)',
                  boxShadow: activeStepIdx === idx ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    color: activeStepIdx === idx ? '#ffffff' : 'var(--primary-dark)',
                  }}
                >
                  {step.num}
                </span>
                <span>{step.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Step Detail */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 0.8fr',
              gap: 28,
              padding: 22,
              background: 'var(--surface)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line)',
            }}
            className="step-detail-grid"
          >
            <div>
              <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--primary-dark)', fontWeight: 700 }}>
                RESPONSIBLE ACTOR: {currentStep.actor.toUpperCase()}
              </div>
              <p style={{ marginTop: 8, fontSize: 15.5, color: 'var(--text)', lineHeight: 1.6 }}>
                {currentStep.desc}
              </p>
              {currentStep.num === '14' && (
                <div
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--accent-red-bg)',
                    border: '1px solid rgba(220, 38, 38, 0.25)',
                    fontSize: 13,
                    color: '#991b1b',
                  }}
                >
                  ⚠️ <strong>Dispute Protocol</strong>: The contractor cannot bill for reopened tickets until resident sign-off is completed with verified corrective photos.
                </div>
              )}
            </div>

            <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: 24 }}>
              <div style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 8, fontWeight: 600 }}>
                AUDIT LOG ENTRY PREVIEW
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: 'var(--primary-darker)',
                  background: '#ffffff',
                  padding: 14,
                  borderRadius: 6,
                  border: '1px solid var(--line)',
                }}
              >
                <div>[TIMESTAMP] 2026-09-21 14:32:00 IST</div>
                <div>[STAGE] {currentStep.stage}</div>
                <div>[ACTOR_ROLE] {currentStep.actor}</div>
                <div>[STATE] {currentStep.output}</div>
                <div>[HASH] 7a9e..4bc1 (Tamper-Verified)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .step-detail-grid {
            grid-template-columns: 1fr !important;
          }
          .step-detail-grid > div:last-child {
            border-left: none !important;
            padding-left: 0 !important;
            border-top: 1px solid var(--line);
            padding-top: 18px;
          }
        }
      `}</style>
    </section>
  )
}
