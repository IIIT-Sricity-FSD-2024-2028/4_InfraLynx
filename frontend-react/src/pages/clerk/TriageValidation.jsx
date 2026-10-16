import { useState, useMemo } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import { clerkApi } from '../../services/api.js'
import './styles/TriageValidation.css'

function formatSafeDate(dateVal) {
  if (!dateVal) return 'Recently'
  const d = new Date(dateVal)
  return isNaN(d.getTime()) ? 'Recently' : d.toLocaleString()
}

/**
 * TriageValidation - Screen 2: Clerk validates or rejects a complaint.
 *
 * Props:
 *   selectedComplaint            - complaint to review (null shows a picker list)
 *   onNavigate(screen)           - navigate to another screen
 *   onSelectComplaint(complaint) - update selected complaint in portal state
 *
 * Context:
 *   complaints            - live list (re-synced via useMemo so UI updates instantly)
 *   currentUser           - clerk user info
 *   updateComplaintStatus - transitions status + appends history entry
 *
 * Status transitions:
 *   REPORTED     -> UNDER_REVIEW   (auto on open)
 *   UNDER_REVIEW -> VALIDATED      (clerk clicks Validate)
 *   UNDER_REVIEW -> REJECTED       (clerk submits rejection form)
 *
 * Local state:
 *   isRejecting      - toggles rejection form visibility
 *   rejectionReason  - selected reason from dropdown
 *   rejectionRemarks - optional free-text remarks
 */
