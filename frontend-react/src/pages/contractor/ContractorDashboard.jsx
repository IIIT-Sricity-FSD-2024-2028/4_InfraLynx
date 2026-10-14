import { useMemo } from 'react'
import './styles/ContractorDashboard.css'

export default function ContractorDashboard({
  jobs = [],
  onNavigate,
  onSelectJob,
  successNotice,
  onDismissNotice,
}) {
  // Compute key metrics
  const assignedJobs = useMemo(
    () => jobs.filter((j) => j.status === 'ASSIGNED' || j.status === 'WORK_ORDER_CREATED'),
    [jobs]
  )
  const inProgressJobs = useMemo(
    () => jobs.filter((j) => j.status === 'IN_PROGRESS'),
    [jobs]
  )
  const completedJobs = useMemo(
    () => jobs.filter((j) => j.status === 'COMPLETED' || j.status === 'PENDING_VERIFICATION' || j.status === 'CLOSED'),
    [jobs]
  )
  const disputedJobs = useMemo(
    () => jobs.filter((j) => j.status === 'DISPUTED'),
    [jobs]
  )
  const revisionJobs = useMemo(
    () => jobs.filter((j) => j.status === 'REVISION_REQUESTED'),
    [jobs]
  )

  // Calculate SLA countdown status for each active job
  function getSlaInfo(deadlineIso) {
    if (!deadlineIso) return { text: 'No SLA', isBreached: false, isUrgent: false }
    const deadline = new Date(deadlineIso).getTime()
    const now = Date.now()
    const diffHours = (deadline - now) / (1000 * 3600)

    if (diffHours <= 0) {
      const breachedHoursAgo = Math.abs(Math.floor(diffHours))
      return { text: `Breached (${breachedHoursAgo}h ago)`, isBreached: true, isUrgent: false }
    }
    const hours = Math.floor(diffHours)
    const minutes = Math.floor((diffHours - hours) * 60)
    return {
      text: `${hours}h ${minutes}m left`,
      isBreached: false,
      isUrgent: hours <= 6,
    }
  }

  return (
    <div className="contractor-dashboard-root">
      {/* Toast Notice */}
      {successNotice && (
        <div className="contractor-success-toast">
          <span>✓ {successNotice.message}</span>
          <button
            onClick={onDismissNotice}
            className="contractor-toast-close"
          >
            ✕
          </button>
        </div>
      )}

      {/* Disputed / Rework Alert Banner */}
      {disputedJobs.length > 0 && (
        <div className="contractor-alert-banner">
          <div className="contractor-alert-content">
            <span className="contractor-alert-icon">⚠️</span>
            <div>
              <div className="contractor-alert-title">
                Priority Action: {disputedJobs.length} RWA Disputed Job Requiring Corrective Rework
              </div>
              <div className="contractor-alert-sub">
                Resident representative flagged defect or incomplete repair. Zero-cost rework mandate applies under AMC agreement.
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              if (disputedJobs[0]) {
                onSelectJob(disputedJobs[0])
                onNavigate('rework')
              }
            }}
            className="btn-contractor-primary contractor-alert-btn"
          >
            Review Disputed Rework →
          </button>
        </div>
      )}

      {/* Header with Title & Quick Info */}
      <div className="contractor-dash-header">
        <div>
          <h1 className="contractor-dash-title">
            Field Contractor Operations Center
          </h1>
          <p className="contractor-dash-sub">
            Inspect ground assets, generate AMC rate-card estimates, execute repairs, and submit verifiable photo evidence.
          </p>
        </div>

        {/* Quick actions button group */}
        <div className="contractor-quick-actions">
          <button
            onClick={() => onNavigate('workorders')}
            className="btn-contractor-secondary"
          >
            📋 All Work Orders ({jobs.length})
          </button>
          <button
            onClick={() => {
              const pendingInspection = jobs.find((j) => j.status === 'ASSIGNED' || !j.inspection)
              if (pendingInspection) onSelectJob(pendingInspection)
              onNavigate('inspection')
            }}
            className="btn-contractor-primary"
          >
            🔍 Start Inspection
          </button>
        </div>
      </div>

      {/* Metric Tiles (Screen 1 core requirement) */}
      <div className="contractor-grid-stats">
        <div
          className="contractor-stat-tile"
          onClick={() => onNavigate('workorders')}
        >
          <div>
            <div className="contractor-stat-val">{assignedJobs.length}</div>
            <div className="contractor-stat-lbl">Assigned Jobs</div>
          </div>
          <div className="contractor-stat-link blue">
            Pending Inspection &amp; Estimate →
          </div>
        </div>

        <div
          className="contractor-stat-tile amber"
          onClick={() => onNavigate('execution')}
        >
          <div>
            <div className="contractor-stat-val">
              {inProgressJobs.length}
            </div>
            <div className="contractor-stat-lbl">Jobs in Progress</div>
          </div>
          <div className="contractor-stat-link amber">
            Active Field Work →
          </div>
        </div>

        <div
          className="contractor-stat-tile green"
          onClick={() => onNavigate('workorders')}
        >
          <div>
            <div className="contractor-stat-val">
              {completedJobs.length}
            </div>
            <div className="contractor-stat-lbl">Completed Jobs</div>
          </div>
          <div className="contractor-stat-link green">
            Awaiting RWA Sign-off / Closed →
          </div>
        </div>

        <div
          className="contractor-stat-tile red"
          onClick={() => onNavigate('rework')}
        >
          <div>
            <div className="contractor-stat-val">
              {disputedJobs.length}
            </div>
            <div className="contractor-stat-lbl">Reopened / Disputed Jobs</div>
          </div>
          <div className="contractor-stat-link red">
            Requires Corrective Rework →
          </div>
        </div>

        <div
          className="contractor-stat-tile purple"
          onClick={() => onNavigate('approvals')}
        >
          <div>
            <div className="contractor-stat-val">
              {revisionJobs.length}
            </div>
            <div className="contractor-stat-lbl">Revisions Requested</div>
          </div>
          <div className="contractor-stat-link purple">
            Dept Head Feedback Pending →
          </div>
        </div>
      </div>

      {/* Active Work Orders & SLA Countdown Table */}
      <div className="contractor-card contractor-table-card">
        <div className="contractor-table-header-row">
          <div>
            <h3 className="contractor-table-title">
              Active Jobs &amp; Real-Time SLA Countdown
            </h3>
            <p className="contractor-table-sub">
              Real-time countdown timer tracking contractual service level agreement compliance.
            </p>
          </div>
          <span className="contractor-compliance-badge">
            Contractual SLA Rate: <strong className="contractor-compliance-val">98.4% Compliant</strong>
          </span>
        </div>

        <div className="contractor-table-wrap">
          <table className="contractor-table">
            <thead>
              <tr>
                <th>Work Order ID</th>
                <th>Issue / Infrastructure Asset</th>
                <th>Category</th>
                <th>Severity</th>
                <th>SLA Countdown</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const sla = getSlaInfo(job.slaDeadline)
                return (
                  <tr key={job.id}>
                    <td>
                      <strong className="contractor-wo-code">
                        {job.workOrderId || job.id}
                      </strong>
                      <div className="contractor-location-sub">
                        {job.location?.sector} • {job.location?.block}
                      </div>
                    </td>

                    <td className="contractor-asset-cell">
                      <div className="contractor-asset-title">{job.title}</div>
                      <div className="contractor-asset-sub">
                        Asset: {job.location?.assetName || job.location?.assetId}
                      </div>
                    </td>

                    <td>
                      <span className="contractor-category-tag">
                        {job.category}
                      </span>
                    </td>

                    <td>
                      <span className={`contractor-severity-dot ${job.severity?.toLowerCase() || 'medium'}`}>
                        ● {job.severity}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`sla-tag ${
                          sla.isBreached ? 'breached' : sla.isUrgent ? 'warning' : 'safe'
                        }`}
                      >
                        ⏱ {sla.text}
                      </span>
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
                      {job.status === 'ASSIGNED' && (
                        <button
                          onClick={() => {
                            onSelectJob(job)
                            onNavigate('inspection')
                          }}
                          className="btn-contractor-primary btn-table-action"
                        >
                          Inspect Site →
                        </button>
                      )}

                      {job.status === 'REVISION_REQUESTED' && (
                        <button
                          onClick={() => {
                            onSelectJob(job)
                            onNavigate('estimate')
                          }}
                          className="btn-contractor-primary btn-table-action orange"
                        >
                          Revise Estimate →
                        </button>
                      )}

                      {job.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => {
                            onSelectJob(job)
                            onNavigate('execution')
                          }}
                          className="btn-contractor-primary btn-table-action amber"
                        >
                          Execute Work →
                        </button>
                      )}

                      {job.status === 'DISPUTED' && (
                        <button
                          onClick={() => {
                            onSelectJob(job)
                            onNavigate('rework')
                          }}
                          className="btn-contractor-primary btn-table-action red"
                        >
                          Rework Details →
                        </button>
                      )}

                      {(job.status === 'COMPLETED' || job.status === 'PENDING_VERIFICATION') && (
                        <button
                          onClick={() => {
                            onSelectJob(job)
                            onNavigate('execution')
                          }}
                          className="btn-contractor-secondary btn-table-action"
                        >
                          View Evidence ✓
                        </button>
                      )}

                      {job.status === 'AWAITING_DEPT_HEAD' && (
                        <button
                          onClick={() => {
                            onSelectJob(job)
                            onNavigate('approvals')
                          }}
                          className="btn-contractor-secondary btn-table-action"
                        >
                          Approval Status ⏳
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Guidance Cards */}
      <div className="contractor-guidance-grid">
        <div className="contractor-card contractor-guidance-card blue">
          <h4 className="contractor-guidance-title blue">
            Field AMC Guidelines
          </h4>
          <ul className="contractor-guidance-list">
            <li>Every estimate must reference contractual AMC Rate Cards (no open pricing).</li>
            <li>Estimates exceeding ₹10,000 threshold require Department Head sign-off.</li>
            <li>Before and After photographs are required for municipal invoice clearance.</li>
            <li>RWA holds dispute rights; rework must be addressed within 24 hours.</li>
          </ul>
        </div>

        <div className="contractor-card contractor-guidance-card green">
          <h4 className="contractor-guidance-title green">
            Contractor AMC Settlement Cycle
          </h4>
          <p className="contractor-guidance-text">
            Completed jobs verified by RWA transition directly to Finance for 3-way invoice audit against rate cards. Fast sign-offs unlock immediate staged payment authorization.
          </p>
          <div>
            <button
              onClick={() => onNavigate('workorders')}
              className="btn-contractor-ghost contractor-guidance-btn"
            >
              Browse Assigned Work Orders &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
