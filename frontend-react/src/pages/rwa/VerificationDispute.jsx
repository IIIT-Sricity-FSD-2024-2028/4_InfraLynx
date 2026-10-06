import { useState, useRef } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import './styles/VerificationDispute.css'

export default function VerificationDispute({ selectedComplaint, onNavigate, onSelectComplaint }) {
  const { complaints, confirmFix, disputeComplaint } = useTIMS()

  // Eligible complaints for Verification Workspace:
  // 1. Awaiting Verification: PENDING_VERIFICATION, COMPLETED, WORK_COMPLETED
  // 2. Already Fixed & Verified: CLOSED, VERIFIED
  const eligibleComplaints = complaints.filter((c) => {
    const st = (c.status || '').toUpperCase()
    return ['PENDING_VERIFICATION', 'COMPLETED', 'WORK_COMPLETED', 'CLOSED', 'VERIFIED'].includes(st)
  })

  // Selected complaint must come from eligibleComplaints
  const activeComplaint =
    (selectedComplaint && eligibleComplaints.find((c) => c.id === selectedComplaint.id)) ||
    eligibleComplaints.find((c) => ['PENDING_VERIFICATION', 'COMPLETED', 'WORK_COMPLETED'].includes((c.status || '').toUpperCase())) ||
    eligibleComplaints[0] ||
    null

  // Actions state
  const [isDisputeOpen, setIsDisputeOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [confirmRemarks, setConfirmRemarks] = useState('')
  const [disputeReason, setDisputeReason] = useState('Incomplete Repair')
  const [disputeRemarks, setDisputeRemarks] = useState('')
  const [disputePhotos, setDisputePhotos] = useState([])
  const [actionDoneMessage, setActionDoneMessage] = useState(null)

  // useRef for dispute file input
  const disputeFileInputRef = useRef(null)

  function handleTriggerDisputeFile() {
    if (disputeFileInputRef.current) {
      disputeFileInputRef.current.click()
    }
  }

  function handleDisputeFileChange(e) {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setDisputePhotos((prev) => [...prev, ev.target.result])
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // Confirm Fix Handler
  function handleConfirm() {
    if (!activeComplaint) return
    confirmFix(activeComplaint.id, {
      rating,
      remarks: confirmRemarks.trim() || 'Verified satisfactory resolution by RWA.',
    })
    setActionDoneMessage({
      type: 'success',
      title: 'Fix Confirmed & Verified!',
      text: `Complaint ${activeComplaint.id} is now CLOSED. Finance has been notified to process contractor payment.`,
    })
  }

  // Dispute Handler
  function handleSubmitDispute(e) {
    e.preventDefault()
    if (!activeComplaint) return
    if (!disputeRemarks.trim()) {
      alert('Please provide remarks explaining why the repair is disputed.')
      return
    }

    disputeComplaint(activeComplaint.id, {
      reason: disputeReason,
      remarks: disputeRemarks,
      photos: disputePhotos,
    })

    setIsDisputeOpen(false)
    setActionDoneMessage({
      type: 'dispute',
      title: 'Dispute / Rework Triggered',
      text: `Complaint ${activeComplaint.id} marked as DISPUTED. Routed back to contractor rework queue for mandatory corrective action.`,
    })
  }

  // If no eligible complaints are available
  if (!activeComplaint || eligibleComplaints.length === 0) {
    return (
      <div className="verification-root">
        <div className="verification-header-row">
          <div>
            <button onClick={() => onNavigate('dashboard')} className="btn-back">
              ← Back to Dashboard
            </button>
            <h1 className="verification-title">Verification & Dispute Workspace</h1>
            <p className="verification-subtitle">
              Inspect contractor before & after physical evidence, confirm resolution, or order rework.
            </p>
          </div>
        </div>
        <div className="empty-verification-card">
          <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            No Complaints Currently Awaiting Verification
          </h3>
          <p style={{ color: 'var(--text-soft)', maxWidth: 520, margin: '8px auto 20px', fontSize: 13.5 }}>
            Only tickets where contractor work has been completed (or already fixed) are eligible for physical verification and sign-off.
          </p>
          <button
            onClick={() => onNavigate('dashboard')}
            className="btn-result-return success"
          >
            ← Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const isClosed = ['CLOSED', 'VERIFIED'].includes((activeComplaint.status || '').toUpperCase())

  const beforePhoto =
    activeComplaint.beforePhotos?.[0] ||
    'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80'
  const afterPhoto =
    activeComplaint.afterPhotos?.[0] ||
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80'

  return (
    <div className="verification-root">
      {/* Header */}
      <div className="verification-header-row">
        <div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="btn-back"
          >
            ← Back to Dashboard
          </button>
          <h1 className="verification-title">
            Verification & Dispute Workspace
          </h1>
          <p className="verification-subtitle">
            Inspect contractor before & after physical evidence, confirm resolution, or order rework.
          </p>
        </div>

        {/* Complaint Selector (Only Eligible: Awaiting Verification or Fixed) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>Inspecting Ticket:</span>
          <select
            value={activeComplaint.id}
            onChange={(e) => {
              const c = eligibleComplaints.find((item) => item.id === e.target.value)
              if (c) onSelectComplaint(c)
              setActionDoneMessage(null)
              setIsDisputeOpen(false)
            }}
            className="ticket-inspect-select"
          >
            {eligibleComplaints.map((c) => {
              const itemClosed = ['CLOSED', 'VERIFIED'].includes((c.status || '').toUpperCase())
              return (
                <option key={c.id} value={c.id}>
                  {c.id} — {itemClosed ? '✓ Fixed & Verified' : '⏳ Awaiting Verification'}
                </option>
              )
            })}
          </select>
        </div>
      </div>

      {/* Action Done Banner */}
      {actionDoneMessage && (
        <div className={`action-result-banner ${actionDoneMessage.type}`}>
          <div>
            <div className={`action-result-title ${actionDoneMessage.type}`}>
              {actionDoneMessage.title}
            </div>
            <div className={`action-result-text ${actionDoneMessage.type}`}>
              {actionDoneMessage.text}
            </div>
          </div>
          <button
            onClick={() => onNavigate('dashboard')}
            className={`btn-result-return ${actionDoneMessage.type}`}
          >
            Return to Dashboard →
          </button>
        </div>
      )}

      {/* Main Comparison Container */}
      <div className="comparison-card">
        {/* Ticket Header & Status Pill */}
        <div className="comparison-card-top">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="badge-id">
                {activeComplaint.id}
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                {activeComplaint.title}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 20,
                  background: isClosed ? '#dcfce7' : '#fef3c7',
                  color: isClosed ? '#166534' : '#92400e',
                  border: isClosed ? '1px solid #bbf7d0' : '1px solid #fde68a',
                }}
              >
                {isClosed ? '✓ Fixed & Verified' : '⏳ Awaiting Verification'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 4 }}>
              Location: <strong>{activeComplaint.location?.block || activeComplaint.block || 'Block'}, {activeComplaint.location?.street || activeComplaint.street || 'Main St'}</strong> ({activeComplaint.location?.assetName || activeComplaint.asset_name || 'Asset'})
            </div>
          </div>
        </div>

        {/* Side by Side Comparison View */}
        <div className="side-by-side-grid" style={{ marginBottom: 24 }}>
          <div className="side-img-box">
            <div className="side-img-title before">
              1. Citizen Original Photo (Before)
            </div>
            <img
              src={beforePhoto}
              alt="Before"
              className="side-img before"
            />
          </div>
          <div className="side-img-box">
            <div className="side-img-title after">
              2. Contractor Completion Photo (After)
            </div>
            <img
              src={afterPhoto}
              alt="After"
              className="side-img after"
            />
          </div>
        </div>

        {/* Contractor Work Summary Box */}
        <div className="contractor-summary-grid">
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11.5 }}>Assigned Contractor</span>
            <strong>{activeComplaint.assignedContractor?.name || 'Assigned Contractor'}</strong>
            <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>
              Work Order: {activeComplaint.workOrderId || 'WO-2026-088'}
            </div>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11.5 }}>Completion Timestamp</span>
            <strong>{activeComplaint.completedAt ? new Date(activeComplaint.completedAt).toLocaleString() : 'Recently Completed'}</strong>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11.5 }}>Contractor Completion Remarks</span>
            <p style={{ color: 'var(--text)', fontStyle: 'italic', marginTop: 2 }}>
              "{activeComplaint.completionRemarks || 'Work executed according to municipal standard and contractual AMC items.'}"
            </p>
          </div>
        </div>

        {/* DECISION ACTION SECTION */}
        <div className="decision-section">
          {isClosed ? (
            /* Already Verified & Fixed Display */
            <div className="verified-fixed-card">
              <div className="verified-fixed-header">
                <span className="verified-badge">✓ Resolution Verified & Complaint Closed</span>
                <span className="verified-time">
                  {activeComplaint.closed_at || activeComplaint.closedAt
                    ? `Closed: ${new Date(activeComplaint.closed_at || activeComplaint.closedAt).toLocaleDateString()}`
                    : 'Resolution Finalized'}
                </span>
              </div>
              <div className="verified-fixed-body">
                <div className="verified-rating-display">
                  <span style={{ fontWeight: 600, color: '#166534' }}>RWA Sign-Off Rating:</span>
                  <span style={{ color: '#f59e0b', fontSize: 16, marginLeft: 8 }}>
                    {'★'.repeat(activeComplaint.verification?.rating || activeComplaint.rating || 5)}
                    {'☆'.repeat(5 - (activeComplaint.verification?.rating || activeComplaint.rating || 5))}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-soft)', marginLeft: 6 }}>
                    ({activeComplaint.verification?.rating || activeComplaint.rating || 5}/5 Stars)
                  </span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>Verification Remarks:</span>
                  <p style={{ margin: '4px 0 0', color: 'var(--text)', fontStyle: 'italic' }}>
                    "{activeComplaint.verification?.remarks || activeComplaint.remarks || 'Work verified on ground by RWA. Municipal standard met and ticket closed.'}"
                  </p>
                </div>
                {activeComplaint.verification?.verified_by && (
                  <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--text-muted)' }}>
                    Verified by: <strong>{activeComplaint.verification.verified_by}</strong>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Actionable for PENDING_VERIFICATION */
            <>
              <h3 className="decision-title">
                RWA Verification Decision
              </h3>
              <p className="decision-desc">
                Please inspect the evidence and select whether the reported issue is satisfactorily resolved, or dispute the work to mandate contractor rework.
              </p>

              {!isDisputeOpen ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Confirm Fix Option Card */}
                  <div className="confirm-option-box">
                    <div className="confirm-top-row">
                      <div>
                        <h4 className="confirm-heading">
                          Option A: Confirm Fix (Sign-Off)
                        </h4>
                        <span className="confirm-sub">
                          Marks the complaint as CLOSED and notifies township finance that the contractor's AMC invoice is authorized for audit.
                        </span>
                      </div>

                      {/* Rating Selector */}
                      <div className="rating-cluster">
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#166534' }}>Rating:</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              className="star-btn"
                              style={{ color: star <= rating ? '#f59e0b' : '#cbd5e1' }}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={confirmRemarks}
                      onChange={(e) => setConfirmRemarks(e.target.value)}
                      placeholder="Optional verification remarks (e.g., 'Inspected on-site; streetlights fully restored')..."
                      className="confirm-remarks-input"
                    />

                    <div className="confirm-actions-row">
                      <button
                        onClick={() => setIsDisputeOpen(true)}
                        className="btn-open-dispute"
                      >
                        Found issues with the repair? Open Dispute instead →
                      </button>

                      <button
                        id="btn-confirm-fix"
                        onClick={handleConfirm}
                        className="btn-confirm-resolution"
                      >
                        Confirm Fix & Authorize Resolution ✓
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Dispute / Reopen Drawer */
                <form
                  onSubmit={handleSubmitDispute}
                  className="dispute-form-box"
                >
                  <div className="dispute-top-row">
                    <h4 className="dispute-heading">
                      Option B: Dispute / Reopen Complaint for Rework
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsDisputeOpen(false)}
                      className="btn-cancel-dispute"
                    >
                      ✕ Cancel Dispute
                    </button>
                  </div>

                  {/* Dispute Reason dropdown */}
                  <div>
                    <label className="dispute-label">
                      Dispute Reason <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <select
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      className="dispute-select"
                    >
                      <option value="Incomplete Repair">Incomplete Repair (Work left half done)</option>
                      <option value="Substandard Material">Substandard Material or Poor Quality</option>
                      <option value="Issue Recurred">Issue Recurred / Still Broken</option>
                      <option value="Debris Not Cleared">Debris / Waste Left On Site</option>
                      <option value="Wrong Asset Repaired">Wrong Asset / Location Addressed</option>
                    </select>
                  </div>

                  {/* Detailed Remarks */}
                  <div>
                    <label className="dispute-label">
                      Detailed Rejection / Rework Remarks <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={disputeRemarks}
                      onChange={(e) => setDisputeRemarks(e.target.value)}
                      placeholder="Detail the shortcomings observed on ground and what specific corrections are mandated..."
                      className="dispute-textarea"
                    />
                  </div>

                  {/* Additional Photo Evidence upload via useRef */}
                  <div>
                    <label className="dispute-label">
                      Additional Photo Evidence (Optional)
                    </label>
                    <input
                      type="file"
                      ref={disputeFileInputRef}
                      onChange={handleDisputeFileChange}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={handleTriggerDisputeFile}
                      className="btn-attach-evidence"
                    >
                      📷 Attach Re-inspection Photo
                    </button>

                    {disputePhotos.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        {disputePhotos.map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            alt="Dispute evidence"
                            style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 4 }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submit Dispute button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => setIsDisputeOpen(false)}
                      className="btn-cancel"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-submit-dispute"
                    >
                      Submit Dispute & Mandate Rework ⚠️
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
