import { useState, useMemo } from 'react'

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
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <button
            onClick={() => onNavigate('workorders')}
            className="btn-contractor-ghost"
            style={{ padding: 0, marginBottom: 4 }}
          >
            &larr; Back to Work Orders
          </button>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            Estimate Approval Lifecycle Status
          </h1>
          <p style={{ color: 'var(--text-soft)', fontSize: 13.5, margin: '2px 0 0' }}>
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

      {/* Lifecycle Stage Progression Bar Graphic */}
      <div
        className="contractor-card"
        style={{
          marginBottom: 24,
          padding: '18px 24px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
          STANDARD TIMS ESTIMATE CLEARANCE WORKFLOW
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            position: 'relative',
          }}
          className="stage-pipeline"
        >
          {[
            { step: '1', title: 'Estimate Submitted', desc: 'Contractor generates AMC line items' },
            { step: '2', title: 'Pending Approval', desc: 'Dept Head budget review (> ₹10,000)' },
            { step: '3', title: 'Approved / Ready', desc: 'Authorized for immediate field repair' },
            { step: '4', title: 'Revision Option', desc: 'Adjustment request with specific notes' },
          ].map((st, i) => (
            <div
              key={i}
              style={{
                background: '#ffffff',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                border: '1px solid var(--line)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#0284c7',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 800,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {st.step}
                </span>
                <strong style={{ fontSize: 13, color: 'var(--text)' }}>{st.title}</strong>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-soft)', lineHeight: 1.4 }}>
                {st.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Estimates Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {approvalJobs.map((job) => {
          const est = job.estimate
          const isAwaiting = job.status === 'AWAITING_DEPT_HEAD'
          const isRevision = job.status === 'REVISION_REQUESTED'
          const isApproved = job.status === 'IN_PROGRESS' || job.status === 'COMPLETED' || est?.status === 'APPROVED'

          const total = est?.total || job.estimateAmount || 0

          return (
            <div
              key={job.id}
              className="contractor-card"
              style={{
                borderLeft: isRevision
                  ? '5px solid #ea580c'
                  : isAwaiting
                  ? '5px solid #8b5cf6'
                  : '5px solid #16a34a',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13.5, color: '#0369a1' }}>
                      {job.workOrderId || job.id}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>• {job.category}</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: '4px 0 2px' }}>
                    {job.title}
                  </h3>
                  <div style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>
                    Location: {job.location?.sector}, {job.location?.block} • Asset: {job.location?.assetName}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    ESTIMATE VALUE
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
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
                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    marginBottom: 14,
                    fontSize: 12.5,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    SUBMITTED AMC LINE ITEMS
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                    {est.items.map((it, idx) => (
                      <span key={idx} style={{ color: 'var(--text)', fontWeight: 600 }}>
                        • {it.service} ({it.qty} {it.unit} @ ₹{it.rate} = ₹{it.subtotal || it.qty * it.rate})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Revision Callout if revision was requested */}
              {isRevision && (
                <div
                  style={{
                    background: '#fff7ed',
                    border: '1px solid #fdba74',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 16px',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: '#9a3412', fontSize: 13 }}>
                    <span>⚠️</span>
                    <span>Department Head Revision Instructions:</span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#7c2d12', lineHeight: 1.5 }}>
                    &ldquo;{est?.revisionReason || 'Please recalibrate the labour hours and re-align with standard rate card norms.'}&rdquo;
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
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
                  <span style={{ fontSize: 12, color: 'var(--text-soft)', fontStyle: 'italic' }}>
                    Awaiting Department Head sign-off in municipal portal...
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .stage-pipeline {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
