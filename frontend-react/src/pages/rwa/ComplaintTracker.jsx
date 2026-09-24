import { useState, useMemo } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import './styles/ComplaintTracker.css'

const LIFECYCLE_STAGES = [
  { id: 'REPORTED', label: 'Reported', desc: 'RWA logs issue' },
  { id: 'UNDER REVIEW', label: 'Under Review', desc: 'Clerk triage' },
  { id: 'VALIDATED', label: 'Validated', desc: 'Domain confirmed' },
  { id: 'WORK ORDER CREATED', label: 'Work Order Created', desc: 'WO generated' },
  { id: 'ASSIGNED', label: 'Assigned', desc: 'Contractor dispatched' },
  { id: 'IN PROGRESS', label: 'In Progress', desc: 'Ground execution' },
  { id: 'COMPLETED', label: 'Completed', desc: 'Repair executed' },
  { id: 'PENDING_VERIFICATION', label: 'Pending Verification', desc: 'RWA inspection' },
]

const normStage = (s) => (s || '').toUpperCase().replace(/[\s_-]+/g, '')

const STAGE_RANK_MAP = {
  REPORTED: 0,
  UNDERREVIEW: 1,
  VALIDATED: 2,
  WORKORDERCREATED: 3,
  AWAITINGDEPTHEAD: 3,
  REVISIONREQUESTED: 3,
  ASSIGNED: 4,
  CONTRACTORESCALATED: 4,
  ESCALATEDTOCOO: 4,
  INPROGRESS: 5,
  COMPLETED: 6,
  PENDINGVERIFICATION: 7,
  CLOSED: 8,
  DISPUTED: 8,
}

