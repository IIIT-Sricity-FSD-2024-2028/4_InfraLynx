import { useState, useMemo } from 'react'

export default function AssignedWorkOrders({
  jobs = [],
  onNavigate,
  onSelectJob,
}) {
  const [filter, setFilter] = useState('ALL') // ALL | ASSIGNED | IN_PROGRESS | COMPLETED | REOPENED
  const [searchQuery, setSearchQuery] = useState('')

  // Filter jobs based on selected status tab and search term
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Status filtering
      let matchesStatus = true
      if (filter === 'ASSIGNED') {
        matchesStatus = job.status === 'ASSIGNED' || job.status === 'WORK_ORDER_CREATED'
      } else if (filter === 'IN_PROGRESS') {
        matchesStatus = job.status === 'IN_PROGRESS' || job.status === 'AWAITING_DEPT_HEAD'
      } else if (filter === 'COMPLETED') {
        matchesStatus = job.status === 'COMPLETED' || job.status === 'PENDING_VERIFICATION' || job.status === 'CLOSED'
      } else if (filter === 'REOPENED') {
        matchesStatus = job.status === 'DISPUTED' || job.status === 'REVISION_REQUESTED'
      }

      if (!matchesStatus) return false

      // Search query filtering
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      const wo = (job.workOrderId || '').toLowerCase()
      const cmp = (job.id || '').toLowerCase()
      const title = (job.title || '').toLowerCase()
      const loc = `${job.location?.sector || ''} ${job.location?.block || ''} ${job.location?.assetName || ''}`.toLowerCase()

      return wo.includes(q) || cmp.includes(q) || title.includes(q) || loc.includes(q)
    })
  }, [jobs, filter, searchQuery])

  function getSlaInfo(deadlineIso) {
    if (!deadlineIso) return { text: 'N/A', isBreached: false, isUrgent: false }
    const deadline = new Date(deadlineIso).getTime()
    const now = Date.now()
    const diffHours = (deadline - now) / (1000 * 3600)

    if (diffHours <= 0) {
      return { text: `Breached`, isBreached: true, isUrgent: false }
    }
    const hours = Math.floor(diffHours)
    return {
      text: `${hours}h remaining`,
      isBreached: false,
      isUrgent: hours <= 6,
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            Assigned Work Orders
          </h1>
          <p style={{ color: 'var(--text-soft)', fontSize: 14, margin: '4px 0 0' }}>
            Browse and filter municipal work orders dispatched to your empanelled contractor team.
          </p>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: 280 }}>
          <input
            type="text"
            placeholder="Search WO ID, Asset, Location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 14px 9px 34px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line-strong)',
              fontSize: 13.5,
              outline: 'none',
              background: '#ffffff',
            }}
          />
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>
            🔍
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs (Screen 2 core requirement: Assigned, In Progress, Completed, Reopened) */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          borderBottom: '1px solid var(--line)',
          paddingBottom: 10,
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'ALL', label: 'All Jobs', count: jobs.length },
          {
            id: 'ASSIGNED',
            label: 'Assigned',
            count: jobs.filter((j) => j.status === 'ASSIGNED' || j.status === 'WORK_ORDER_CREATED').length,
          },
          {
            id: 'IN_PROGRESS',
            label: 'In Progress',
            count: jobs.filter((j) => j.status === 'IN_PROGRESS' || j.status === 'AWAITING_DEPT_HEAD').length,
          },
          {
            id: 'COMPLETED',
            label: 'Completed',
            count: jobs.filter((j) => j.status === 'COMPLETED' || j.status === 'PENDING_VERIFICATION' || j.status === 'CLOSED').length,
          },
          {
            id: 'REOPENED',
            label: 'Reopened / Disputed',
            count: jobs.filter((j) => j.status === 'DISPUTED' || j.status === 'REVISION_REQUESTED').length,
          },
        ].map((tab) => {
          const isActive = filter === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '7px 14px',
                borderRadius: 'var(--radius-sm)',
                border: isActive ? '1px solid #0284c7' : '1px solid var(--line)',
                background: isActive ? '#0284c7' : '#ffffff',
                color: isActive ? '#ffffff' : 'var(--text-soft)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--surface-muted)',
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  fontSize: 11,
                  padding: '1px 6px',
                  borderRadius: 10,
                }}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Work Orders List / Table */}
      {filteredJobs.length === 0 ? (
        <div className="contractor-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
          <h3 style={{ fontSize: 17, color: 'var(--text)', margin: '0 0 6px' }}>No work orders found</h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-soft)', maxWidth: 420, margin: '0 auto' }}>
            No work orders match the current filter &ldquo;{filter}&rdquo; {searchQuery ? `or search "${searchQuery}"` : ''}.
          </p>
          <button
            onClick={() => {
              setFilter('ALL')
              setSearchQuery('')
            }}
            className="btn-contractor-secondary"
            style={{ marginTop: 16 }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="contractor-table-wrap">
          <table className="contractor-table">
            <thead>
              <tr>
                <th>Work Order ID & Date</th>
                <th>Issue / Description</th>
                <th>Asset & Location</th>
                <th>Priority / Category</th>
                <th>SLA Deadline</th>
                <th>Current Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => {
                const sla = getSlaInfo(job.slaDeadline)
                return (
                  <tr key={job.id}>
                    <td>
                      <strong style={{ fontFamily: 'var(--font-mono)', color: '#0369a1', fontSize: 14 }}>
                        {job.workOrderId || job.id}
                      </strong>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        Ref: {job.id}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 2 }}>
                        {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recent'}
                      </div>
                    </td>

                    <td style={{ maxWidth: 300 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{job.title}</div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-soft)',
                          marginTop: 3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {job.description}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>
                        {job.location?.assetName || job.location?.assetId}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 1 }}>
                        {job.location?.sector}, {job.location?.block}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {job.location?.landmark || job.location?.street}
                      </div>
                    </td>

                    <td>
                      <div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background:
                              job.severity === 'Emergency'
                                ? '#fee2e2'
                                : job.severity === 'High'
                                ? '#ffedd5'
                                : '#f1f5f9',
                            color:
                              job.severity === 'Emergency'
                                ? '#b91c1c'
                                : job.severity === 'High'
                                ? '#c2410c'
                                : '#475569',
                          }}
                        >
                          {job.severity}
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 4 }}>
                        {job.category}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`sla-tag ${
                          sla.isBreached ? 'breached' : sla.isUrgent ? 'warning' : 'safe'
                        }`}
                      >
                        {sla.text}
                      </span>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                        Target: {new Date(job.slaDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`status-pill ${
                          job.status === 'ASSIGNED'
                            ? 'assigned'
                            : job.status === 'IN_PROGRESS'
                            ? 'progress'
                            : job.status === 'COMPLETED' || job.status === 'PENDING_VERIFICATION'
                            ? 'completed'
                            : job.status === 'DISPUTED'
                            ? 'disputed'
                            : job.status === 'REVISION_REQUESTED'
                            ? 'revision'
                            : 'awaiting'
                        }`}
                      >
                        {job.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {job.status === 'ASSIGNED' && (
                          <>
                            <button
                              onClick={() => {
                                onSelectJob(job)
                                onNavigate('inspection')
                              }}
                              className="btn-contractor-primary"
                              style={{ padding: '6px 10px', fontSize: 12 }}
                            >
                              Inspect Site →
                            </button>
                            <button
                              onClick={() => {
                                onSelectJob(job)
                                onNavigate('estimate')
                              }}
                              className="btn-contractor-secondary"
                              style={{ padding: '4px 8px', fontSize: 11 }}
                            >
                              Draft Estimate
                            </button>
                          </>
                        )}

                        {job.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => {
                              onSelectJob(job)
                              onNavigate('execution')
                            }}
                            className="btn-contractor-primary"
                            style={{ padding: '6px 10px', fontSize: 12, background: '#d97706' }}
                          >
                            Log Execution →
                          </button>
                        )}

                        {job.status === 'REVISION_REQUESTED' && (
                          <button
                            onClick={() => {
                              onSelectJob(job)
                              onNavigate('estimate')
                            }}
                            className="btn-contractor-primary"
                            style={{ padding: '6px 10px', fontSize: 12, background: '#ea580c' }}
                          >
                            Revise Estimate ⚠️
                          </button>
                        )}

                        {job.status === 'DISPUTED' && (
                          <button
                            onClick={() => {
                              onSelectJob(job)
                              onNavigate('rework')
                            }}
                            className="btn-contractor-primary"
                            style={{ padding: '6px 10px', fontSize: 12, background: '#dc2626' }}
                          >
                            Address Rework ⚠️
                          </button>
                        )}

                        {(job.status === 'COMPLETED' || job.status === 'PENDING_VERIFICATION') && (
                          <button
                            onClick={() => {
                              onSelectJob(job)
                              onNavigate('execution')
                            }}
                            className="btn-contractor-secondary"
                            style={{ padding: '6px 10px', fontSize: 12 }}
                          >
                            View Evidence
                          </button>
                        )}

                        {job.status === 'AWAITING_DEPT_HEAD' && (
                          <button
                            onClick={() => {
                              onSelectJob(job)
                              onNavigate('approvals')
                            }}
                            className="btn-contractor-secondary"
                            style={{ padding: '6px 10px', fontSize: 12 }}
                          >
                            Pending Approval
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
