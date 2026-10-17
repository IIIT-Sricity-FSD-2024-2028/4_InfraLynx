import { useState, useMemo } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import { clerkApi } from '../../services/api.js'
import { isComplaintInClerkDepartment } from './ClerkPortal.jsx'
import './styles/TriageValidation.css'

/**
 * Status badge styling configuration
 */
const STATUS_BADGES = {
  REPORTED:     { label: 'Reported',     bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  UNDER_REVIEW: { label: 'Under Review', bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  VALIDATED:    { label: 'Validated',    bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  REJECTED:     { label: 'Rejected',     bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
}

/**
 * Formats timestamps safely into localized strings or 'Recently'
 */
function formatSafeDate(dateVal) {
  if (!dateVal) return 'Recently'
  const d = new Date(dateVal)
  return isNaN(d.getTime()) ? 'Recently' : d.toLocaleString()
}

/**
 * TriageValidation - Screen 2: Desk Clerk complaint verification & triage.
 *
 * Lifecycle Transitions:
 *   REPORTED     -> UNDER_REVIEW  (auto-triggered when clerk opens complaint for inspection)
 *   UNDER_REVIEW -> VALIDATED     (clerk confirms location, category, severity, and photo validity)
 *   UNDER_REVIEW -> REJECTED      (clerk rejects ticket with reason and formal remarks)
 */
export default function TriageValidation({
  complaints: propComplaints,
  selectedComplaint,
  onNavigate,
  onSelectComplaint,
  onComplaintUpdated,
}) {
  // Context state for global complaint updates and logged-in user details
  const { complaints: contextComplaints = [], currentUser, updateComplaintStatus } = useTIMS()

  // Filter complaints strictly matching the Desk Clerk's assigned department
  const complaints = useMemo(() => {
    if (propComplaints) return propComplaints
    return contextComplaints.filter(c => isComplaintInClerkDepartment(c, currentUser))
  }, [propComplaints, contextComplaints, currentUser])

  // Form states for rejection workflow
  const [isRejecting, setIsRejecting]           = useState(false)
  const [rejectionReason, setRejectionReason]   = useState('Duplicate Complaint')
  const [rejectionRemarks, setRejectionRemarks] = useState('')
  const [isSubmitting, setIsSubmitting]         = useState(false)

  // Synchronize the currently active complaint with live state
  const active = useMemo(() => {
    if (!selectedComplaint) return null
    return complaints.find(c => c.id === selectedComplaint.id) || selectedComplaint
  }, [complaints, selectedComplaint])

  // Complaints currently awaiting review or triage
  const triageable = useMemo(() => (
    complaints.filter(c => c.status === 'REPORTED' || c.status === 'UNDER_REVIEW')
  ), [complaints])

  /**
   * Automatically transition complaint from REPORTED -> UNDER_REVIEW when opened
   */
  async function handleOpen(complaint) {
    onSelectComplaint(complaint)
    if (complaint.status === 'REPORTED') {
      try {
        const res = await clerkApi.triageComplaint(complaint.id)
        const updated = { ...(res?.data || res || complaint), status: 'UNDER_REVIEW' }
        if (onComplaintUpdated) onComplaintUpdated(updated)
      } catch (err) {
        console.warn('[TriageValidation] Triage notice:', err.message)
      }
      updateComplaintStatus?.(
        complaint.id,
        'UNDER_REVIEW',
        `Desk Clerk (${currentUser?.name || 'Staff'}) opened complaint for review.`
      )
    }
  }

  /**
   * Validate complaint: Marks ticket VALIDATED, unlocks work order dispatch
   */
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
      if (onComplaintUpdated) onComplaintUpdated(updated)
      updateComplaintStatus?.(
        active.id,
        'VALIDATED',
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

  /**
   * Reject complaint: Marks ticket REJECTED with mandatory audit remarks
   */
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
      if (onComplaintUpdated) onComplaintUpdated(updated)
      updateComplaintStatus?.(
        active.id,
        'REJECTED',
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

  // ── Render Picker View when no complaint is selected ──────────────────────
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
              const b = STATUS_BADGES[c.status] || { label: c.status, bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' }
              return (
                <div key={c.id} className="tv-picker-row" onClick={() => handleOpen(c)}>
                  <div>
                    <span className="tv-picker-id">{c.id}</span>
                    <span className="tv-picker-title">{c.title}</span>
                    <div className="tv-picker-meta">{c.category} &bull; {c.location?.sector}, {c.location?.block}</div>
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
  const catCls  = (active.category || '').toLowerCase()
  const sevCls  = active.severity === 'Emergency' ? 'emergency' : active.severity === 'High' ? 'high' : 'normal'
  const b       = STATUS_BADGES[active.status] || { label: active.status, bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' }

  // Clean data attributes for the complaint detail card
  const attributeList = [
    { label: 'Category', value: `${active.category} (${active.subCategory || active.subcategory || ''})` },
    { label: 'Severity', value: active.severity },
    { label: 'Sector/Block', value: `${active.location?.sector || 'Sector 54'} — ${active.location?.block || 'Block A'}` },
    { label: 'Street', value: active.location?.street || '—' },
    { label: 'Asset ID', value: active.location?.assetId || 'ASSET-GEN-01', mono: true },
    { label: 'Asset Name', value: active.location?.assetName || 'Municipal Asset' },
    { label: 'Landmark', value: active.location?.landmark || '—' },
  ]

  return (
    <div className="tv-root">
      <button className="tv-back-btn" onClick={() => onNavigate('dashboard')}>&#8592; Back to Dashboard</button>

      {/* Header and complaint switcher */}
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

      {/* Banner shown if already validated or rejected */}
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

      {/* Complaint Detail Card */}
      <div className="tv-card">
        <div className="tv-card-top">
          <div className="tv-id-row">
            <span className="tv-id-pill">{active.id}</span>
            <span className={`tv-cat-pill ${catCls}`}>{active.category} &bull; {active.subCategory || active.subcategory || ''}</span>
            <span className={`tv-sev-pill ${sevCls}`}>{active.severity} Severity</span>
          </div>
          <span className="tv-status-badge" style={{ background: b.bg, color: b.color, borderColor: b.border }}>
            {b.label}
          </span>
        </div>

        <h2 className="tv-complaint-title">{active.title}</h2>
        <p className="tv-complaint-desc">{active.description}</p>

        {/* Structured complaint attributes */}
        <div className="tv-attrs">
          {attributeList.map(({ label, value, mono }) => (
            <div key={label} className="tv-attr-item">
              <span className="tv-attr-label">{label}</span>
              <span className={`tv-attr-val${mono ? ' mono' : ''}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Reporter information */}
        <div className="tv-reporter">
          <div><span className="tv-attr-label">Reported By</span><strong>{active.reportedBy?.name || 'RWA Representative'}</strong></div>
          <div><span className="tv-attr-label">Role</span><strong>{(active.reportedBy?.role || 'RWA').toUpperCase()}</strong></div>
          <div><span className="tv-attr-label">Sector</span><strong>{active.reportedBy?.sector || active.location?.sector || 'Sector 54'}</strong></div>
          <div><span className="tv-attr-label">Filed At</span><strong>{formatSafeDate(active.createdAt || active.created_at)}</strong></div>
        </div>

        {/* Photographic evidence submitted by resident */}
        {active.beforePhotos?.length > 0 && (
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

      {/* Decision Panel (shown only when pending review) */}
      {!isActed && (
        <div className="tv-decision-card">
          <h2 className="tv-decision-title">Clerk Decision</h2>
          <p className="tv-decision-desc">
            Review the details above carefully. Validate to proceed, or reject with a documented reason.
          </p>

          {!isRejecting ? (
            /* Option A: Validate Action Box */
            <div className="tv-validate-box">
              <h3 className="tv-validate-heading">Option A — Validate Complaint</h3>
              <p className="tv-validate-subtext">Confirm all fields are accurate and the issue is within township jurisdiction.</p>
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
          ) : (
            /* Option B: Reject Form */
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

      {/* Immutable Complaint Audit Trail */}
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
                  <span className="tv-audit-time">{formatSafeDate(ev.timestamp)}</span>
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
