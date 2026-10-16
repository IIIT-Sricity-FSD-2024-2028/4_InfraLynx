import { useState } from 'react'
import { getPhotoUrl, handlePhotoError } from '../../utils/photoUrl.js'
import './styles/VerificationDispute.css'

export default function VerificationDispute({
  complaints = [],
  selectedComplaint,
  currentUser,
  onNavigate,
  onSelectComplaint,
  onConfirmFix,
}) {
  const normStatus = (s) => (s || '').toUpperCase().replace(/[\s_-]+/g, '_')

  // Eligible complaints: strictly tickets awaiting verification
  const eligibleComplaints = complaints.filter((c) =>
    ['PENDING_VERIFICATION', 'COMPLETED', 'WORK_COMPLETED'].includes(normStatus(c.status))
  )

  const activeComplaint =
    (selectedComplaint &&
      eligibleComplaints.find(
        (c) => c.id === selectedComplaint.id || c.complaint_code === selectedComplaint.complaint_code
      )) ||
    eligibleComplaints[0] ||
    null

  const [rating, setRating] = useState(5)
  const [confirmRemarks, setConfirmRemarks] = useState('')
  const [actionDoneMessage, setActionDoneMessage] = useState(null)

  async function handleConfirm() {
    if (!activeComplaint) return
    const ticketId = activeComplaint.complaint_code || activeComplaint.id
    try {
      if (onConfirmFix) {
        await onConfirmFix(ticketId, {
          rating,
          remarks: confirmRemarks.trim() || `Verified satisfactory resolution by ${currentUser?.name || 'Dr. Arvind Swaminathan'} (${currentUser?.title || 'RWA Secretary'}).`,
        })
      }
      setActionDoneMessage({
        type: 'success',
        title: 'Fix Confirmed & Verified!',
        text: `Complaint ${ticketId} verified by ${currentUser?.name || 'Dr. Arvind Swaminathan'} and is now CLOSED. Finance has been notified to process contractor payment.`,
      })
      const nextPending = eligibleComplaints.find(
        (c) => c.id !== activeComplaint.id && c.complaint_code !== ticketId
      )
      if (onSelectComplaint) {
        onSelectComplaint(nextPending || null)
      }
    } catch (err) {
      alert(`Failed to confirm resolution: ${err.message}`)
    }
  }

  // Render Action Done Banner
  const renderBanner = () => {
    if (!actionDoneMessage) return null
    return (
      <div className={`action-result-banner ${actionDoneMessage.type}`}>
        <div>
          <div className="action-result-title">{actionDoneMessage.title}</div>
          <div className="action-result-text">{actionDoneMessage.text}</div>
        </div>
        <button onClick={() => onNavigate('dashboard')} className="btn-result-return">
          Return to Dashboard →
        </button>
      </div>
    )
  }

  // Empty state when no tickets await verification
  if (!activeComplaint || eligibleComplaints.length === 0) {
    return (
      <div className="verification-root">
        <div className="verification-header-row">
          <div>
            <button onClick={() => onNavigate('dashboard')} className="btn-back">
              ← Back to Dashboard
            </button>
            <h1 className="verification-title">Verification Workspace</h1>
            <p className="verification-subtitle">
              Inspect contractor before & after physical evidence, rate repair quality, and confirm resolution.
            </p>
          </div>
        </div>

        {renderBanner()}

        <div className="empty-verification-card">
          <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            No Complaints Currently Awaiting Verification
          </h3>
          <p style={{ color: 'var(--text-soft)', maxWidth: 520, margin: '8px auto 20px', fontSize: 13.5 }}>
            All completed repairs have been verified and processed. New tickets will appear here as soon as contractors complete field work.
          </p>
          <button onClick={() => onNavigate('dashboard')} className="btn-result-return">
            ← Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const beforeCandidate =
    activeComplaint.beforePhotos?.[0] ||
    activeComplaint.before_photos?.[0] ||
    (activeComplaint.evidence || []).find((e) => (e.evidence_type || e.type) === 'BEFORE')?.file_url
  const beforePhoto = getPhotoUrl(beforeCandidate)

  const afterCandidate =
    activeComplaint.afterPhotos?.[0] ||
    activeComplaint.after_photos?.[0] ||
    (activeComplaint.evidence || []).find((e) => (e.evidence_type || e.type) === 'AFTER')?.file_url
  const afterPhoto = getPhotoUrl(afterCandidate)

  return (
    <div className="verification-root">
      {/* Header */}
      <div className="verification-header-row">
        <div>
          <button onClick={() => onNavigate('dashboard')} className="btn-back">
            ← Back to Dashboard
          </button>
          <h1 className="verification-title">Verification Workspace</h1>
          <p className="verification-subtitle">
            Inspect contractor before & after physical evidence, rate repair quality, and confirm resolution.
          </p>
        </div>

        {/* Complaint Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>Inspecting Ticket:</span>
          <select
            value={activeComplaint.id}
            onChange={(e) => {
              const c = eligibleComplaints.find((item) => item.id === e.target.value || item.complaint_code === e.target.value)
              if (c) onSelectComplaint(c)
              setActionDoneMessage(null)
            }}
            className="ticket-inspect-select"
          >
            {eligibleComplaints.map((c) => {
              const ticketId = c.complaint_code || c.id
              const ticketTitle = c.title || `${c.category || 'Issue'} - ${c.subCategory || 'General'}`
              return (
                <option key={c.id} value={c.id}>
                  {ticketId} — {ticketTitle}
                </option>
              )
            })}
          </select>
        </div>
      </div>

      {renderBanner()}

      {/* Main Comparison Container */}
      <div className="comparison-card">
        {/* Ticket Header & Status Pill */}
        <div className="comparison-card-top">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="badge-id">{activeComplaint.id}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                {activeComplaint.title}
              </span>
              <span className="verification-status-pill">
                ⏳ Awaiting Verification
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 4 }}>
              Location: <strong>{activeComplaint.location?.block || activeComplaint.block || 'Block'}, {activeComplaint.location?.street || activeComplaint.street || 'Main St'}</strong> ({activeComplaint.location?.assetName || activeComplaint.asset_name || 'Asset'})
            </div>
          </div>
        </div>

        {/* Side by Side Comparison View */}
        <div className="side-by-side-grid">
          <div className="side-img-box">
            <div className="side-img-title before">1. Citizen Original Photo (Before)</div>
            <img
              src={beforePhoto}
              alt="Before"
              className="side-img before"
              onError={(e) => handlePhotoError(e, beforeCandidate)}
            />
          </div>
          <div className="side-img-box">
            <div className="side-img-title after">2. Contractor Completion Photo (After)</div>
            <img
              src={afterPhoto}
              alt="After"
              className="side-img after"
              onError={(e) => handlePhotoError(e, afterCandidate)}
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
          <h3 className="decision-title">
            Verification Decision — {currentUser?.name || 'Dr. Arvind Swaminathan'} ({currentUser?.title || 'RWA Secretary'})
          </h3>
          <p className="decision-desc">
            Please inspect the physical evidence. When the repair is satisfactorily resolved on ground, confirm fix to close the ticket and authorize contractor payment.
          </p>

          <div className="confirm-option-box">
            <div className="confirm-top-row">
              <div>
                <h4 className="confirm-heading">Confirm Fix & Authorize Resolution</h4>
                <span className="confirm-sub">
                  Marks the complaint as CLOSED and notifies township finance that the contractor's AMC invoice is authorized for payment audit.
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
                id="btn-confirm-fix"
                onClick={handleConfirm}
                className="btn-confirm-resolution"
              >
                Confirm Fix & Authorize Resolution ✓
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
