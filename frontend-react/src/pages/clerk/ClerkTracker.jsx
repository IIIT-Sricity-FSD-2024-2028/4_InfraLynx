import { useMemo } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import './styles/ClerkTracker.css'

/**
 * Full TIMS lifecycle stages used for the progress stepper.
 * Desk Clerk actions land at index 3 (WORK_ORDER_CREATED).
 */
const STAGES = [
  { id: 'REPORTED',             label: 'Reported',     desc: 'RWA filed'          },
  { id: 'UNDER_REVIEW',         label: 'Under Review', desc: 'Clerk triaging'      },
  { id: 'VALIDATED',            label: 'Validated',    desc: 'Clerk approved'      },
  { id: 'WORK_ORDER_CREATED',   label: 'WO Created',   desc: 'Clerk dispatched'    },
  { id: 'ASSIGNED',             label: 'Assigned',     desc: 'Contractor accepted' },
  { id: 'IN_PROGRESS',          label: 'In Progress',  desc: 'Work ongoing'        },
  { id: 'COMPLETED',            label: 'Completed',    desc: 'Contractor done'     },
  { id: 'PENDING_VERIFICATION', label: 'Finance OK',   desc: 'Invoice verified'    },
  { id: 'CLOSED',               label: 'Closed',       desc: 'RWA confirmed'       },
]

/**
 * ClerkTracker - Screen 4: Read-only WO status + full audit trail.
 *
 * Props:
 *   selectedComplaint            - complaint to view (null -> WO picker list)
 *   onNavigate(screen)           - navigate to another screen
 *   onSelectComplaint(complaint) - update selected complaint in portal state
 *
 * Context:
 *   complaints           - live list (synced via useMemo)
 *   currentUser          - clerk user
 *   updateComplaintStatus - used ONLY for the [Demo] Advance Stage button
 */
