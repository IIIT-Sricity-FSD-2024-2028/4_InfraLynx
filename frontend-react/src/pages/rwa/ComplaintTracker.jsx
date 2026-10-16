import { useMemo } from 'react'
import { getPhotoUrl, handlePhotoError } from '../../utils/photoUrl.js'
import './styles/ComplaintTracker.css'

const STATUS_MAP = {
  PENDING_VERIFICATION: {
    label: 'Pending Verification',
    badgeClass: 'status-pending-verification',
    getDesc: (user) => `Contractor has submitted work completion proof. Awaiting on-site inspection and sign-off by ${user} (RWA Secretary).`,
  },
  REPORTED: {
    label: 'Reported',
    badgeClass: 'status-reported',
    getDesc: () => 'Complaint officially filed. Queued for Desk Clerk triage and domain confirmation.',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    badgeClass: 'status-review',
    getDesc: () => 'Desk Clerk is verifying domain alignment and spatial duplicate checks.',
  },
  VALIDATED: {
    label: 'Validated',
    badgeClass: 'status-validated',
    getDesc: () => 'Issue validated. Ready for contractor work order dispatch.',
  },
  WORK_ORDER_CREATED: {
    label: 'Work Order Created',
    badgeClass: 'status-work-order',
    getDesc: () => 'Work order dispatched to empaneled AMC contractor with target SLA schedule.',
  },
  ASSIGNED: {
    label: 'Assigned',
    badgeClass: 'status-assigned',
    getDesc: () => 'Assigned to field contractor team. Site inspection & estimate preparation underway.',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    badgeClass: 'status-in-progress',
    getDesc: () => 'Contractor crew is currently on-site executing necessary repairs and replacements.',
  },
  COMPLETED: {
    label: 'Completed',
    badgeClass: 'status-completed',
    getDesc: () => 'Field repair executed. Contractor has submitted final photo proof for sign-off.',
  },
  CLOSED: {
    label: 'Closed',
    badgeClass: 'status-closed',
    getDesc: (user) => `Work verified and approved on ground by ${user}. Ticket officially closed.`,
  },
}

export default function ComplaintTracker({
  complaints = [],
  selectedComplaint,
  currentUser,
  onNavigate,
  onSelectComplaint,
}) {
  const activeComplaint = useMemo(() => {
    if (selectedComplaint) {
      return complaints.find((c) => c.id === selectedComplaint.id) || selectedComplaint
    }
    return complaints[0] || null
  }, [complaints, selectedComplaint])

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
      <div className="empty-tracker-card">
        <h3>No complaint selected to track.</h3>
        <button onClick={() => onNavigate('dashboard')} className="btn-result-return" style={{ marginTop: 12 }}>
          Go to Dashboard
        </button>
      </div>
    )
  }

  const userName = currentUser?.name || 'Dr. Arvind Swaminathan'
  const prioClass = (activeComplaint.severity || '').toLowerCase() === 'emergency' ? 'emergency' : 'high'
  const normKey = (activeComplaint.status || 'REPORTED').toUpperCase().replace(/[\s-]+/g, '_')
  const statusMeta = STATUS_MAP[normKey] || {
    label: activeComplaint.status.replace(/_/g, ' '),
    badgeClass: 'status-reported',
    getDesc: () => `Current status is ${activeComplaint.status.replace(/_/g, ' ')}.`,
  }

  const uniqueBeforePhotos = Array.from(
    new Set((activeComplaint.beforePhotos || activeComplaint.before_photos || []).filter(Boolean))
  )
  const uniqueAfterPhotos = Array.from(
    new Set((activeComplaint.afterPhotos || activeComplaint.after_photos || []).filter(Boolean))
  )

  const contractor = activeComplaint.assigned_contractor || activeComplaint.assignedContractor

  return (
    <div className="tracker-root">
      {/* Top Bar Navigation */}
      <div className="tracker-top-bar">
        <div>
          <button onClick={() => onNavigate('dashboard')} className="btn-back">
            ← Back to All Complaints
          </button>
          <div className="tracker-title-group">
            <h1 className="tracker-title">Ticket Tracker: {activeComplaint.id}</h1>
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
                {c.complaint_code || c.id} — {c.title || `${c.category} (${c.status})`}
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
              The repair has been marked finished by {contractor?.name || 'Contractor'}. Review before & after evidence to sign off.
            </div>
          </div>
          <button onClick={() => onNavigate('verify')} className="btn-banner-verify">
            Go to Verification →
          </button>
        </div>
      )}

      {/* Closed Confirmation Banner */}
      {activeComplaint.status === 'CLOSED' && (
        <div className="tracker-banner-closed">
          <span style={{ fontSize: 20 }}>✅</span>
          <div>
            <strong>Issue Officially Closed & Verified</strong> — Signed off by {activeComplaint.verification?.verifiedBy || `${userName} (${currentUser?.title || 'RWA Secretary'})`} with {activeComplaint.verification?.rating || 5}/5 rating.
          </div>
        </div>
      )}

      {/* Live Status Card */}
      <div className="tracker-status-card">
        <div className="tracker-status-main">
          <div className="tracker-status-tag">Current Live Status</div>
          <div className="tracker-status-badge-row">
            <span className={`status-pill ${statusMeta.badgeClass}`}>
              <span className="status-dot-pulse" />
              {statusMeta.label}
            </span>
            <p className="tracker-status-desc">{statusMeta.getDesc(userName)}</p>
          </div>
        </div>

        <div className="tracker-status-sla">
          <div className="tracker-status-tag">Target Resolution SLA</div>
          <div className={`tracker-sla-badge ${slaInfo.status}`}>⏱️ {slaInfo.text}</div>
        </div>
      </div>

      {/* Details Card */}
      <div className="detail-card">
        <div className="detail-card-header">
          <span className="detail-card-tag">Issue Details</span>
          <h3 className="detail-card-title">{activeComplaint.title}</h3>
          <p className="detail-card-desc">{activeComplaint.description}</p>
        </div>

        {/* Attributes Grid */}
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

          {contractor && (
            <div>
              <span className="attr-label">Assigned Agency</span>
              <strong>{contractor.name} {contractor.phone ? `(${contractor.phone})` : ''}</strong>
            </div>
          )}
        </div>

        {/* Photo Evidence */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {uniqueBeforePhotos.length > 0 && (
            <div>
              <span className="attr-label" style={{ marginBottom: 6 }}>Citizen Site Photo</span>
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
              <span className="attr-label" style={{ marginBottom: 6 }}>Resolution Evidence Photo</span>
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
  )
}
