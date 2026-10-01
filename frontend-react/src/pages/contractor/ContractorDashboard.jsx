import { useMemo } from 'react'

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
    <div>
      {/* Toast Notice */}
      {successNotice && (
        <div
          style={{
            padding: '14px 18px',
            background: '#ecfdf5',
            border: '1.5px solid #34d399',
            borderRadius: 'var(--radius-md)',
            color: '#065f46',
            fontWeight: 600,
            fontSize: 14,
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <span>✓ {successNotice.message}</span>
          <button
            onClick={onDismissNotice}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#065f46',
              fontSize: 16,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Disputed / Rework Alert Banner */}
      {disputedJobs.length > 0 && (
        <div
          style={{
            background: '#fef2f2',
            border: '1.5px solid #f87171',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 800, color: '#991b1b', fontSize: 15 }}>
                Priority Action: {disputedJobs.length} RWA Disputed Job Requiring Corrective Rework
              </div>
              <div style={{ fontSize: 13, color: '#7f1d1d', marginTop: 2 }}>
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
            className="btn-contractor-primary"
            style={{ background: '#dc2626', borderColor: '#b91c1c', whiteSpace: 'nowrap' }}
          >
            Review Disputed Rework →
          </button>
        </div>
      )}

      {/* Header with Title & Quick Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            Field Contractor Operations Center
          </h1>
          <p style={{ color: 'var(--text-soft)', fontSize: 14, margin: '4px 0 0' }}>
            Inspect ground assets, generate AMC rate-card estimates, execute repairs, and submit verifiable photo evidence.
          </p>
        </div>

        {/* Quick actions button group */}
        <div style={{ display: 'flex', gap: 10 }}>
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
          style={{ cursor: 'pointer' }}
        >
          <div>
            <div className="contractor-stat-val">{assignedJobs.length}</div>
            <div className="contractor-stat-lbl">Assigned Jobs</div>
          </div>
          <div style={{ fontSize: 11.5, color: '#0284c7', marginTop: 8, fontWeight: 700 }}>
            Pending Inspection & Estimate →
          </div>
        </div>

        <div
          className="contractor-stat-tile amber"
          onClick={() => onNavigate('execution')}
          style={{ cursor: 'pointer' }}
        >
          <div>
            <div className="contractor-stat-val" style={{ color: '#d97706' }}>
              {inProgressJobs.length}
            </div>
            <div className="contractor-stat-lbl">Jobs in Progress</div>
          </div>
          <div style={{ fontSize: 11.5, color: '#d97706', marginTop: 8, fontWeight: 700 }}>
            Active Field Work →
          </div>
        </div>

        <div
          className="contractor-stat-tile green"
          onClick={() => onNavigate('workorders')}
          style={{ cursor: 'pointer' }}
        >
          <div>
            <div className="contractor-stat-val" style={{ color: '#16a34a' }}>
              {completedJobs.length}
            </div>
            <div className="contractor-stat-lbl">Completed Jobs</div>
          </div>
          <div style={{ fontSize: 11.5, color: '#16a34a', marginTop: 8, fontWeight: 700 }}>
            Awaiting RWA Sign-off / Closed →
          </div>
        </div>

        <div
          className="contractor-stat-tile red"
          onClick={() => onNavigate('rework')}
          style={{ cursor: 'pointer' }}
        >
          <div>
            <div className="contractor-stat-val" style={{ color: '#dc2626' }}>
              {disputedJobs.length}
            </div>
            <div className="contractor-stat-lbl">Reopened / Disputed Jobs</div>
          </div>
          <div style={{ fontSize: 11.5, color: '#dc2626', marginTop: 8, fontWeight: 700 }}>
            Requires Corrective Rework →
          </div>
        </div>

        <div
          className="contractor-stat-tile purple"
          onClick={() => onNavigate('approvals')}
          style={{ cursor: 'pointer' }}
        >
          <div>
            <div className="contractor-stat-val" style={{ color: '#7c3aed' }}>
              {revisionJobs.length}
            </div>
            <div className="contractor-stat-lbl">Revisions Requested</div>
          </div>
          <div style={{ fontSize: 11.5, color: '#7c3aed', marginTop: 8, fontWeight: 700 }}>
            Dept Head Feedback Pending →
          </div>
        </div>
      </div>

      {/* Active Work Orders & SLA Countdown Table */}
      <div className="contractor-card" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              Active Jobs & Real-Time SLA Countdown
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: '3px 0 0' }}>
              Real-time countdown timer tracking contractual service level agreement compliance.
            </p>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)' }}>
            Contractual SLA Rate: <strong style={{ color: '#16a34a' }}>98.4% Compliant</strong>
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
                      <strong style={{ fontFamily: 'var(--font-mono)', color: '#0369a1' }}>
                        {job.workOrderId || job.id}
                      </strong>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {job.location?.sector} • {job.location?.block}
                      </div>
                    </td>

                    <td style={{ maxWidth: 320 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{job.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                        Asset: {job.location?.assetName || job.location?.assetId}
                      </div>
                    </td>

                    <td>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '3px 8px',
                          background: '#f1f5f9',
                          borderRadius: 4,
                          color: '#334155',
                        }}
                      >
                        {job.category}
                      </span>
                    </td>

                    <td>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color:
                            job.severity === 'Emergency'
                              ? '#dc2626'
                              : job.severity === 'High'
                              ? '#ea580c'
                              : '#475569',
                        }}
                      >
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
                          className="btn-contractor-primary"
                          style={{ padding: '6px 12px', fontSize: 12 }}
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
                          className="btn-contractor-primary"
                          style={{ padding: '6px 12px', fontSize: 12, background: '#ea580c' }}
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
                          className="btn-contractor-primary"
                          style={{ padding: '6px 12px', fontSize: 12, background: '#d97706' }}
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
                          className="btn-contractor-primary"
                          style={{ padding: '6px 12px', fontSize: 12, background: '#dc2626' }}
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
                          className="btn-contractor-secondary"
                          style={{ padding: '6px 12px', fontSize: 12 }}
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
                          className="btn-contractor-secondary"
                          style={{ padding: '6px 12px', fontSize: 12 }}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <div className="contractor-card" style={{ background: '#f8fafc' }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px', color: '#0369a1' }}>
            Field AMC Guidelines
          </h4>
          <ul style={{ paddingLeft: 18, fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.6 }}>
            <li>Every estimate must reference contractual AMC Rate Cards (no open pricing).</li>
            <li>Estimates exceeding ₹10,000 threshold require Department Head sign-off.</li>
            <li>Before and After photographs are required for municipal invoice clearance.</li>
            <li>RWA holds dispute rights; rework must be addressed within 24 hours.</li>
          </ul>
        </div>

        <div className="contractor-card" style={{ background: '#f0fdf4' }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px', color: '#166534' }}>
            Contractor AMC Settlement Cycle
          </h4>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.6, margin: 0 }}>
            Completed jobs verified by RWA transition directly to Finance for 3-way invoice audit against rate cards. Fast sign-offs unlock immediate staged payment authorization.
          </p>
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => onNavigate('workorders')}
              className="btn-contractor-ghost"
              style={{ color: '#15803d', padding: 0 }}
            >
              Browse Assigned Work Orders &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
