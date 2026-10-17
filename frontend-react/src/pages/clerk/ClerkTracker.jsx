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
  { id: 'PENDING_VERIFICATION', label: 'Pending Verify', desc: 'Awaiting sign-off'   },
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
 */
function formatSafeDate(dateVal) {
  if (!dateVal) return 'Recently'
  const d = new Date(dateVal)
  return isNaN(d.getTime()) ? 'Recently' : d.toLocaleString()
}

export default function ClerkTracker({ complaints: propComplaints, selectedComplaint, onNavigate, onSelectComplaint }) {
  const { complaints: contextComplaints = [], currentUser } = useTIMS()

  // Filter complaints by clerk's department
  const complaints = useMemo(() => {
    if (propComplaints) return propComplaints
    if (!currentUser || currentUser.role !== 'DESK_CLERK') return contextComplaints
    const deptId = currentUser.department_id
    const deptName = (currentUser.department_name || '').toLowerCase()
    if (!deptId && !deptName) return contextComplaints

    return contextComplaints.filter(c => {
      const cDeptId = c.department_id
      if (deptId && cDeptId && String(cDeptId) === String(deptId)) return true
      const cCat = (c.category || c.department_name || '').toLowerCase()
      if (deptName && cCat) {
        if (deptName.includes(cCat) || cCat.includes(deptName)) return true
        if (deptName.includes('electr') && cCat.includes('electr')) return true
        if (deptName.includes('water') && (cCat.includes('water') || cCat.includes('sanitat') || cCat.includes('plumb') || cCat.includes('drain'))) return true
        if (deptName.includes('civil') && (cCat.includes('civil') || cCat.includes('road'))) return true
        if (deptName.includes('horticult') && (cCat.includes('horticult') || cCat.includes('garden'))) return true
      }
      if (deptId && cDeptId) return String(cDeptId) === String(deptId)
      return false
    })
  }, [propComplaints, contextComplaints, currentUser])

  // Live-sync selected complaint
  const active = useMemo(() => {
    if (!selectedComplaint) return null
    return complaints.find(c => c.id === selectedComplaint.id) || selectedComplaint
  }, [complaints, selectedComplaint])

  // All complaints that have had work orders raised (for switcher)
  const wos = useMemo(() =>
    complaints.filter(c =>
      c.workOrderId ||
      c.work_order_code ||
      ['WORK_ORDER_CREATED','ASSIGNED','IN_PROGRESS','COMPLETED',
       'PENDING_VERIFICATION','AWAITING_DEPT_HEAD','CLOSED'].includes(c.status)
    ), [complaints])

  // Current stage index for stepper
  const stageIdx = useMemo(() => {
    if (!active) return 0
    if (active.status === 'AWAITING_DEPT_HEAD') return 3
    if (active.status === 'REJECTED')           return 1
    const i = STAGES.findIndex(s => s.id === active.status)
    return i >= 0 ? i : 0
  }, [active])


  // Status-specific info banner
  function getBanner(status) {
    const m = {
      AWAITING_DEPT_HEAD:    { cls: 'awaiting-dept',  text: 'Waiting for Dept Head approval before contractor is dispatched.' },
      ASSIGNED:              { cls: 'in-progress',    text: 'Contractor has accepted the work order.' },
      IN_PROGRESS:           { cls: 'in-progress',    text: 'Field contractor is actively working on the repair.' },
      COMPLETED:             { cls: 'completed',      text: 'Work completed. Awaiting finance invoice verification.' },
      PENDING_VERIFICATION:  { cls: 'pending-verify', text: 'Finance verified the invoice. RWA has 3 days to confirm (auto-closes after 3 days).' },
      CLOSED:                { cls: 'closed',         text: 'Complaint fully resolved and closed by RWA.' },
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
          <div className="ct-card ct-empty-card">
            <div className="ct-empty-icon">&#128196;</div>
            <div className="ct-empty-title">No work orders found</div>
            <p className="ct-empty-desc">
              Create work orders from the Dashboard after validating complaints.
            </p>
          </div>
        ) : (
          <div className="ct-picker-list">
            {wos.map(c => {
              const contractorName = c.assigned_contractor?.name || c.assigned_contractor?.company_name || 'Pending'
              const estimateVal = c.estimated_cost || 0
              return (
                <div key={c.id} className="ct-picker-row" onClick={() => onSelectComplaint(c)}>
                  <div>
                    <span className="ct-picker-id">{c.work_order_number || c.id}</span>
                    <span className="ct-picker-title">{c.title}</span>
                    <div className="ct-picker-meta">
                      {contractorName} &bull; Rs.{estimateVal.toLocaleString()} &bull; {c.status}
                    </div>
                  </div>
                  <span className="ct-picker-cta">Track &#8594;</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const banner = getBanner(active.status)
  const activeContractorName = active.assigned_contractor?.name || active.assigned_contractor?.company_name || null

  return (
    <div className="ct-root">

      {/* Top bar: WO title + switcher */}
      <div className="ct-top-bar">
        <div>
          <h1 className="ct-title">{active.work_order_number || active.id}</h1>
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
                <option key={c.id} value={c.id}>{(c.work_order_number || c.id)} — {c.title.slice(0, 24)}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Status banner */}
      {banner && (
        <div className={`ct-banner ${banner.cls}`}>
          <div className="ct-banner-text">{banner.text}</div>
        </div>
      )}

      {/* Lifecycle stepper */}
      <div className="ct-stepper-card">
        <div className="ct-stepper-hdr">
          <div>
            <div className="ct-stepper-title">TIMS Lifecycle Progress</div>
            <div className="ct-stepper-sub">Current: <strong>{active.status}</strong></div>
          </div>
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
          <p className="ct-complaint-desc">{active.description}</p>
          <div className="ct-attrs">
            <div><span className="ct-attr-label">Category</span><strong>{active.category || 'Civil'}{active.subCategory ? ` (${active.subCategory})` : ''}</strong></div>
            <div><span className="ct-attr-label">Severity</span><strong>{active.severity || 'Medium'}</strong></div>
            <div><span className="ct-attr-label">Sector / Block</span><strong>{active.location?.sector || 'Sector 54'} &bull; {active.location?.block || 'Block B'}</strong></div>
            <div><span className="ct-attr-label">Asset ID</span><strong className="ct-val-mono-sm">{active.location?.assetId || 'ASSET-GEN-01'}</strong></div>
            <div><span className="ct-attr-label">Reported By</span><strong>{active.reportedBy ? active.reportedBy.name : 'RWA'}</strong></div>
            <div><span className="ct-attr-label">Filed At</span><strong className="ct-val-sm">{formatSafeDate(active.createdAt || active.created_at)}</strong></div>
          </div>
          {active.beforePhotos && active.beforePhotos.length > 0 && (
            <div className="ct-section-spacer">
              <span className="ct-attr-label ct-attr-label-block">Site Photos</span>
              <div className="ct-photos">
                {Array.from(new Set(active.beforePhotos)).map((src, i) => (
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
            {activeContractorName || 'Pending Assignment'}
          </div>
          {activeContractorName && (
            <p className="ct-contractor-lead">
              Lead: {active.assignedContractor?.lead || active.assignedContractor?.contact_person || active.assignedContractor?.contactPerson || 'Rajesh Verma'} &bull; {active.assignedContractor?.phone || '+91 98112 45012'}
            </p>
          )}
          <div className="ct-attrs">
            <div><span className="ct-attr-label">Work Order ID</span><strong className="ct-val-mono">{active.work_order_number || 'WO-PENDING'}</strong></div>
            <div><span className="ct-attr-label">AMC Contract</span><strong className="ct-val-mono-sm">{active.assigned_contractor?.amc_contract_id || active.amc_contract_id || (activeContractorName ? 'AMC-CIV-2026' : '—')}</strong></div>
            <div><span className="ct-attr-label">Total Estimate</span><strong>Rs.{(active.estimated_cost || 0).toLocaleString()}</strong></div>
            <div><span className="ct-attr-label">Dept Head Req.</span><strong className={active.requires_dept_head ? 'ct-req-depthead-yes' : 'ct-req-depthead-no'}>{active.requires_dept_head ? 'Yes' : 'No'}</strong></div>
            <div><span className="ct-attr-label">Priority</span><strong>{active.priority || '—'}</strong></div>
            <div><span className="ct-attr-label">Inspection</span><strong>{active.inspection_notes || active.inspectionRemarks ? 'Inspected' : 'Pending'}</strong></div>
          </div>

          {/* AMC line items summary */}
          {active.line_items && active.line_items.length > 0 && (
            <div className="ct-wo-box">
              <div className="ct-wo-box-title">AMC Line Items</div>
              {active.line_items.map((item, i) => (
                <div key={i} className="ct-line-row">
                  <span>{item.description || item.service || 'Service Item'} ({item.qty} {item.unit || 'Unit'})</span>
                  <span>Rs.{(item.total || ((item.unitCost || 0) * (item.qty || 1)) || 0).toLocaleString()}</span>
                </div>
              ))}
              <div className="ct-line-row total-row">
                <span>Total</span>
                <span>Rs.{(active.estimated_cost || 0).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* After photos */}
          {active.afterPhotos && active.afterPhotos.length > 0 && (
            <div className="ct-section-spacer">
              <span className="ct-attr-label ct-attr-label-block">Completion Evidence</span>
              <div className="ct-photos">
                {active.afterPhotos.map((src, i) => (
                  <img key={i} src={src} alt={`After ${i + 1}`} className="ct-photo ct-photo-evidence" />
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
              <div className="ct-audit-body">
                <div className="ct-audit-hdr">
                  <span className="ct-audit-stage">{ev.stage}</span>
                  <strong className="ct-audit-actor">{ev.actor}</strong>
                  <span className="ct-audit-time">{formatSafeDate(ev.timestamp)}</span>
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
