/**
 * ClerkTracker - Screen 4: Work Order Lifecycle Tracking & Detailed Inspection
 *
 * Features:
 * - Complete 9-stage visual progress stepper tracking complaints from REPORTED to CLOSED.
 * - Real-time status banners with SLA and operational alerts.
 * - Two-column inspection grid:
 *   1. Civic Complaint Information (Category, severity, asset ID, location, citizen reporter)
 *   2. Work Order & AMC Details (Work Order ID, contractor, rate card estimate, Dept Head requirements)
 * - Work order picker for quick switching between active tickets.
 *
 * Key React Concepts:
 * - useMemo for Stepper Calculation: Resolves active stage index based on complaint lifecycle status.
 * - Conditional Rendering: Displays work order picker when no ticket is active, or full tracking detail view.
 * - Props & Context Synchronization: Keeps local ticket view aligned with global TIMS context.
 */
import { useMemo } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import { isComplaintInClerkDepartment } from './ClerkPortal.jsx'
import './styles/ClerkTracker.css'

const STAGES = [
  { id: 'REPORTED',             label: 'Reported',      desc: 'RWA filed'          },
  { id: 'UNDER_REVIEW',         label: 'Under Review',  desc: 'Clerk triaging'      },
  { id: 'VALIDATED',            label: 'Validated',     desc: 'Clerk approved'      },
  { id: 'WORK_ORDER_CREATED',   label: 'WO Created',    desc: 'Clerk dispatched'    },
  { id: 'ASSIGNED',             label: 'Assigned',      desc: 'Contractor accepted' },
  { id: 'IN_PROGRESS',          label: 'In Progress',   desc: 'Work ongoing'        },
  { id: 'COMPLETED',            label: 'Completed',     desc: 'Contractor done'     },
  { id: 'PENDING_VERIFICATION', label: 'Pending Verify', desc: 'Awaiting sign-off'   },
  { id: 'CLOSED',               label: 'Closed',        desc: 'RWA confirmed'       },
]

const BANNERS = {
  AWAITING_DEPT_HEAD:   { cls: 'awaiting-dept',  text: 'Waiting for Dept Head approval before contractor is dispatched.' },
  ASSIGNED:             { cls: 'in-progress',    text: 'Contractor has accepted the work order.' },
  IN_PROGRESS:          { cls: 'in-progress',    text: 'Field contractor is actively working on the repair.' },
  COMPLETED:            { cls: 'completed',      text: 'Work completed. Awaiting finance invoice verification.' },
  PENDING_VERIFICATION: { cls: 'pending-verify', text: 'Finance verified the invoice. RWA has 3 days to confirm (auto-closes after 3 days).' },
  CLOSED:               { cls: 'closed',         text: 'Complaint fully resolved and closed by RWA.' },
}

function formatSafeDate(dateVal) {
  if (!dateVal) return 'Recently'
  const d = new Date(dateVal)
  return isNaN(d.getTime()) ? 'Recently' : d.toLocaleString()
}

