import { useState, useRef } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import './styles/VerificationDispute.css'

export default function VerificationDispute({ selectedComplaint, onNavigate, onSelectComplaint }) {
  const { complaints, confirmFix, disputeComplaint } = useTIMS()

  // Find complaint: prioritize the selected one, or the first one that is PENDING_VERIFICATION
  const activeComplaint =
    (selectedComplaint && complaints.find((c) => c.id === selectedComplaint.id)) ||
    complaints.find((c) => c.status === 'PENDING_VERIFICATION') ||
    complaints[0]

  // View state: 'slider' | 'side-by-side'
  const [comparisonMode, setComparisonMode] = useState('slider')
  const [sliderPosition, setSliderPosition] = useState(50) // 0 to 100%

  // Actions state
  const [isDisputeOpen, setIsDisputeOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [confirmRemarks, setConfirmRemarks] = useState('')
  const [disputeReason, setDisputeReason] = useState('Incomplete Repair')
  const [disputeRemarks, setDisputeRemarks] = useState('')
  const [disputePhotos, setDisputePhotos] = useState([])
  const [actionDoneMessage, setActionDoneMessage] = useState(null)

  // useRef for dragging slider
  const sliderContainerRef = useRef(null)
  const isDraggingRef = useRef(false)

  // useRef for dispute file input
  const disputeFileInputRef = useRef(null)

  function handleTriggerDisputeFile() {
    if (disputeFileInputRef.current) {
      disputeFileInputRef.current.click()
    }
  }

  function handleDisputeFileChange(e) {
    const files = Array.from(e.target.files)
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (evt) => {
        setDisputePhotos((prev) => [...prev, evt.target.result])
      }
      reader.readAsDataURL(file)
    })
  }

  // Interactive slider mouse & touch handlers
  function handleSliderMove(clientX) {
    if (!sliderContainerRef.current) return
    const rect = sliderContainerRef.current.getBoundingClientRect()
    const offsetX = clientX - rect.left
    const percent = Math.min(Math.max((offsetX / rect.width) * 100, 5), 95)
    setSliderPosition(percent)
  }

  function handleMouseDown(e) {
    isDraggingRef.current = true
    handleSliderMove(e.clientX)
  }

  function handleMouseMove(e) {
    if (!isDraggingRef.current) return
    handleSliderMove(e.clientX)
  }

  function handleMouseUp() {
    isDraggingRef.current = false
  }

  // Confirm Fix Handler
  function handleConfirm() {
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

  if (!activeComplaint) {
    return (
      <div className="panel-card" style={{ padding: 40, textAlign: 'center', background: '#fff' }}>
        <h3>No complaints found for verification.</h3>
        <button
          onClick={() => onNavigate('dashboard')}
          style={{ marginTop: 12, padding: '8px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6 }}
        >
          Return to Dashboard
        </button>
      </div>
    )
  }

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

        {/* Complaint Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>Inspecting Ticket:</span>
          <select
            value={activeComplaint.id}
            onChange={(e) => {
              const c = complaints.find((item) => item.id === e.target.value)
              if (c) onSelectComplaint(c)
              setActionDoneMessage(null)
              setIsDisputeOpen(false)
            }}
            className="ticket-inspect-select"
          >
            {complaints.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} ({c.status})
              </option>
            ))}
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
        {/* Ticket Header & View Switcher */}
        <div className="comparison-card-top">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="badge-id">
                {activeComplaint.id}
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                {activeComplaint.title}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 4 }}>
              Location: <strong>{activeComplaint.location.block}, {activeComplaint.location.street}</strong> ({activeComplaint.location.assetName})
            </div>
          </div>

          {/* Toggle comparison mode */}
          <div className="mode-toggle-group">
            <button
              onClick={() => setComparisonMode('slider')}
              className={`btn-mode-toggle ${comparisonMode === 'slider' ? 'active' : ''}`}
            >
              Interactive Slider
            </button>
            <button
              onClick={() => setComparisonMode('side-by-side')}
              className={`btn-mode-toggle ${comparisonMode === 'side-by-side' ? 'active' : ''}`}
            >
              Side-by-Side
            </button>
          </div>
        </div>

        {/* COMPARISON VIEW */}
        {comparisonMode === 'slider' ? (
          <div style={{ marginBottom: 24 }}>
            <div className="slider-labels-header">
              <span>◀ ORIGINAL REPORTED ISSUE (BEFORE)</span>
              <span>CONTRACTOR REPAIRED CONDITION (AFTER) ▶</span>
            </div>

            {/* Slider Container with useRef */}
            <div
              ref={sliderContainerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="slider-container"
            >
              {/* After Image (Background layer) */}
              <img
                src={afterPhoto}
                alt="Repaired Condition"
                className="slider-after-img"
              />
              <span className="slider-after-label">
                AFTER REPAIR
              </span>

              {/* Before Image (Clipped layer) */}
              <div
                className="slider-before-layer"
                style={{ width: `${sliderPosition}%` }}
              >
                <img
                  src={beforePhoto}
                  alt="Original Issue"
                  className="slider-before-img"
                  style={{ width: sliderContainerRef.current?.offsetWidth || '100%' }}
                />
                <span className="slider-before-label">
                  BEFORE REPAIR
                </span>
              </div>

              {/* Draggable Divider Handle */}
              <div
                className="slider-divider-line"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="slider-handle-knob">
                  ⇄
                </div>
              </div>
            </div>
            <div className="slider-instruction">
              Drag the center slider left or right to inspect the exact repair boundary
            </div>
          </div>
        ) : (
          /* Side by Side View */
          <div className="side-by-side-grid">
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
        )}

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
            RWA Verification Decision
          </h3>
          <p className="decision-desc">
            Please select whether the reported issue is satisfactorily resolved, or dispute the work to mandate contractor rework.
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
        </div>
      </div>
    </div>
  )
}