export default function TriageValidation({ complaints: propComplaints, selectedComplaint, onNavigate, onSelectComplaint, onComplaintUpdated }) {
  const { complaints: contextComplaints, currentUser, updateComplaintStatus } = useTIMS()

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

  const [isRejecting,      setIsRejecting]      = useState(false)
  const [rejectionReason,  setRejectionReason]  = useState('Duplicate Complaint')
  const [rejectionRemarks, setRejectionRemarks] = useState('')
  const [isSubmitting,     setIsSubmitting]     = useState(false)

  // Live-sync selected complaint so UI reflects status changes immediately
  const active = useMemo(() => {
    if (!selectedComplaint) return null
    return complaints.find(c => c.id === selectedComplaint.id) || selectedComplaint
  }, [complaints, selectedComplaint])

  // All complaints that still need triage (for picker list & switcher)
  const triageable = complaints.filter(c => c.status === 'REPORTED' || c.status === 'UNDER_REVIEW')

  /** Open complaint for review. Auto-transitions REPORTED -> UNDER_REVIEW */
  async function handleOpen(complaint) {
    onSelectComplaint(complaint)
    if (complaint.status === 'REPORTED') {
      try {
        const res = await clerkApi.triageComplaint(complaint.id)
        const updated = {
          ...(res?.data || res || complaint),
          status: 'UNDER_REVIEW',
        }
        if (onComplaintUpdated) {
          onComplaintUpdated(updated)
        }
      } catch (err) {
        console.warn('[TriageValidation] Triage notice:', err.message)
      }
      updateComplaintStatus(
        complaint.id, 'UNDER_REVIEW',
        `Desk Clerk (${currentUser?.name || 'Staff'}) opened complaint for review.`
      )
    }
  }

  /** Validate the active complaint -> VALIDATED */
  async function handleValidate() {
    if (!active || isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await clerkApi.validateComplaint(active.id)
      const updated = {
        ...(res?.data || res || active),
        status: 'VALIDATED',
        history: [
          ...(active.history || []),
          {
            stage: 'VALIDATED',
            timestamp: new Date().toISOString(),
            actor: `${currentUser?.name || 'Authorized Staff'} (Desk Clerk)`,
            note: `Validated by Desk Clerk (${currentUser?.name || 'Staff'}). All fields verified. Ready for Work Order creation.`,
          },
        ],
      }
      if (onComplaintUpdated) {
        onComplaintUpdated(updated)
      }
      updateComplaintStatus(
        active.id, 'VALIDATED',
        `Validated by Desk Clerk (${currentUser?.name || 'Staff'}). All fields verified. Ready for Work Order creation.`
      )
      setIsRejecting(false)
    } catch (err) {
      console.error('[TriageValidation] Validation failed:', err)
      alert('Validation failed: ' + (err.message || 'Server error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  /** Submit rejection form -> REJECTED */
  async function handleReject(e) {
    e.preventDefault()
    if (!active || isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await clerkApi.rejectComplaint(active.id, { reason: rejectionReason, remarks: rejectionRemarks })
      const updated = {
        ...(res?.data || res || active),
        status: 'REJECTED',
        rejection_reason: rejectionReason,
        rejection_remarks: rejectionRemarks,
        history: [
          ...(active.history || []),
          {
            stage: 'REJECTED',
            timestamp: new Date().toISOString(),
            actor: `${currentUser?.name || 'Authorized Staff'} (Desk Clerk)`,
            note: `Rejected by ${currentUser?.name || 'Staff'}. Reason: "${rejectionReason}". Remarks: "${rejectionRemarks || 'None'}".`,
          },
        ],
      }
      if (onComplaintUpdated) {
        onComplaintUpdated(updated)
      }
      updateComplaintStatus(
        active.id, 'REJECTED',
        `Rejected by ${currentUser?.name || 'Staff'}. Reason: "${rejectionReason}". Remarks: "${rejectionRemarks || 'None'}".`
      )
      setIsRejecting(false)
      setRejectionRemarks('')
    } catch (err) {
      console.error('[TriageValidation] Rejection failed:', err)
      alert('Rejection failed: ' + (err.message || 'Server error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper: status badge display props
  function badge(status) {
    const m = {
      REPORTED:     { label: 'Reported',     bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
      UNDER_REVIEW: { label: 'Under Review', bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
      VALIDATED:    { label: 'Validated',    bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
      REJECTED:     { label: 'Rejected',     bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
    }
    return m[status] || { label: status, bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' }
  }

  // ── No complaint selected: show picker list ───────────────────────────────
  if (!active) {
    return (
      <div className="tv-root">
        <div className="tv-header">
          <h1 className="tv-title">Triage &amp; Validate</h1>
          <p className="tv-subtitle">Select a complaint to begin review.</p>
        </div>
        {triageable.length === 0 ? (
          <div className="tv-card tv-empty-card">
            <div className="tv-empty-icon">&#10003;</div>
            <div className="tv-empty-title">No complaints pending triage</div>
            <button onClick={() => onNavigate('dashboard')} className="tv-back-btn tv-back-btn-spacer">
              Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="tv-picker-list">
            {triageable.map(c => {
              const b = badge(c.status)
              return (
                <div key={c.id} className="tv-picker-row" onClick={() => handleOpen(c)}>
                  <div>
                    <span className="tv-picker-id">{c.id}</span>
                    <span className="tv-picker-title">{c.title}</span>
                    <div className="tv-picker-meta">{c.category} &bull; {c.location.sector}, {c.location.block}</div>
                  </div>
                  <div className="tv-picker-right">
                    <span className="tv-badge-pill" style={{ background: b.bg, color: b.color, borderColor: b.border }}>
                      {b.label}
                    </span>
                    <span className="tv-picker-cta">Review &#8594;</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const isActed = active.status === 'VALIDATED' || active.status === 'REJECTED'
  const catCls  = active.category === 'Electrical' ? 'electrical' : active.category === 'Water' ? 'water' : active.category === 'Horticulture' ? 'horticulture' : 'civil'
  const sevCls  = active.severity === 'Emergency'  ? 'emergency'  : active.severity === 'High'  ? 'high' : 'normal'
  const b       = badge(active.status)

  return (
    <div className="tv-root">
      <button className="tv-back-btn" onClick={() => onNavigate('dashboard')}>&#8592; Back to Dashboard</button>

      {/* Header + complaint switcher */}
      <div className="tv-header">
        <div>
          <h1 className="tv-title">Triage &amp; Validate</h1>
          <p className="tv-subtitle">Review details, then validate or reject.</p>
        </div>
        {triageable.length > 1 && (
          <div className="tv-switch-wrap">
            <span className="tv-switch-label">Switch:</span>
            <select
              value={active.id}
              onChange={e => { const c = complaints.find(x => x.id === e.target.value); if (c) handleOpen(c) }}
              className="tv-switcher"
            >
              {triageable.map(c => <option key={c.id} value={c.id}>{c.id} - {c.title.slice(0, 28)}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Already acted banner */}
      {isActed && (
        <div className={`tv-acted-banner${active.status === 'VALIDATED' ? ' validated' : ' rejected'}`}>
          <strong>
            {active.status === 'VALIDATED'
              ? '&#10003; Validated — ready for Work Order creation.'
              : '&#10007; Complaint rejected.'}
          </strong>
          {active.status === 'VALIDATED' && (
            <button onClick={() => { onSelectComplaint(active); onNavigate('workorder') }} className="tv-go-wo-btn">
              Create Work Order &#8594;
            </button>
          )}
        </div>
      )}

      {/* Complaint detail card */}
      <div className="tv-card">
        <div className="tv-card-top">
          <div className="tv-id-row">
            <span className="tv-id-pill">{active.id}</span>
            <span className={`tv-cat-pill ${catCls}`}>{active.category} &bull; {active.subCategory}</span>
            <span className={`tv-sev-pill ${sevCls}`}>{active.severity} Severity</span>
          </div>
          <span className="tv-status-badge" style={{ background: b.bg, color: b.color, borderColor: b.border }}>
            {b.label}
          </span>
        </div>

        <h2 className="tv-complaint-title">{active.title}</h2>
        <p className="tv-complaint-desc">{active.description}</p>

        {/* Attribute grid */}
        <div className="tv-attrs">
          {[
            { label: 'Category',      value: `${active.category} (${active.subCategory})` },
            { label: 'Severity',      value: active.severity },
            { label: 'Sector/Block',  value: `${active.location.sector} — ${active.location.block}` },
            { label: 'Street',        value: active.location.street || '—' },
            { label: 'Asset ID',      value: active.location.assetId, mono: true },
            { label: 'Asset Name',    value: active.location.assetName },
            { label: 'Landmark',      value: active.location.landmark || '—' },
          ].map(a => (
            <div key={a.label} className="tv-attr-item">
              <span className="tv-attr-label">{a.label}</span>
              <span className={`tv-attr-val${a.mono ? ' mono' : ''}`}>{a.value}</span>
            </div>
          ))}
        </div>

        {/* Reporter info */}
        <div className="tv-reporter">
          <div><span className="tv-attr-label">Reported By</span><strong>{active.reportedBy ? active.reportedBy.name : 'RWA Representative'}</strong></div>
          <div><span className="tv-attr-label">Role</span><strong>{active.reportedBy ? active.reportedBy.role.toUpperCase() : 'RWA'}</strong></div>
          <div><span className="tv-attr-label">Sector</span><strong>{active.reportedBy ? active.reportedBy.sector : active.location.sector}</strong></div>
          <div><span className="tv-attr-label">Filed At</span><strong>{formatSafeDate(active.createdAt || active.created_at)}</strong></div>
        </div>

        {/* Photo evidence */}
        {active.beforePhotos && active.beforePhotos.length > 0 && (
          <div>
            <span className="tv-attr-label tv-attr-label-block">Site Evidence Photos</span>
            <div className="tv-photos">
              {Array.from(new Set(active.beforePhotos)).map((src, i) => (
                <img key={i} src={src} alt={`Evidence ${i + 1}`} className="tv-photo" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Decision panel — only shown when complaint not yet acted on */}
      {!isActed && (
        <div className="tv-decision-card">
          <h2 className="tv-decision-title">Clerk Decision</h2>
          <p className="tv-decision-desc">
            Review the details above carefully. Validate to proceed, or reject with a documented reason.
          </p>

          {/* Option A: Validate */}
          {!isRejecting && (
            <div className="tv-validate-box">
              <h3 className="tv-validate-heading">Option A — Validate Complaint</h3>
              <p className="tv-validate-subtext">
                Confirm all fields are accurate and the issue is within township jurisdiction.
              </p>
              <ul className="tv-checklist">
                <li>&#10003; Location verified within township limits</li>
                <li>&#10003; Category and sub-category correctly assigned</li>
                <li>&#10003; Severity level appropriate</li>
                <li>&#10003; Not a duplicate of an existing open complaint</li>
              </ul>
              <div className="tv-validate-actions">
                <button className="tv-btn-open-reject" onClick={() => setIsRejecting(true)}>
                  Issue with complaint? Reject instead &#8594;
                </button>
                <button
                  id="btn-validate-complaint"
                  className="tv-btn-validate"
                  onClick={handleValidate}
                  disabled={isSubmitting}
                  style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                >
                  {isSubmitting ? 'Validating...' : 'Validate Complaint ✓'}
                </button>
              </div>
            </div>
          )}

          {/* Option B: Reject form */}
          {isRejecting && (
            <form className="tv-reject-box" onSubmit={handleReject}>
              <div className="tv-reject-top">
                <h3 className="tv-reject-heading">Option B — Reject Complaint</h3>
                <button type="button" className="tv-btn-cancel-reject" onClick={() => setIsRejecting(false)}>
                  &#10005; Cancel
                </button>
              </div>
              <div>
                <label className="tv-attr-label">Rejection Reason <span className="tv-required-star">*</span></label>
                <select
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  className="tv-select"
                  required
                >
                  <option value="Duplicate Complaint">Duplicate of existing open complaint</option>
                  <option value="Outside Jurisdiction">Location outside township jurisdiction</option>
                  <option value="Wrong Category">Incorrect category / department assigned</option>
                  <option value="Insufficient Information">Insufficient information to process</option>
                  <option value="Not Township Responsibility">Not a township responsibility</option>
                </select>
              </div>
              <div>
                <label className="tv-attr-label">Additional Remarks</label>
                <textarea
                  rows={3}
                  value={rejectionRemarks}
                  onChange={e => setRejectionRemarks(e.target.value)}
                  placeholder="Explain so RWA can re-file correctly..."
                  className="tv-textarea"
                />
              </div>
              <div className="tv-form-actions-end">
                <button type="button" onClick={() => setIsRejecting(false)} className="tv-btn-cancel-flat">Cancel</button>
                <button type="submit" className="tv-btn-submit-reject">Submit Rejection &#9888;</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Audit trail */}
      <div className="tv-audit-card">
        <h3 className="tv-audit-title">Complaint Audit Trail</h3>
        <div className="tv-audit-list">
          {(active.history || []).map((ev, idx) => (
            <div key={idx} className="tv-audit-item">
              <div className="tv-audit-dot" />
              <div className="tv-audit-body">
                <div className="tv-audit-header">
                  <span className="tv-audit-stage">{ev.stage}</span>
                  <strong className="tv-audit-actor">{ev.actor}</strong>
                  <span className="tv-audit-time">{new Date(ev.timestamp).toLocaleString()}</span>
                </div>
                <div className="tv-audit-note">{ev.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