export default function ClerkTracker({ 
  // --- Props Received from Parent (ClerkPortal) ---
  complaints: propComplaints, // Complaints queue from ClerkPortal
  selectedComplaint,          // Currently active complaint selected for lifecycle inspection
  onNavigate,                 // Callback to switch between portal tabs ('dashboard', 'triage', 'workorder')
  onSelectComplaint,          // Callback to update selected complaint in parent state
}) {
  // --- 1. Global Context Consumption (TIMSContext) ---
  // Retrieves logged-in Clerk profile (currentUser) and fallback global complaints
  const { complaints: contextComplaints = [], currentUser } = useTIMS()

  const complaints = useMemo(() => {
    if (propComplaints) return propComplaints
    return contextComplaints.filter(c => isComplaintInClerkDepartment(c, currentUser))
  }, [propComplaints, contextComplaints, currentUser])

  const active = useMemo(() => {
    if (!selectedComplaint) return null
    return complaints.find(c => c.id === selectedComplaint.id) || selectedComplaint
  }, [complaints, selectedComplaint])

  const wos = useMemo(() => complaints.filter(c =>
    c.workOrderId || c.work_order_code ||
    ['WORK_ORDER_CREATED','ASSIGNED','IN_PROGRESS','COMPLETED','PENDING_VERIFICATION','AWAITING_DEPT_HEAD','CLOSED'].includes(c.status)
  ), [complaints])

    // --- 1. Stepper Stage Resolution (Memoized) ---
  // Maps complaint status to the corresponding step index in the 9-stage stepper
  const stageIdx = useMemo(() => {
    if (!active) return 0
    if (active.status === 'AWAITING_DEPT_HEAD') return 3
    if (active.status === 'REJECTED') return 1
    const idx = STAGES.findIndex(s => s.id === active.status)
    return idx >= 0 ? idx : 0
  }, [active])

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
            <p className="ct-empty-desc">Create work orders from the Dashboard after validating complaints.</p>
          </div>
        ) : (
          <div className="ct-picker-list">
            {wos.map(c => {
              const name = c.assigned_contractor?.name || c.assigned_contractor?.company_name || 'Pending'
              return (
                <div key={c.id} className="ct-picker-row" onClick={() => onSelectComplaint(c)}>
                  <div>
                    <span className="ct-picker-id">{c.work_order_number || c.id}</span>
                    <span className="ct-picker-title">{c.title}</span>
                    <div className="ct-picker-meta">{name} &bull; Rs.{(c.estimated_cost || 0).toLocaleString()} &bull; {c.status}</div>
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

  const banner = BANNERS[active.status]
  const activeContractorName = active.assigned_contractor?.name || active.assigned_contractor?.company_name || null

  const complaintAttrs = [
    { label: 'Category', val: `${active.category || 'Civil'}${active.subCategory ? ` (${active.subCategory})` : ''}` },
    { label: 'Severity', val: active.severity || 'Medium' },
    { label: 'Sector / Block', val: `${active.location?.sector || 'Sector 54'} • ${active.location?.block || 'Block B'}` },
    { label: 'Asset ID', val: active.location?.assetId || 'ASSET-GEN-01', mono: true },
    { label: 'Reported By', val: active.reportedBy?.name || 'RWA' },
    { label: 'Filed At', val: formatSafeDate(active.createdAt || active.created_at), sm: true },
  ]

  const woAttrs = [
    { label: 'Work Order ID', val: active.work_order_number || 'WO-PENDING', mono: true },
    { label: 'AMC Contract', val: active.assigned_contractor?.amc_contract_id || active.amc_contract_id || (activeContractorName ? 'AMC-CIV-2026' : '—'), monoSm: true },
    { label: 'Total Estimate', val: `Rs.${(active.estimated_cost || 0).toLocaleString()}` },
    { label: 'Dept Head Req.', val: active.requires_dept_head ? 'Yes' : 'No', cls: active.requires_dept_head ? 'ct-req-depthead-yes' : 'ct-req-depthead-no' },
    { label: 'Priority', val: active.priority || '—' },
    { label: 'Inspection', val: active.inspection_notes || active.inspectionRemarks ? 'Inspected' : 'Pending' },
  ]

  return (
    <div className="ct-root">
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

      {banner && (
        <div className={`ct-banner ${banner.cls}`}>
          <div className="ct-banner-text">{banner.text}</div>
        </div>
      )}

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
              const isPast = idx < stageIdx
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

      <div className="ct-details-grid">
        <div className="ct-card">
          <div className="ct-card-tag">Complaint Details</div>
          <div className="ct-card-heading">{active.title}</div>
          <p className="ct-complaint-desc">{active.description}</p>
          <div className="ct-attrs">
            {complaintAttrs.map(({ label, val, mono, sm }) => (
              <div key={label}>
                <span className="ct-attr-label">{label}</span>
                <strong className={mono ? 'ct-val-mono-sm' : sm ? 'ct-val-sm' : ''}>{val}</strong>
              </div>
            ))}
          </div>
          {active.beforePhotos?.length > 0 && (
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

        <div className="ct-card">
          <div className="ct-card-tag">Work Order &amp; Contractor</div>
          <div className="ct-card-heading">{activeContractorName || 'Pending Assignment'}</div>
          {activeContractorName && (
            <p className="ct-contractor-lead">
              Lead: {active.assignedContractor?.lead || active.assignedContractor?.contact_person || 'Rajesh Verma'} &bull; {active.assignedContractor?.phone || '+91 98112 45012'}
            </p>
          )}
          <div className="ct-attrs">
            {woAttrs.map(({ label, val, mono, monoSm, cls }) => (
              <div key={label}>
                <span className="ct-attr-label">{label}</span>
                <strong className={cls || (mono ? 'ct-val-mono' : monoSm ? 'ct-val-mono-sm' : '')}>{val}</strong>
              </div>
            ))}
          </div>

          {active.line_items?.length > 0 && (
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

          {active.afterPhotos?.length > 0 && (
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