export default function ComplaintTracker({ selectedComplaint, onNavigate, onSelectComplaint }) {
  const { complaints } = useTIMS()

  // Fallback to first complaint if none selected
  const activeComplaint = useMemo(() => {
    if (selectedComplaint) {
      return complaints.find((c) => c.id === selectedComplaint.id) || selectedComplaint
    }
    return complaints[0] || null
  }, [complaints, selectedComplaint])

  // Calculate current stage index in 8-stage lifecycle (supports both spaces and underscores)
  const currentStageIndex = useMemo(() => {
    if (!activeComplaint) return 0
    const s = normStage(activeComplaint.status)
    if (s === 'CLOSED') return 8
    if (s === 'DISPUTED') return 7
    if (s in STAGE_RANK_MAP) {
      return Math.min(STAGE_RANK_MAP[s], LIFECYCLE_STAGES.length - 1)
    }
    const idx = LIFECYCLE_STAGES.findIndex((stage) => normStage(stage.id) === s)
    return idx >= 0 ? idx : 0
  }, [activeComplaint])


  // Helper for SLA calculation
  const slaInfo = useMemo(() => {
    if (!activeComplaint?.slaDeadline) return { text: 'N/A', status: 'normal' }
    const diff = new Date(activeComplaint.slaDeadline).getTime() - Date.now()
    if (diff <= 0) return { text: 'Breached', status: 'breached' }
    const hours = Math.floor(diff / (1000 * 3600))
    const mins = Math.floor((diff % (1000 * 3600)) / (1000 * 60))
    if (hours < 6) return { text: `${hours}h ${mins}m remaining (Urgent)`, status: 'urgent' }
    return { text: `${hours}h ${mins}m remaining`, status: 'normal' }
  }, [activeComplaint?.slaDeadline])

  if (!activeComplaint) {
    return (
      <div className="panel-card" style={{ padding: 40, textAlign: 'center', background: '#fff' }}>
        <h3>No complaint selected to track.</h3>
        <button
          onClick={() => onNavigate('dashboard')}
          style={{ marginTop: 12, padding: '8px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6 }}
        >
          Go to Dashboard
        </button>
      </div>
    )
  }

  const prioClass = activeComplaint.severity === 'Emergency' ? 'emergency' : 'high'

  return (
    <div className="tracker-root">
      {/* Top Bar Navigation */}
      <div className="tracker-top-bar">
        <div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="btn-back"
          >
            ← Back to All Complaints
          </button>
          <div className="tracker-title-group">
            <h1 className="tracker-title">
              Ticket Tracker: {activeComplaint.id}
            </h1>
            <span className={`badge-priority ${prioClass}`}>
              {activeComplaint.severity} Priority
            </span>
          </div>
        </div>

        {/* Quick Ticket Switcher */}
        <div className="ticket-switcher">
          <span className="switcher-label">Switch Ticket:</span>
          <select
            value={activeComplaint.id}
            onChange={(e) => {
              const found = complaints.find((c) => c.id === e.target.value)
              if (found) onSelectComplaint(found)
            }}
            className="switcher-select"
          >
            {complaints.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} - {c.category} ({c.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Verification Notice Banner if Pending */}
      {activeComplaint.status === 'PENDING_VERIFICATION' && (
        <div className="tracker-banner-pending">
          <div>
            <div className="tracker-banner-title">
              ⚡ Action Required: Contractor Submitted Completion Proof
            </div>
            <div className="tracker-banner-desc">
              The repair has been marked finished by {activeComplaint.assignedContractor?.name || 'Contractor'}. Review before & after evidence to sign off or dispute.
            </div>
          </div>
          <button
            onClick={() => onNavigate('verify')}
            className="btn-banner-verify"
          >
            Go to Verification & Dispute →
          </button>
        </div>
      )}

      {/* Closed Confirmation Banner */}
      {activeComplaint.status === 'CLOSED' && (
        <div className="tracker-banner-closed">
          <span style={{ fontSize: 20 }}>✅</span>
          <div>
            <strong>Issue Officially Closed & Verified</strong> — Signed off by {activeComplaint.verification?.verifiedBy || 'RWA'} with {activeComplaint.verification?.rating || 5}/5 rating.
          </div>
        </div>
      )}

      {/* Disputed Banner */}
      {activeComplaint.status === 'DISPUTED' && (
        <div className="tracker-banner-disputed">
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <strong>Dispute Opened / Reopened for Rework</strong> — Reason: "{activeComplaint.dispute?.reason}". Contractor re-dispatched for corrective action.
          </div>
        </div>
      )}

      {/* Stepper Card */}
      <div className="stepper-card">
        <div className="stepper-header">
          <div>
            <h2 className="stepper-title">
              Official TIMS 8-Stage Lifecycle Progress
            </h2>
            <p className="stepper-subtitle">
              Synchronized in real-time across Desk Clerk, Contractor, and Department Head
            </p>
          </div>

          {/* Real Complaint Status Display */}
          <div className="stepper-live-status">
            <span className="stepper-live-label">Current Status:</span>
            <span className="stepper-live-badge">
              {activeComplaint.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Stepper Bar Container */}
        <div className="stepper-scroll-wrap">
          <div className="stepper-track">
            {LIFECYCLE_STAGES.map((stage, idx) => {
              const isPast = idx < currentStageIndex
              const isCurrent = idx === currentStageIndex

              return (
                <div key={stage.id} className="stepper-node-container">
                  {/* Connecting Line to next item */}
                  {idx < LIFECYCLE_STAGES.length - 1 && (
                    <div className={`stepper-line ${isPast ? 'completed' : ''}`} />
                  )}

                  {/* Node Circle */}
                  <div className={`stepper-node ${isPast ? 'completed' : isCurrent ? 'active' : ''}`}>
                    {isPast ? '✓' : idx + 1}
                  </div>

                  {/* Stage Label */}
                  <div className={`stepper-node-label ${isCurrent ? 'active' : isPast ? 'completed' : ''}`}>
                    {stage.label}
                  </div>

                  <div className="stepper-node-desc">
                    {stage.desc}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Details Section */}
      <div className="details-grid">
        {/* Left Column: Complaint & Location Information */}
        <div className="detail-card">
          <div className="detail-card-header">
            <span className="detail-card-tag">Issue Details</span>
            <h3 className="detail-card-title">
              {activeComplaint.title}
            </h3>
            <p className="detail-card-desc">
              {activeComplaint.description}
            </p>
          </div>

          {/* Grid attributes */}
          <div className="attributes-table">
            <div>
              <span className="attr-label">Category</span>
              <strong>{activeComplaint.category} ({activeComplaint.subCategory})</strong>
            </div>

            <div>
              <span className="attr-label">SLA Target</span>
              <strong style={{ color: slaInfo.status === 'breached' ? 'var(--accent-red)' : 'inherit' }}>
                {slaInfo.text}
              </strong>
            </div>

            <div>
              <span className="attr-label">Sector / Block</span>
              <strong>{activeComplaint.location.sector} • {activeComplaint.location.block}</strong>
            </div>

            <div>
              <span className="attr-label">Street</span>
              <strong>{activeComplaint.location.street}</strong>
            </div>

            <div>
              <span className="attr-label">Asset ID</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{activeComplaint.location.assetId}</strong>
            </div>

            <div>
              <span className="attr-label">GPS Township Pin</span>
              <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{activeComplaint.location.gps}</span>
            </div>

            {activeComplaint.assignedContractor && (
              <div>
                <span className="attr-label">Assigned Agency</span>
                <strong>
                  {activeComplaint.assignedContractor.name} {activeComplaint.assignedContractor.phone ? `(${activeComplaint.assignedContractor.phone})` : ''}
                </strong>
              </div>
            )}
          </div>

          {/* Photo Evidence */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <span className="attr-label" style={{ marginBottom: 6 }}>
                Citizen Site Photo
              </span>
              <div className="photo-preview-wrap">
                {activeComplaint.beforePhotos.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`Before Proof ${i + 1}`}
                    className="photo-preview-img"
                  />
                ))}
              </div>
            </div>

            {activeComplaint.afterPhotos && activeComplaint.afterPhotos.length > 0 && (
              <div>
                <span className="attr-label" style={{ marginBottom: 6 }}>
                  Resolution Evidence Photo
                </span>
                <div className="photo-preview-wrap">
                  {activeComplaint.afterPhotos.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`After Proof ${i + 1}`}
                      className="photo-preview-img after"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
