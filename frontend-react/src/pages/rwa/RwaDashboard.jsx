import { useState, useMemo } from 'react'
import './styles/RwaDashboard.css'

const STATUS_BADGE_MAP = {
  PENDING_VERIFICATION: { label: 'Pending Verification', cls: 'pending', pulse: true },
  IN_PROGRESS: { label: 'In Progress', cls: 'in-progress' },
  WORK_ORDER_CREATED: { label: 'Work Order Created', cls: 'work-order' },
  ASSIGNED: { label: 'Assigned', cls: 'assigned' },
  VALIDATED: { label: 'Validated', cls: 'validated' },
  UNDER_REVIEW: { label: 'Under Review', cls: 'review' },
  REPORTED: { label: 'Reported', cls: 'reported' },
  CLOSED: { label: 'Closed & Verified', cls: 'closed' },
  VERIFIED: { label: 'Closed & Verified', cls: 'closed' },
}

export default function RwaDashboard({
  complaints = [],
  currentUser,
  onNavigate,
  onSelectComplaint,
  successNotice,
  onDismissNotice,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')

  const normStatus = (s) => (s || '').toUpperCase().replace(/[\s_-]+/g, '_')

  // Calculate metrics
  const stats = useMemo(() => {
    let open = 0, validated = 0, inProgress = 0, pendingVerification = 0, closed = 0

    complaints.forEach((c) => {
      const st = normStatus(c.status)
      if (['REPORTED', 'UNDER_REVIEW', 'VALIDATED'].includes(st)) open++
      if (st === 'VALIDATED') validated++
      if (['WORK_ORDER_CREATED', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_DEPT_HEAD'].includes(st)) inProgress++
      if (['PENDING_VERIFICATION', 'COMPLETED', 'WORK_COMPLETED'].includes(st)) pendingVerification++
      if (st === 'CLOSED' || st === 'VERIFIED') closed++
    })

    return { total: complaints.length, open, validated, inProgress, pendingVerification, closed }
  }, [complaints])

  // Filter complaints
  const filteredComplaints = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return complaints.filter((c) => {
      const loc = c.location || {}
      const asset = (loc.assetName || c.asset_name || '').toLowerCase()
      const street = (loc.street || c.street || '').toLowerCase()
      const title = (c.title || '').toLowerCase()
      const id = (c.id || '').toLowerCase()
      const code = (c.complaint_code || '').toLowerCase()

      const matchSearch = !q || id.includes(q) || code.includes(q) || title.includes(q) || asset.includes(q) || street.includes(q)
      const matchCat = selectedCategory === 'ALL' || (c.category || '').toUpperCase() === selectedCategory

      const st = normStatus(c.status)
      const matchStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'PENDING' && ['PENDING_VERIFICATION', 'COMPLETED', 'WORK_COMPLETED'].includes(st)) ||
        (selectedStatus === 'ACTIVE' && ['REPORTED', 'UNDER_REVIEW', 'VALIDATED', 'WORK_ORDER_CREATED', 'ASSIGNED', 'IN_PROGRESS'].includes(st)) ||
        (selectedStatus === 'CLOSED' && (st === 'CLOSED' || st === 'VERIFIED'))

      return matchSearch && matchCat && matchStatus
    })
  }, [complaints, searchQuery, selectedCategory, selectedStatus])

  // SLA time remaining calculation
  function getSlaStatus(deadlineStr) {
    if (!deadlineStr) return { text: 'N/A' }
    const diff = new Date(deadlineStr).getTime() - Date.now()
    if (diff <= 0) return { text: 'SLA Breached', isBreached: true }
    const hours = Math.floor(diff / (1000 * 3600))
    const minutes = Math.floor((diff % (1000 * 3600)) / (1000 * 60))
    if (hours < 6) return { text: `${hours}h ${minutes}m left`, isUrgent: true }
    return { text: `${hours}h remaining` }
  }

  function getStatusBadge(rawStatus) {
    const st = normStatus(rawStatus)
    return STATUS_BADGE_MAP[st] || { label: (rawStatus || '').replace(/_/g, ' '), cls: 'default' }
  }

  return (
    <div className="dashboard-root">
      {/* Newly Submitted Issue Success Banner */}
      {successNotice && (
        <div className="notice-banner">
          <div className="notice-content">
            <div className="notice-icon">✓</div>
            <div>
              <div className="notice-title">Complaint Logged Successfully: {successNotice.id}</div>
              <div className="notice-desc">{successNotice.message}</div>
            </div>
          </div>

          <div className="notice-actions">
            <button
              onClick={() => {
                const found = complaints.find((c) => c.id === successNotice.id)
                if (found) {
                  onSelectComplaint(found)
                  onNavigate('track')
                }
              }}
              className="notice-btn-track"
            >
              Track Live Status →
            </button>
            <button onClick={onDismissNotice} className="notice-btn-dismiss" title="Dismiss">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="dashboard-welcome">
        <div>
          <div className="welcome-badge-group">
            <span className="welcome-badge">{currentUser?.title || 'RWA Secretary'} Portal</span>
            <span className="welcome-jurisdiction">
              Township Jurisdiction: <strong>{currentUser?.sector || 'Sector 54'}</strong>
            </span>
          </div>
          <h1 className="welcome-title">Welcome, {currentUser?.name || 'Dr. Arvind Swaminathan'}</h1>
          <p className="welcome-subtitle">
            Sector 54 Residents Welfare Association — Monitor citizen infrastructure complaints, track contractor site work in real time, and verify completion before invoice clearance.
          </p>
        </div>

        <button
          id="btn-quick-report"
          onClick={() => onNavigate('report')}
          className="btn-report-quick"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Report New Issue
        </button>
      </div>

      {/* Verification Attention Alert */}
      {stats.pendingVerification > 0 && (
        <div className="attention-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="attention-icon">!</div>
            <div>
              <div className="attention-title">
                {stats.pendingVerification} Complaint{stats.pendingVerification > 1 ? 's' : ''} Awaiting Verification by {currentUser?.name || 'Dr. Arvind Swaminathan'}
              </div>
              <div className="attention-desc">
                Contractors have completed repair work and submitted before/after photo documentation. Please verify and confirm fix on behalf of Sector 54 RWA.
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              const pendingOne = complaints.find((c) =>
                ['PENDING_VERIFICATION', 'COMPLETED', 'WORK_COMPLETED'].includes(normStatus(c.status))
              )
              if (pendingOne) {
                onSelectComplaint(pendingOne)
                onNavigate('verify')
              }
            }}
            className="attention-btn"
          >
            Review Pending Fix →
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Complaints</div>
          <div className="metric-value">{stats.total}</div>
          <div className="metric-sub">Across all sectors</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Open / Validated</div>
          <div className="metric-value blue">{stats.open}</div>
          <div className="metric-sub">{stats.validated} validated for dispatch</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">In Progress</div>
          <div className="metric-value cyan">{stats.inProgress}</div>
          <div className="metric-sub">Contractor dispatched</div>
        </div>

        <div className={`metric-card ${stats.pendingVerification > 0 ? 'alert' : ''}`}>
          <div className="metric-label">Pending Verification</div>
          <div className="metric-value amber">{stats.pendingVerification}</div>
          <div className="metric-sub">Requires RWA sign-off</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Verified & Closed</div>
          <div className="metric-value green">{stats.closed}</div>
          <div className="metric-sub">Satisfactorily solved</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-toolbar">
        {/* Search */}
        <div className="search-box">
          <input
            id="input-rwa-search"
            type="text"
            placeholder="Search by ticket ID, asset, or street..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        {/* Category Filters */}
        <div className="filter-group">
          {['ALL', 'CIVIL', 'ELECTRICAL', 'WATER', 'HORTICULTURE'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`btn-filter-category ${selectedCategory === cat ? 'active' : ''}`}
            >
              {cat === 'ALL' ? 'All Categories' : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="filter-group">
          {[
            { id: 'ALL', label: 'All Status' },
            { id: 'ACTIVE', label: 'Active' },
            { id: 'PENDING', label: 'Pending Verification' },
            { id: 'CLOSED', label: 'Closed' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStatus(st.id)}
              className={`btn-filter-status ${selectedStatus === st.id ? 'active' : ''}`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Complaints List */}
      <div className="complaints-section">
        <div className="complaints-header">
          <h2 className="complaints-title">Complaints Register ({filteredComplaints.length})</h2>
          <span className="complaints-count-sub">
            Showing records for {currentUser?.name || 'Dr. Arvind Swaminathan'} ({currentUser?.title || 'RWA Secretary'})
          </span>
        </div>

        {filteredComplaints.length === 0 ? (
          <div className="empty-card">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No complaints found</div>
            <p className="empty-desc">Try adjusting your search criteria or report a new infrastructure issue.</p>
          </div>
        ) : (
          filteredComplaints.map((c) => {
            const badge = getStatusBadge(c.status)
            const sla = getSlaStatus(c.sla_deadline || c.slaDeadline)
            const catClass = (c.category || 'civil').toLowerCase()
            const sevClass = (c.severity || 'normal').toLowerCase()
            const isPending = ['PENDING_VERIFICATION', 'COMPLETED', 'WORK_COMPLETED'].includes(normStatus(c.status))
            const contractor = c.assigned_contractor || c.assignedContractor

            return (
              <div
                key={c.id}
                className={`complaint-card ${isPending ? 'pending-card' : ''}`}
              >
                {/* Header row */}
                <div className="card-top-row">
                  <div className="badge-cluster">
                    <span className="badge-id">{c.complaint_code || c.id}</span>
                    <span className={`badge-category ${catClass}`}>
                      {c.category} • {c.subcategory || c.subCategory || ''}
                    </span>
                    <span className={`badge-severity ${sevClass}`}>
                      {c.severity} Severity
                    </span>
                  </div>

                  {/* Status Pill */}
                  <span className={`badge-status ${badge.cls}`}>
                    {badge.pulse && <span className="badge-status-pulse" />}
                    {badge.label}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="card-title">{c.title}</h3>
                  <p className="card-desc">{c.description}</p>
                </div>

                {/* Details Footer Grid */}
                <div className="card-footer">
                  <div className="card-info-cluster">
                    <div>
                      📍 <strong>{c.block || 'Block'}, {c.street || 'Main St'}</strong> ({c.asset_id || c.location_details || 'Asset'})
                    </div>
                    <div>
                      ⏱️ SLA: <strong style={{ color: sla.isBreached ? 'var(--accent-red)' : sla.isUrgent ? 'var(--accent-amber)' : 'inherit' }}>{sla.text}</strong>
                    </div>
                    {contractor && (
                      <div>
                        🛠️ Contractor: <strong>{contractor.name}</strong>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="card-actions">
                    <button
                      onClick={() => {
                        onSelectComplaint(c)
                        onNavigate('track')
                      }}
                      className="btn-track"
                    >
                      Track Details →
                    </button>

                    {isPending && (
                      <button
                        onClick={() => {
                          onSelectComplaint(c)
                          onNavigate('verify')
                        }}
                        className="btn-verify-now"
                      >
                        Verify & Confirm Fix ✨
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
