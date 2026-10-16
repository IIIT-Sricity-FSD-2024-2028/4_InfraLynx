import { useMemo } from 'react'
import { getPhotoUrl, handlePhotoError } from '../../utils/photoUrl.js'
import './styles/ComplaintTracker.css'

const getStatusConfig = (userName = 'Dr. Arvind Swaminathan') => ({
  PENDING_VERIFICATION: {
    label: 'Pending Verification',
    badgeClass: 'status-pending-verification',
    desc: `Contractor has submitted work completion proof. Awaiting on-site inspection and sign-off by ${userName} (RWA Secretary).`,
  },
  REPORTED: {
    label: 'Reported',
    badgeClass: 'status-reported',
    desc: 'Complaint officially filed. Queued for Desk Clerk triage and domain confirmation.',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    badgeClass: 'status-review',
    desc: 'Desk Clerk is verifying domain alignment and spatial duplicate checks.',
  },
  VALIDATED: {
    label: 'Validated',
    badgeClass: 'status-validated',
    desc: 'Issue validated. Ready for contractor work order dispatch.',
  },
  WORK_ORDER_CREATED: {
    label: 'Work Order Created',
    badgeClass: 'status-work-order',
    desc: 'Work order dispatched to empaneled AMC contractor with target SLA schedule.',
  },
  ASSIGNED: {
    label: 'Assigned',
    badgeClass: 'status-assigned',
    desc: 'Assigned to field contractor team. Site inspection & estimate preparation underway.',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    badgeClass: 'status-in-progress',
    desc: 'Contractor crew is currently on-site executing necessary repairs and replacements.',
  },
  COMPLETED: {
    label: 'Completed',
    badgeClass: 'status-completed',
    desc: 'Field repair executed. Contractor has submitted final photo proof for sign-off.',
  },
  CLOSED: {
    label: 'Closed',
    badgeClass: 'status-closed',
    desc: `Work verified and approved on ground by ${userName}. Ticket officially closed.`,
  },
})

export default function ComplaintTracker({
  complaints = [],
  selectedComplaint,
  currentUser,
  onNavigate,
  onSelectComplaint,
}) {

  // Fallback to first complaint if none selected
  const activeComplaint = useMemo(() => {
    if (selectedComplaint) {
      return complaints.find((c) => c.id === selectedComplaint.id) || selectedComplaint
    }
    return complaints[0] || null
  }, [complaints, selectedComplaint])

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

  const statusConfig = getStatusConfig(currentUser?.name || 'Dr. Arvind Swaminathan')
  const prioClass = (activeComplaint.severity || '').toLowerCase() === 'emergency' ? 'emergency' : 'high'
  const normStatusKey = (activeComplaint.status || 'REPORTED').toUpperCase().replace(/[\s-]+/g, '_')
  const statusMeta = statusConfig[normStatusKey] || {
    label: activeComplaint.status.replace(/_/g, ' '),
    badgeClass: 'status-reported',
    desc: `Current status is ${activeComplaint.status.replace(/_/g, ' ')}.`,
  }
  const uniqueBeforePhotos = useMemo(() => {
    const raw = activeComplaint.beforePhotos || activeComplaint.before_photos || []
    return Array.from(new Set(raw.filter(Boolean)))
  }, [activeComplaint])

  const uniqueAfterPhotos = useMemo(() => {
    const raw = activeComplaint.afterPhotos || activeComplaint.after_photos || []
    return Array.from(new Set(raw.filter(Boolean)))
  }, [activeComplaint])

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
            {complaints.map((c) => {
              const ticketId = c.complaint_code || c.id
              const ticketTitle = c.title || `${c.category} (${c.status})`
              return (
                <option key={c.id} value={c.id}>
                  {ticketId} — {ticketTitle}
                </option>
              )
            })}
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
              The repair has been marked finished by {activeComplaint.assignedContractor?.name || 'Contractor'}. Review before & after evidence to sign off.
            </div>
          </div>
          <button
            onClick={() => onNavigate('verify')}
            className="btn-banner-verify"
          >
            Go to Verification →
          </button>
        </div>
      )}

      {/* Closed Confirmation Banner */}
      {activeComplaint.status === 'CLOSED' && (
        <div className="tracker-banner-closed">
          <span style={{ fontSize: 20 }}>✅</span>
          <div>
            <strong>Issue Officially Closed & Verified</strong> — Signed off by {activeComplaint.verification?.verifiedBy || `${currentUser?.name || 'Dr. Arvind Swaminathan'} (${currentUser?.title || 'RWA Secretary'})`} with {activeComplaint.verification?.rating || 5}/5 rating.
          </div>
        </div>
      )}

      {/* Clean Current Status Card (Replaces the 8-stage stepper) */}
      <div className="tracker-status-card">
        <div className="tracker-status-main">
          <div className="tracker-status-tag">Current Live Status</div>
          <div className="tracker-status-badge-row">
            <span className={`status-pill ${statusMeta.badgeClass}`}>
              <span className="status-dot-pulse" />
              {statusMeta.label}
            </span>
            <p className="tracker-status-desc">
              {statusMeta.desc}
            </p>
          </div>
        </div>

        <div className="tracker-status-sla">
          <div className="tracker-status-tag">Target Resolution SLA</div>
          <div className={`tracker-sla-badge ${slaInfo.status}`}>
            ⏱️ {slaInfo.text}
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
              <strong>{activeComplaint.category} ({activeComplaint.subcategory || activeComplaint.subCategory || ''})</strong>
            </div>

            <div>
              <span className="attr-label">SLA Target</span>
              <strong style={{ color: slaInfo.status === 'breached' ? 'var(--accent-red)' : 'inherit' }}>
                {slaInfo.text}
              </strong>
            </div>

            <div>
              <span className="attr-label">Sector / Block</span>
              <strong>{activeComplaint.sector || 'Sector 54'} • {activeComplaint.block || 'Block B'}</strong>
            </div>

            <div>
              <span className="attr-label">Street</span>
              <strong>{activeComplaint.street || 'Gulmohar Marg'}</strong>
            </div>

            <div>
              <span className="attr-label">Asset ID</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{activeComplaint.asset_id || 'ASSET-01'}</strong>
            </div>

            {(activeComplaint.assigned_contractor || activeComplaint.assignedContractor) && (
              <div>
                <span className="attr-label">Assigned Agency</span>
                <strong>
                  {(activeComplaint.assigned_contractor || activeComplaint.assignedContractor).name} {(activeComplaint.assigned_contractor || activeComplaint.assignedContractor).phone ? `(${(activeComplaint.assigned_contractor || activeComplaint.assignedContractor).phone})` : ''}
                </strong>
              </div>
            )}
          </div>

          {/* Photo Evidence */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {uniqueBeforePhotos.length > 0 && (
              <div>
                <span className="attr-label" style={{ marginBottom: 6 }}>
                  Citizen Site Photo
                </span>
                <div className="photo-preview-wrap">
                  {uniqueBeforePhotos.map((src, i) => (
                    <img
                      key={i}
                      src={getPhotoUrl(src)}
                      onError={handlePhotoError}
                      alt={`Before Proof ${i + 1}`}
                      className="photo-preview-img"
                    />
                  ))}
                </div>
              </div>
            )}

            {uniqueAfterPhotos.length > 0 && (
              <div>
                <span className="attr-label" style={{ marginBottom: 6 }}>
                  Resolution Evidence Photo
                </span>
                <div className="photo-preview-wrap">
                  {uniqueAfterPhotos.map((src, i) => (
                    <img
                      key={i}
                      src={getPhotoUrl(src)}
                      onError={handlePhotoError}
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
