import { useState, useMemo } from 'react'
import './styles/AssignedWorkOrders.css'

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
    <div className="assigned-wo-root">
      {/* Header */}
      <div className="assigned-wo-toolbar">
        <div>
          <h1 className="assigned-wo-header-title">
            Assigned Work Orders
          </h1>
          <p className="assigned-wo-header-sub">
            Browse and filter municipal work orders dispatched to your empanelled contractor team.
          </p>
        </div>

        {/* Search Input */}
        <div className="assigned-wo-search-wrap">
          <input
            type="text"
            placeholder="Search WO ID, Asset, Location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="assigned-wo-search-input"
          />
          <span className="assigned-wo-search-icon">
            🔍
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="assigned-wo-search-clear"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs (Screen 2 core requirement: Assigned, In Progress, Completed, Reopened) */}
      <div className="assigned-wo-tabs">
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
              className={`assigned-wo-tab-btn ${isActive ? 'active' : ''}`}
            >
              <span>{tab.label}</span>
              <span className="assigned-wo-tab-count">
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Work Orders List / Table */}
      {filteredJobs.length === 0 ? (
        <div className="contractor-card assigned-wo-empty">
          <div className="assigned-wo-empty-icon">📭</div>
          <h3 className="assigned-wo-empty-title">No work orders found</h3>
          <p className="assigned-wo-empty-sub">
            No work orders match the current filter &ldquo;{filter}&rdquo; {searchQuery ? `or search "${searchQuery}"` : ''}.
          </p>
          <button
            onClick={() => {
              setFilter('ALL')
              setSearchQuery('')
            }}
            className="btn-contractor-secondary assigned-wo-clear-btn"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="contractor-table-wrap">
          <table className="contractor-table">
            <thead>
              <tr>
                <th>Work Order ID &amp; Date</th>
                <th>Issue / Description</th>
                <th>Asset &amp; Location</th>
                <th>Priority / Category</th>
                <th>Money Estimated &amp; Used</th>
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
                      <strong className="assigned-wo-code">
                        {job.workOrderId || job.id}
                      </strong>
                      <div className="assigned-wo-ref-sub">
                        Ref: {job.id}
                      </div>
                      <div className="assigned-wo-date-sub">
                        {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recent'}
                      </div>
                    </td>

                    <td className="assigned-wo-desc-cell">
                      <div className="assigned-wo-title">{job.title}</div>
                      <div className="assigned-wo-desc">
                        {job.description}
                      </div>
                    </td>

                    <td>
                      <div className="assigned-wo-asset-name">
                        {job.location?.assetName || job.location?.assetId}
                      </div>
                      <div className="assigned-wo-loc-sector">
                        {job.location?.sector}, {job.location?.block}
                      </div>
                      <div className="assigned-wo-loc-street">
                        {job.location?.landmark || job.location?.street}
                      </div>
                    </td>

                    <td>
                      <div>
                        <span className={`assigned-wo-severity-badge ${job.severity?.toLowerCase() || 'medium'}`}>
                          {job.severity}
                        </span>
                      </div>
                      <div className="assigned-wo-cat-lbl">
                        {job.category}
                      </div>
                    </td>

                    <td>
                      <div className="assigned-wo-money-est">
                        Est: ₹{(job.estimated_cost || 0).toLocaleString('en-IN')}
                      </div>
                      <div className={`assigned-wo-money-used ${(job.status === 'COMPLETED' || job.actual_cost) ? 'used' : 'pending'}`}>
                        Used: ₹{(job.actual_cost || (job.status === 'COMPLETED' ? (job.estimated_cost || 0) : 0)).toLocaleString('en-IN')}
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
                      <div className="assigned-wo-sla-target">
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
                      <div className="assigned-wo-actions-col">
                        {job.status === 'ASSIGNED' && (
                          <>
                            <button
                              onClick={() => {
                                onSelectJob(job)
                                onNavigate('inspection')
                              }}
                              className="btn-contractor-primary assigned-wo-action-btn"
                            >
                              Inspect Site →
                            </button>
                            <button
                              onClick={() => {
                                onSelectJob(job)
                                onNavigate('estimate')
                              }}
                              className="btn-contractor-secondary assigned-wo-action-subbtn"
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
                            className="btn-contractor-primary assigned-wo-action-btn amber"
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
                            className="btn-contractor-primary assigned-wo-action-btn orange"
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
                            className="btn-contractor-primary assigned-wo-action-btn red"
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
                            className="btn-contractor-secondary assigned-wo-action-btn"
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
                            className="btn-contractor-secondary assigned-wo-action-btn"
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