export default function ClerkTracker({ selectedComplaint, onNavigate, onSelectComplaint }) {
  const { complaints, currentUser, updateComplaintStatus } = useTIMS()

  // Live-sync selected complaint
  const active = useMemo(() => {
    if (!selectedComplaint) return null
    return complaints.find(c => c.id === selectedComplaint.id) || selectedComplaint
  }, [complaints, selectedComplaint])

  // All complaints that have had work orders raised (for switcher)
  const wos = useMemo(() =>
    complaints.filter(c =>
      c.workOrderId ||
      ['WORK_ORDER_CREATED','ASSIGNED','IN_PROGRESS','COMPLETED',
       'PENDING_VERIFICATION','AWAITING_DEPT_HEAD','CLOSED','DISPUTED'].includes(c.status)
    ), [complaints])

  // Current stage index for stepper
  const stageIdx = useMemo(() => {
    if (!active) return 0
    if (active.status === 'DISPUTED')           return 8
    if (active.status === 'AWAITING_DEPT_HEAD') return 3
    if (active.status === 'REJECTED')           return 1
    const i = STAGES.findIndex(s => s.id === active.status)
    return i >= 0 ? i : 0
  }, [active])

  /**
   * handleDemoAdvance - advance to next lifecycle stage for demo/testing.
   * In production each stage is triggered by the relevant actor (contractor, finance, RWA).
   */
  function handleDemoAdvance() {
    if (!active || stageIdx >= STAGES.length - 1) return
    const next = STAGES[stageIdx + 1]
    if (next && next.id !== active.status) {
      updateComplaintStatus(
        active.id, next.id,
        `[Demo] Stage advanced by Desk Clerk (${currentUser.name}) for testing.`
      )
    }
  }

  // Status-specific info banner
  function getBanner(status) {
    const m = {
      AWAITING_DEPT_HEAD:    { cls: 'awaiting-dept',  text: 'Waiting for Dept Head approval before contractor is dispatched.' },
      ASSIGNED:              { cls: 'in-progress',    text: 'Contractor has accepted the work order.' },
      IN_PROGRESS:           { cls: 'in-progress',    text: 'Field contractor is actively working on the repair.' },
      COMPLETED:             { cls: 'completed',      text: 'Work completed. Awaiting finance invoice verification.' },
      PENDING_VERIFICATION:  { cls: 'pending-verify', text: 'Finance verified the invoice. RWA has 3 days to confirm (auto-closes after 3 days).' },
      CLOSED:                { cls: 'closed',         text: 'Complaint fully resolved and closed by RWA.' },
      DISPUTED:              { cls: 'disputed',       text: 'RWA disputed repair quality. Contractor must rework.' },
    }
    return m[status] || null
  }

  // ── Empty state: no complaint selected ───────────────────────────────────
  if (!active) {
    return (
      <div className="ct-root">
        <div className="ct-top-bar">
          <div>
            <h1 className="ct-title">WO Tracker</h1>
            <p className="ct-subtitle">{wos.length > 0 ? 'Select a work order to track its progress.' : 'No work orders raised yet.'}</p>
          </div>
        </div>
        {wos.length === 0 ? (
          <div className="ct-card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>&#128196;</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>No work orders found</div>
            <p style={{ color: 'var(--text-soft)', marginTop: 4, fontSize: 13 }}>
              Create work orders from the Dashboard after validating complaints.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {wos.map(c => (
              <div key={c.id} className="ct-picker-row" onClick={() => onSelectComplaint(c)}>
                <div>
                  <span className="ct-picker-id">{c.workOrderId || c.id}</span>
                  <span className="ct-picker-title">{c.title}</span>
                  <div className="ct-picker-meta">
                    {c.assignedContractor ? c.assignedContractor.name : 'Pending'} &bull; Rs.{(c.estimateAmount || 0).toLocaleString()} &bull; {c.status}
                  </div>
                </div>
                <span className="ct-picker-cta">Track &#8594;</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const banner = getBanner(active.status)

  return (
    <div className="ct-root">

      {/* Top bar: WO title + switcher */}
      <div className="ct-top-bar">
        <div>
          <h1 className="ct-title">{active.workOrderId || active.id}</h1>
          <p className="ct-subtitle">{active.title}</p>
        </div>
        {wos.length > 1 && (
          <div className="ct-switcher-wrap">
            <span className="ct-switcher-label">Switch WO:</span>
            <select
              className="ct-switcher"
              value={active.id}
              onChange={e => { const c = complaints.find(x => x.id === e.target.value); if (c) onSelectComplaint(c) }}
            >
              {wos.map(c => (
                <option key={c.id} value={c.id}>{(c.workOrderId || c.id)} — {c.title.slice(0, 24)}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Status banner */}
      {banner && (
        <div className={`ct-banner ${banner.cls}`}>
          <div className="ct-banner-text">{banner.text}</div>
          {active.status !== 'CLOSED' && active.status !== 'DISPUTED' && (
            <button className="ct-demo-btn" onClick={handleDemoAdvance}>
              [Demo] Advance Stage &#8594;
            </button>
          )}
        </div>
      )}

      {/* Lifecycle stepper */}
      <div className="ct-stepper-card">
        <div className="ct-stepper-hdr">
          <div>
            <div className="ct-stepper-title">TIMS Lifecycle Progress</div>
            <div className="ct-stepper-sub">Current: <strong>{active.status}</strong></div>
          </div>
          {active.status !== 'CLOSED' && (
            <button className="ct-demo-btn" onClick={handleDemoAdvance}>[Demo] Advance Stage</button>
          )}
        </div>
        <div className="ct-stepper-scroll">
          <div className="ct-stepper-track">
            {STAGES.map((stage, idx) => {
              const isPast    = idx < stageIdx
              const isCurrent = idx === stageIdx
              return (
                <div key={stage.id} className="ct-node-wrap">
                  {idx < STAGES.length - 1 && (
                    <div className={`ct-line${isPast ? ' done' : isCurrent ? ' active' : ''}`} />
                  )}
                  <div className={`ct-node${isPast ? ' done' : isCurrent ? ' active' : ''}`}>
                    {isPast ? '✓' : idx + 1}
                  </div>
                  <div className={`ct-node-label${isCurrent ? ' active' : isPast ? ' done' : ''}`}>{stage.label}</div>
                  <div className="ct-node-desc">{stage.desc}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="ct-details-grid">

        {/* Complaint details */}
        <div className="ct-card">
          <div className="ct-card-tag">Complaint Details</div>
          <div className="ct-card-heading">{active.title}</div>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 4, marginBottom: 12 }}>{active.description}</p>
          <div className="ct-attrs">
            <div><span className="ct-attr-label">Category</span><strong>{active.category} ({active.subCategory})</strong></div>
            <div><span className="ct-attr-label">Severity</span><strong>{active.severity}</strong></div>
            <div><span className="ct-attr-label">Sector / Block</span><strong>{active.location.sector} &bull; {active.location.block}</strong></div>
            <div><span className="ct-attr-label">Asset ID</span><strong style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{active.location.assetId}</strong></div>
            <div><span className="ct-attr-label">Reported By</span><strong>{active.reportedBy ? active.reportedBy.name : 'RWA'}</strong></div>
            <div><span className="ct-attr-label">Filed At</span><strong style={{ fontSize: 12 }}>{new Date(active.createdAt).toLocaleString()}</strong></div>
          </div>
          {active.beforePhotos && active.beforePhotos.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <span className="ct-attr-label" style={{ display: 'block', marginBottom: 6 }}>Site Photos</span>
              <div className="ct-photos">
                {active.beforePhotos.map((src, i) => (
                  <img key={i} src={src} alt={`Before ${i + 1}`} className="ct-photo" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Work order details */}
        <div className="ct-card">
          <div className="ct-card-tag">Work Order &amp; Contractor</div>
          <div className="ct-card-heading">
            {active.assignedContractor ? active.assignedContractor.name : 'Pending Assignment'}
          </div>
          {active.assignedContractor && (
            <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginTop: 4, marginBottom: 12 }}>
              Lead: {active.assignedContractor.lead} &bull; {active.assignedContractor.phone}
            </p>
          )}
          <div className="ct-attrs">
            <div><span className="ct-attr-label">Work Order ID</span><strong style={{ fontFamily: 'var(--font-mono)' }}>{active.workOrderId || 'WO-PENDING'}</strong></div>
            <div><span className="ct-attr-label">AMC Contract</span><strong style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{active.assignedContractor?.amcContractId || '—'}</strong></div>
            <div><span className="ct-attr-label">Total Estimate</span><strong>Rs.{(active.estimateAmount || 0).toLocaleString()}</strong></div>
            <div><span className="ct-attr-label">Dept Head Req.</span><strong style={{ color: active.requiresDeptHead ? '#c2410c' : '#166534' }}>{active.requiresDeptHead ? 'Yes' : 'No'}</strong></div>
            <div><span className="ct-attr-label">Priority</span><strong>{active.priority || '—'}</strong></div>
            <div><span className="ct-attr-label">Inspection</span><strong>{active.inspectionRemarks ? 'Inspected' : 'Pending'}</strong></div>
          </div>

          {/* AMC line items summary */}
          {active.lineItems && active.lineItems.length > 0 && (
            <div className="ct-wo-box">
              <div className="ct-wo-box-title">AMC Line Items</div>
              {active.lineItems.map((item, i) => (
                <div key={i} className="ct-line-row">
                  <span>{item.description} ({item.qty} {item.unit})</span>
                  <span>Rs.{(item.total || 0).toLocaleString()}</span>
                </div>
              ))}
              <div className="ct-line-row total-row">
                <span>Total</span>
                <span>Rs.{(active.estimateAmount || 0).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* After photos */}
          {active.afterPhotos && active.afterPhotos.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <span className="ct-attr-label" style={{ display: 'block', marginBottom: 6 }}>Completion Evidence</span>
              <div className="ct-photos">
                {active.afterPhotos.map((src, i) => (
                  <img key={i} src={src} alt={`After ${i + 1}`} className="ct-photo" style={{ borderColor: '#86efac' }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Audit log */}
      <div className="ct-audit-card">
        <h3 className="ct-audit-title">TIMS Audit Trail &amp; Event Log</h3>
        <div className="ct-audit-list">
          {(active.history || []).map((ev, idx) => (
            <div key={idx} className="ct-audit-item">
              <div className="ct-audit-dot" />
              <div style={{ flex: 1 }}>
                <div className="ct-audit-hdr">
                  <span className="ct-audit-stage">{ev.stage}</span>
                  <strong style={{ fontSize: 13 }}>{ev.actor}</strong>
                  <span className="ct-audit-time">{new Date(ev.timestamp).toLocaleString()}</span>
                </div>
                <div className="ct-audit-note">{ev.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
