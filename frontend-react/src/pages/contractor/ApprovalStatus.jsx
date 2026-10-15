import { useState, useMemo } from 'react'
import './styles/ApprovalStatus.css'

export default function ApprovalStatus({
  jobs = [],
  selectedJob,
  onSelectJob,
  onNavigate,
}) {
  const [filter, setFilter] = useState('ALL') // ALL | PENDING | APPROVED | REVISION

  // Jobs that have had estimates submitted or are in approval lifecycle
  const approvalJobs = useMemo(() => {
    return jobs.filter((j) => {
      const hasEstimate = !!j.estimate || j.status === 'AWAITING_DEPT_HEAD' || j.status === 'REVISION_REQUESTED' || j.status === 'IN_PROGRESS' || j.status === 'COMPLETED'
      if (!hasEstimate) return false

      if (filter === 'PENDING') return j.status === 'AWAITING_DEPT_HEAD'
      if (filter === 'APPROVED') return j.status === 'IN_PROGRESS' || j.status === 'COMPLETED' || j.estimate?.status === 'APPROVED'
      if (filter === 'REVISION') return j.status === 'REVISION_REQUESTED'

      return true
    })
  }, [jobs, filter])

  return (
    <div className="approval-status-root">
      {/* Header */}
      <div className="approval-header">
        <div>
          <button
            onClick={() => onNavigate('workorders')}
            className="btn-contractor-ghost approval-back-btn"
          >
            &larr; Back to Work Orders
          </button>
          <h1 className="approval-title">
            Estimate Approval Lifecycle Status
          </h1>
          <p className="approval-sub">
            Screen 5: Track municipal budget clearance, Department Head approvals, and required estimate revisions.
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={() => {
            const nextPending = jobs.find((j) => j.status === 'ASSIGNED')
            if (nextPending) onSelectJob(nextPending)
            onNavigate('estimate')
          }}
          className="btn-contractor-primary"
        >
          + Draft New Estimate
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="approval-filter-tabs">
        {[
          { id: 'ALL', label: 'All Submitted Estimates', count: approvalJobs.length },
          {
            id: 'PENDING',
            label: 'Pending Department Approval',
            count: jobs.filter((j) => j.status === 'AWAITING_DEPT_HEAD').length,
          },
          {
            id: 'APPROVED',
            label: 'Approved & Ready for Execution',
            count: jobs.filter((j) => j.status === 'IN_PROGRESS' || j.estimate?.status === 'APPROVED').length,
          },
          {
            id: 'REVISION',
            label: 'Revision Required',
            count: jobs.filter((j) => j.status === 'REVISION_REQUESTED').length,
          },
        ].map((tab) => {
          const isActive = filter === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`approval-tab-btn ${isActive ? 'active' : ''}`}
            >
              <span>{tab.label}</span>
              <span className="approval-tab-badge">
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Lifecycle Stage Progression Bar Graphic */}
      <div className="contractor-card approval-pipeline-card">
        <div className="approval-pipeline-label">
          STANDARD TIMS ESTIMATE CLEARANCE WORKFLOW
        </div>
        <div className="approval-pipeline-grid">
          {[
            { step: '1', title: 'Estimate Submitted', desc: 'Contractor generates AMC line items' },
            { step: '2', title: 'Pending Approval', desc: 'Dept Head budget review (> ₹10,000)' },
            { step: '3', title: 'Approved / Ready', desc: 'Authorized for immediate field repair' },
            { step: '4', title: 'Revision Option', desc: 'Adjustment request with specific notes' },
          ].map((st, i) => (
            <div key={i} className="approval-pipeline-step">
              <div className="approval-pipeline-step-head">
                <span className="approval-pipeline-step-num">
                  {st.step}
                </span>
                <strong className="approval-pipeline-step-title">{st.title}</strong>
              </div>
              <p className="approval-pipeline-step-desc">
                {st.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Estimates Cards List */}
      <div className="approval-list-container">
        {approvalJobs.map((job) => {
          const est = job.estimate
          const isAwaiting = job.status === 'AWAITING_DEPT_HEAD'
          const isRevision = job.status === 'REVISION_REQUESTED'
          const isApproved = job.status === 'IN_PROGRESS' || job.status === 'COMPLETED' || est?.status === 'APPROVED'

          const total = job.estimated_cost || 0
          const cardVariant = isRevision ? 'revision' : isAwaiting ? 'pending' : 'approved'

          return (
            <div
              key={job.id}
              className={`contractor-card approval-card ${cardVariant}`}
            >
              <div className="approval-card-top">
                <div>
                  <div className="approval-job-meta">
                    <span className="approval-job-code">
                      {job.work_order_number || job.id}
                    </span>
                    <span className="approval-job-category">• {job.category}</span>
                  </div>
                  <h3 className="approval-job-title">
                    {job.title}
                  </h3>
                  <div className="approval-job-location">
                    Location: {job.location?.sector}, {job.location?.block} • Asset: {job.location?.assetName}
                  </div>
                </div>

                <div className="approval-value-col">
                  <div className="approval-value-label">
                    ESTIMATE VALUE
                  </div>
                  <div className="approval-value-amount">
                    ₹{total.toLocaleString('en-IN')}
                  </div>
                  <div>
                    {isRevision && (
                      <span className="status-pill revision">Revision Required</span>
                    )}
                    {isAwaiting && (
                      <span className="status-pill awaiting">Pending Dept Approval</span>
                    )}
                    {isApproved && (
                      <span className="status-pill completed">Approved & Ready</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Estimate Items Summary */}
              {est?.items && est.items.length > 0 && (
                <div className="approval-items-box">
                  <span className="approval-items-label">
                    SUBMITTED AMC LINE ITEMS
                  </span>
                  <div className="approval-items-tags">
                    {est.items.map((it, idx) => (
                      <span key={idx} className="approval-item-tag">
                        • {it.service} ({it.qty} {it.unit} @ ₹{it.rate} = ₹{it.subtotal || it.qty * it.rate})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Revision Callout if revision was requested */}
              {isRevision && (
                <div className="approval-revision-box">
                  <div className="approval-revision-title">
                    <span>⚠️</span>
                    <span>Department Head Revision Instructions:</span>
                  </div>
                  <p className="approval-revision-text">
                    &ldquo;{est?.revisionReason || 'Please recalibrate the labour hours and re-align with standard rate card norms.'}&rdquo;
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="approval-actions">
                {isRevision && (
                  <button
                    onClick={() => {
                      onSelectJob(job)
                      onNavigate('estimate')
                    }}
                    className="btn-contractor-primary"
                    style={{ background: '#ea580c' }}
                  >
                    ✏️ Revise & Resubmit Estimate &rarr;
                  </button>
                )}

                {isApproved && (
                  <button
                    onClick={() => {
                      onSelectJob(job)
                      onNavigate('execution')
                    }}
                    className="btn-contractor-primary"
                    style={{ background: '#16a34a' }}
                  >
                    Proceed to Work Execution &rarr;
                  </button>
                )}

                {isAwaiting && (
                  <span className="approval-awaiting-hint">
                    Awaiting Department Head sign-off in municipal portal...
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
