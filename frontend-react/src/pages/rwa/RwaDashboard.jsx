import { useState, useMemo } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import './styles/RwaDashboard.css'

export default function RwaDashboard({ onNavigate, onSelectComplaint, successNotice, onDismissNotice }) {
  const { complaints, currentUser } = useTIMS()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')

  // Calculate metrics
  const stats = useMemo(() => {
    const total = complaints.length
    const open = complaints.filter((c) =>
      ['REPORTED', 'UNDER REVIEW', 'VALIDATED'].includes(c.status)
    ).length
    const inProgress = complaints.filter((c) =>
      ['WORK ORDER CREATED', 'ASSIGNED', 'IN PROGRESS', 'COMPLETED'].includes(c.status)
    ).length
    const pendingVerification = complaints.filter(
      (c) => c.status === 'PENDING_VERIFICATION'
    ).length
    const closed = complaints.filter((c) => c.status === 'CLOSED').length
    const disputed = complaints.filter((c) => c.status === 'DISPUTED').length

    return { total, open, inProgress, pendingVerification, closed, disputed }
  }, [complaints])

  // Filter complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const matchSearch =
        !searchQuery ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.location.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.location.street.toLowerCase().includes(searchQuery.toLowerCase())

      const matchCategory =
        selectedCategory === 'ALL' || c.category.toUpperCase() === selectedCategory

      const matchStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'PENDING' && c.status === 'PENDING_VERIFICATION') ||
        (selectedStatus === 'ACTIVE' &&
          ['REPORTED', 'UNDER REVIEW', 'VALIDATED', 'WORK ORDER CREATED', 'ASSIGNED', 'IN PROGRESS'].includes(c.status)) ||
        (selectedStatus === 'CLOSED' && c.status === 'CLOSED') ||
        (selectedStatus === 'DISPUTED' && c.status === 'DISPUTED')

      return matchSearch && matchCategory && matchStatus
    })
  }, [complaints, searchQuery, selectedCategory, selectedStatus])

  // Helper for SLA time remaining
  function getSlaStatus(deadlineStr) {
    if (!deadlineStr) return { text: 'N/A', isUrgent: false }
    const diff = new Date(deadlineStr).getTime() - Date.now()
    if (diff <= 0) return { text: 'SLA Breached', isBreached: true }
    const hours = Math.floor(diff / (1000 * 3600))
    const minutes = Math.floor((diff % (1000 * 3600)) / (1000 * 60))
    if (hours < 6) {
      return { text: `${hours}h ${minutes}m left`, isUrgent: true }
    }
    return { text: `${hours}h remaining`, isNormal: true }
  }

  // Status style helper
  function getStatusBadge(status) {
    switch (status) {
      case 'PENDING_VERIFICATION':
        return {
          bg: '#fef3c7',
          color: '#92400e',
          border: '#fde68a',
          label: 'Pending Verification',
          pulse: true,
        }
      case 'IN PROGRESS':
        return { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd', label: 'In Progress' }
      case 'REPORTED':
        return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', label: 'Reported' }
      case 'CLOSED':
        return { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', label: 'Closed & Verified' }
      case 'DISPUTED':
        return { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', label: 'Disputed / Reopened' }
      default:
        return { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb', label: status.replace(/_/g, ' ') }
    }
  }

  return (
    <div className="dashboard-root">
      {/* Newly Submitted Issue Success Banner */}
      {successNotice && (
        <div className="notice-banner">
          <div className="notice-content">
            <div className="notice-icon">✓</div>
            <div>
              <div className="notice-title">
                Complaint Logged Successfully: {successNotice.id}
              </div>
              <div className="notice-desc">
                {successNotice.message}
              </div>
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
            <button
              onClick={onDismissNotice}
              className="notice-btn-dismiss"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Welcome Banner & Quick Action */}
      <div className="dashboard-welcome">
        <div>
          <div className="welcome-badge-group">
            <span className="welcome-badge">
              RWA Portal
            </span>
            <span className="welcome-jurisdiction">
              Township Jurisdiction: <strong>{currentUser.sector}</strong>
            </span>
          </div>
          <h1 className="welcome-title">
            RWA Infrastructure Overview
          </h1>
          <p className="welcome-subtitle">
            Monitor citizen infrastructure complaints, track contractor site work in real time, and verify completion before invoice clearance.
          </p>
        </div>

        <button
          id="btn-quick-report"
          onClick={() => onNavigate('report')}
          className="btn-report-quick"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Report New Issue
        </button>
      </div>

      {/* Verification Attention Alert if any pending */}
      {stats.pendingVerification > 0 && (
        <div className="attention-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="attention-icon">!</div>
            <div>
              <div className="attention-title">
                {stats.pendingVerification} Complaint{stats.pendingVerification > 1 ? 's' : ''} Awaiting RWA Verification
              </div>
              <div className="attention-desc">
                Contractors have completed repair work and submitted before/after photo documentation. Please verify and confirm fix.
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              const pendingOne = complaints.find((c) => c.status === 'PENDING_VERIFICATION')
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
          <div className="metric-label">Open / Reported</div>
          <div className="metric-value blue">{stats.open}</div>
          <div className="metric-sub">Under clerk review</div>
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
          <svg
            className="search-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>

        {/* Category Filters */}
        <div className="filter-group">
          {['ALL', 'CIVIL', 'ELECTRICAL', 'WATER'].map((cat) => (
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
          <h2 className="complaints-title">
            Complaints Register ({filteredComplaints.length})
          </h2>
          <span className="complaints-count-sub">
            Showing records for {currentUser.name}
          </span>
        </div>

        {filteredComplaints.length === 0 ? (
          <div className="empty-card">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No complaints found</div>
            <p className="empty-desc">
              Try adjusting your search criteria or report a new infrastructure issue.
            </p>
          </div>
        ) : (
          filteredComplaints.map((c) => {
            const statusBadge = getStatusBadge(c.status)
            const sla = getSlaStatus(c.slaDeadline)

            const catClass = c.category === 'Electrical' ? 'electrical' : c.category === 'Water' ? 'water' : 'civil'
            const sevClass = c.severity === 'Emergency' ? 'emergency' : c.severity === 'High' ? 'high' : 'normal'

            return (
              <div
                key={c.id}
                className={`complaint-card ${c.status === 'PENDING_VERIFICATION' ? 'pending-card' : ''}`}
              >
                {/* Header row */}
                <div className="card-top-row">
                  <div className="badge-cluster">
                    <span className="badge-id">
                      {c.id}
                    </span>
                    <span className={`badge-category ${catClass}`}>
                      {c.category} • {c.subCategory}
                    </span>
                    <span className={`badge-severity ${sevClass}`}>
                      {c.severity} Severity
                    </span>
                  </div>

                  {/* Status Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        background: statusBadge.bg,
                        color: statusBadge.color,
                        border: `1px solid ${statusBadge.border}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {statusBadge.pulse && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#d97706',
                            display: 'inline-block',
                          }}
                        />
                      )}
                      {statusBadge.label}
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="card-title">
                    {c.title}
                  </h3>
                  <p className="card-desc">
                    {c.description}
                  </p>
                </div>

                {/* Details Footer Grid */}
                <div className="card-footer">
                  <div className="card-info-cluster">
                    <div>
                      📍 <strong>{c.location.block}, {c.location.street}</strong> ({c.location.assetName})
                    </div>
                    <div>
                      ⏱️ SLA: <strong style={{ color: sla.isBreached ? 'var(--accent-red)' : sla.isUrgent ? 'var(--accent-amber)' : 'inherit' }}>{sla.text}</strong>
                    </div>
                    {c.assignedContractor && (
                      <div>
                        🛠️ Contractor: <strong>{c.assignedContractor.name}</strong>
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

                    {c.status === 'PENDING_VERIFICATION' && (
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
