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

export default function ComplaintTracker({ selectedComplaint, onNavigate, onSelectComplaint }) {
  const { complaints, updateComplaintStatus } = useTIMS()

  // Fallback to first complaint if none selected
  const activeComplaint = useMemo(() => {
    if (selectedComplaint) {
      return complaints.find((c) => c.id === selectedComplaint.id) || selectedComplaint
    }
    return complaints[0] || null
  }, [complaints, selectedComplaint])

  // Calculate current stage index in 8-stage lifecycle
  const currentStageIndex = useMemo(() => {
    if (!activeComplaint) return 0
    const s = activeComplaint.status
    if (s === 'CLOSED') return 8
    if (s === 'DISPUTED') return 7
    const idx = LIFECYCLE_STAGES.findIndex((stage) => stage.id === s)
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

          {/* Quick Demo Lifecycle Stepper for testing */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Demo Quick-Step:</span>
            <select
              value={activeComplaint.status}
              onChange={(e) => updateComplaintStatus(activeComplaint.id, e.target.value)}
              className="demo-step-select"
            >
              {LIFECYCLE_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
              <option value="CLOSED">Closed (Verified)</option>
              <option value="DISPUTED">Disputed</option>
            </select>
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
          </div>

          {/* Citizen Photo Evidence */}
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
        </div>

        {/* Right Column: Contractor & Work Order Status */}
        <div className="detail-card">
          <div className="detail-card-header">
            <span className="detail-card-tag">Contractor Execution & AMC</span>
            <h3 className="detail-card-title">
              {activeComplaint.assignedContractor ? activeComplaint.assignedContractor.name : 'Awaiting Assignment'}
            </h3>
            {activeComplaint.assignedContractor && (
              <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginTop: 4 }}>
                Lead: {activeComplaint.assignedContractor.lead} • Contact: {activeComplaint.assignedContractor.phone}
              </p>
            )}
          </div>

          {/* Execution details */}
          <div className="attributes-table">
            <div>
              <span className="attr-label">Work Order ID</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>
                {activeComplaint.workOrderId || 'WO-PENDING'}
              </strong>
            </div>

            <div>
              <span className="attr-label">AMC Contract Ref</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>
                {activeComplaint.assignedContractor?.amcContractId || 'Pending'}
              </strong>
            </div>

            <div>
              <span className="attr-label">Inspection Status</span>
              <strong>{activeComplaint.inspectionRemarks ? 'Inspected' : 'Pending Site Visit'}</strong>
            </div>

            <div>
              <span className="attr-label">AMC Estimate</span>
              <strong>{activeComplaint.estimateAmount ? `₹${activeComplaint.estimateAmount.toLocaleString()}` : 'Under Review'}</strong>
            </div>
          </div>

          {/* Site Inspection Notes */}
          {activeComplaint.inspectionRemarks && (
            <div className="inspection-box">
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>
                Contractor Site Inspection Remarks:
              </span>
              <p style={{ fontSize: 13, color: 'var(--text)', marginTop: 4 }}>
                "{activeComplaint.inspectionRemarks}"
              </p>
            </div>
          )}

          {/* Contractor Completion Remarks */}
          {activeComplaint.completionRemarks && (
            <div className="completion-box">
              <span style={{ fontSize: 11.5, color: '#166534', display: 'block', fontWeight: 600 }}>
                Completion Summary by Field Contractor:
              </span>
              <p style={{ fontSize: 13, color: '#14532d', marginTop: 4 }}>
                "{activeComplaint.completionRemarks}"
              </p>
            </div>
          )}

          {/* Contractor After Photos */}
          {activeComplaint.afterPhotos && activeComplaint.afterPhotos.length > 0 && (
            <div>
              <span className="attr-label" style={{ marginBottom: 6 }}>
                Contractor Completion Evidence Photo
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

      {/* Audit History Timeline */}
      <div className="audit-card">
        <h3 className="audit-title">
          Immutable TIMS Audit Log & Event Trail
        </h3>

        <div className="audit-list">
          {activeComplaint.history &&
            activeComplaint.history.map((event, idx) => (
              <div key={idx} className="audit-item">
                <div className="audit-dot" />
                <div style={{ flex: 1 }}>
                  <div className="audit-header-line">
                    <span className="audit-stage-pill">
                      {event.stage}
                    </span>
                    <strong style={{ color: 'var(--text)' }}>{event.actor}</strong>
                    <span className="audit-timestamp">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="audit-note">
                    {event.note}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
