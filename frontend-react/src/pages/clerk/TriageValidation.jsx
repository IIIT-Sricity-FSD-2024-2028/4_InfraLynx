import { useState, useMemo } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import './styles/TriageValidation.css'

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
export default function TriageValidation({ selectedComplaint, onNavigate, onSelectComplaint }) {
  const { complaints, currentUser, updateComplaintStatus } = useTIMS()

  const [isRejecting,      setIsRejecting]      = useState(false)
  const [rejectionReason,  setRejectionReason]  = useState('Duplicate Complaint')
  const [rejectionRemarks, setRejectionRemarks] = useState('')

  // Live-sync selected complaint so UI reflects status changes immediately
  const active = useMemo(() => {
    if (!selectedComplaint) return null
    return complaints.find(c => c.id === selectedComplaint.id) || selectedComplaint
  }, [complaints, selectedComplaint])

  // All complaints that still need triage (for picker list & switcher)
  const triageable = complaints.filter(c => c.status === 'REPORTED' || c.status === 'UNDER_REVIEW')

  /** Open complaint for review. Auto-transitions REPORTED -> UNDER_REVIEW */
  function handleOpen(complaint) {
    onSelectComplaint(complaint)
    if (complaint.status === 'REPORTED') {
      updateComplaintStatus(
        complaint.id, 'UNDER_REVIEW',
        `Desk Clerk (${currentUser.name}) opened complaint for review.`
      )
    }
  }

  /** Validate the active complaint -> VALIDATED */
  function handleValidate() {
    if (!active) return
    updateComplaintStatus(
      active.id, 'VALIDATED',
      `Validated by Desk Clerk (${currentUser.name}). All fields verified. Ready for Work Order creation.`
    )
    setIsRejecting(false)
  }

  /** Submit rejection form -> REJECTED */
  function handleReject(e) {
    e.preventDefault()
    if (!active) return
    updateComplaintStatus(
      active.id, 'REJECTED',
      `Rejected by ${currentUser.name}. Reason: "${rejectionReason}". Remarks: "${rejectionRemarks || 'None'}".`
    )
    setIsRejecting(false)
    setRejectionRemarks('')
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
          <div className="tv-card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>&#10003;</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>No complaints pending triage</div>
            <button onClick={() => onNavigate('dashboard')} className="tv-back-btn" style={{ marginTop: 16 }}>
              Back to Dashboard
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: b.bg, color: b.color, border: `1px solid ${b.border}` }}>
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
  const catCls  = active.category === 'Electrical' ? 'electrical' : active.category === 'Water' ? 'water' : 'civil'
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>Switch:</span>
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
            <button onClick={() => onNavigate('workorder')} className="tv-go-wo-btn">
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
          <span style={{
            fontSize: 12.5, fontWeight: 700, padding: '4px 10px',
            borderRadius: 'var(--radius-full)', background: b.bg, color: b.color, border: `1px solid ${b.border}`
          }}>
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
            { label: 'GPS',           value: active.location.gps },
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
          <div><span className="tv-attr-label">Filed At</span><strong>{new Date(active.createdAt).toLocaleString()}</strong></div>
        </div>

        {/* Photo evidence */}
        {active.beforePhotos && active.beforePhotos.length > 0 && (
          <div>
            <span className="tv-attr-label" style={{ display: 'block', marginBottom: 6 }}>Site Evidence Photos</span>
            <div className="tv-photos">
              {active.beforePhotos.map((src, i) => (
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
              <p style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 12 }}>
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
                <button id="btn-validate-complaint" className="tv-btn-validate" onClick={handleValidate}>
                  Validate Complaint &#10003;
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
                <label className="tv-attr-label">Rejection Reason <span style={{ color: 'var(--accent-red)' }}>*</span></label>
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
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
              <div style={{ flex: 1 }}>
                <div className="tv-audit-header">
                  <span className="tv-audit-stage">{ev.stage}</span>
                  <strong style={{ fontSize: 13 }}>{ev.actor}</strong>
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
