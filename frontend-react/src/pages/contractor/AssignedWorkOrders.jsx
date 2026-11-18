import { useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  selectAllContractorJobs,
  setSelectedJob,
  submitContractorBid,
  retractContractorBid,
} from '../../store/contractor/contractorSlice.js'
import { getSlaEvaluation } from '../../utils/slaUtils.js'
import './styles/AssignedWorkOrders.css'

export default function AssignedWorkOrders({
  jobs: propsJobs,
  onNavigate,
  onSelectJob,
}) {
  const dispatch = useDispatch()
  const reduxJobs = useSelector(selectAllContractorJobs)
  const jobs = propsJobs || reduxJobs || []

  const handleSelectJob = (job) => {
    dispatch(setSelectedJob(job))
    if (onSelectJob) onSelectJob(job)
  }

  const [filter, setFilter] = useState('ALL') // ALL | ASSIGNED | IN_PROGRESS | COMPLETED | REOPENED | TENDERS
  const [searchQuery, setSearchQuery] = useState('')

  // Bidding modal state
  const [selectedBiddingJob, setSelectedBiddingJob] = useState(null)
  const [bidAmount, setBidAmount] = useState('4500')
  const [bidDays, setBidDays] = useState('2')
  const [bidJustification, setBidJustification] = useState('Certified AMC rate with rapid mobilization')
  const [isSubmittingBid, setIsSubmittingBid] = useState(false)
  const [bidNotice, setBidNotice] = useState(null)

  // Filter jobs based on selected status tab and search term
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Status filtering
      let matchesStatus = true
      if (filter === 'TENDERS') {
        matchesStatus = Boolean(job.bidding_open)
      } else if (filter === 'ASSIGNED') {
        const hasEst = Boolean(job.estimate) || Number(job.estimateAmount || job.estimated_cost || 0) > 0 || ['AWAITING_DEPT_HEAD', 'ESTIMATE_SUBMITTED', 'PENDING_APPROVAL', 'AWAITING_COO', 'ESCALATED_TO_COO'].includes(job.status)
        matchesStatus = (job.status === 'ASSIGNED' || job.status === 'WORK_ORDER_CREATED') && !hasEst
      } else if (filter === 'PENDING_APPROVAL') {
        const hasEst = Boolean(job.estimate) || Number(job.estimateAmount || job.estimated_cost || 0) > 0
        matchesStatus = ['AWAITING_DEPT_HEAD', 'ESTIMATE_SUBMITTED', 'PENDING_APPROVAL', 'AWAITING_COO', 'ESCALATED_TO_COO'].includes(job.status) || (hasEst && job.status !== 'APPROVED' && job.status !== 'IN_PROGRESS' && job.status !== 'COMPLETED')
      } else if (filter === 'APPROVED') {
        matchesStatus = job.status === 'APPROVED'
      } else if (filter === 'IN_PROGRESS') {
        matchesStatus = job.status === 'IN_PROGRESS'
      } else if (filter === 'COMPLETED') {
        matchesStatus = job.status === 'COMPLETED' || job.status === 'PENDING_VERIFICATION' || job.status === 'CLOSED'
      } else if (filter === 'REOPENED') {
        matchesStatus = job.status === 'REVISION_REQUESTED'
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

  function getSlaInfo(deadlineIso, status, completedAt) {
    return getSlaEvaluation(deadlineIso, status, completedAt)
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

      {/* Filter Tabs (Assigned, Awaiting Approval, Approved, In Progress, Completed, Reopened) */}
      <div className="assigned-wo-tabs">
        {[
          { id: 'ALL', label: 'All Jobs', count: jobs.length },
          {
            id: 'TENDERS',
            label: '⚡ Open Tenders (Bidding)',
            count: jobs.filter((j) => Boolean(j.bidding_open)).length,
          },
          {
            id: 'ASSIGNED',
            label: 'Assigned',
            count: jobs.filter((j) => {
              const hasEst = Boolean(j.estimate) || Number(j.estimateAmount || j.estimated_cost || 0) > 0 || ['AWAITING_DEPT_HEAD', 'ESTIMATE_SUBMITTED', 'PENDING_APPROVAL', 'AWAITING_COO', 'ESCALATED_TO_COO'].includes(j.status)
              return (j.status === 'ASSIGNED' || j.status === 'WORK_ORDER_CREATED') && !hasEst
            }).length,
          },
          {
            id: 'PENDING_APPROVAL',
            label: 'Awaiting Dept Head',
            count: jobs.filter((j) => {
              const hasEst = Boolean(j.estimate) || Number(j.estimateAmount || j.estimated_cost || 0) > 0
              return ['AWAITING_DEPT_HEAD', 'ESTIMATE_SUBMITTED', 'PENDING_APPROVAL', 'AWAITING_COO', 'ESCALATED_TO_COO'].includes(j.status) || (hasEst && j.status !== 'APPROVED' && j.status !== 'IN_PROGRESS' && j.status !== 'COMPLETED')
            }).length,
          },
          {
            id: 'APPROVED',
            label: 'Approved (Ready to Start)',
            count: jobs.filter((j) => j.status === 'APPROVED').length,
          },
          {
            id: 'IN_PROGRESS',
            label: 'In Progress',
            count: jobs.filter((j) => j.status === 'IN_PROGRESS').length,
          },
          {
            id: 'COMPLETED',
            label: 'Completed',
            count: jobs.filter((j) => ['COMPLETED', 'PENDING_VERIFICATION', 'CLOSED'].includes(j.status)).length,
          },
          {
            id: 'REOPENED',
            label: 'Revision Requested',
            count: jobs.filter((j) => j.status === 'REVISION_REQUESTED').length,
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
                const sla = getSlaInfo(job.slaDeadline || job.sla_deadline, job.status, job.completedAt || job.completed_at)
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
                        {(job.status === 'ASSIGNED' || job.status === 'WORK_ORDER_CREATED') &&
                          !job.estimate &&
                          !(Number(job.estimateAmount || job.estimated_cost || 0) > 0) &&
                          !['AWAITING_DEPT_HEAD', 'ESTIMATE_SUBMITTED', 'PENDING_APPROVAL', 'AWAITING_COO', 'ESCALATED_TO_COO'].includes(job.status) && (
                          <>
                            <button
                              onClick={() => {
                                handleSelectJob(job)
                                onNavigate('inspection')
                              }}
                              className="btn-contractor-primary assigned-wo-action-btn"
                            >
                              Inspect Site →
                            </button>
                            <button
                              onClick={() => {
                                handleSelectJob(job)
                                onNavigate('estimate')
                              }}
                              className="btn-contractor-secondary assigned-wo-action-subbtn"
                            >
                              Draft Estimate
                            </button>
                          </>
                        )}

                        {job.status === 'APPROVED' && (
                          <button
                            onClick={() => {
                              handleSelectJob(job)
                              onNavigate('execution')
                            }}
                            className="btn-contractor-primary assigned-wo-action-btn"
                            style={{ background: '#059669', borderColor: '#059669' }}
                          >
                            Start Work 🚀
                          </button>
                        )}

                        {job.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => {
                              handleSelectJob(job)
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
                              handleSelectJob(job)
                              onNavigate('estimate')
                            }}
                            className="btn-contractor-primary assigned-wo-action-btn orange"
                          >
                            Revise Estimate ⚠️
                          </button>
                        )}


                        {(job.status === 'COMPLETED' || job.status === 'PENDING_VERIFICATION') && (
                          <button
                            onClick={() => {
                              handleSelectJob(job)
                              onNavigate('execution')
                            }}
                            className="btn-contractor-secondary assigned-wo-action-btn"
                          >
                            View Evidence
                          </button>
                        )}

                        {job.bidding_open && (
                          <button
                            onClick={() => {
                              setSelectedBiddingJob(job)
                              setBidNotice(null)
                            }}
                            className="btn-contractor-primary assigned-wo-action-btn"
                            style={{ background: '#7c3aed', borderColor: '#6d28d9' }}
                          >
                            Submit Tender Bid 📝
                          </button>
                        )}

                        {(['AWAITING_DEPT_HEAD', 'ESTIMATE_SUBMITTED', 'PENDING_APPROVAL', 'AWAITING_COO', 'ESCALATED_TO_COO'].includes(job.status) ||
                          ((Boolean(job.estimate) || Number(job.estimateAmount || job.estimated_cost || 0) > 0) &&
                            job.status !== 'APPROVED' &&
                            job.status !== 'IN_PROGRESS' &&
                            job.status !== 'COMPLETED')) && (
                          <button
                            onClick={() => {
                              handleSelectJob(job)
                              onNavigate('approvals')
                            }}
                            className="btn-contractor-secondary assigned-wo-action-btn"
                          >
                            Pending Approval ⏳
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

      {/* Contractor Bid Submission Modal */}
      {selectedBiddingJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: 12, padding: 24, maxWidth: 480, width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#1e293b' }}>
                📝 Submit Competitive Bid
              </h3>
              <button
                type="button"
                onClick={() => setSelectedBiddingJob(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 13, color: '#64748b', marginTop: 0 }}>
              Work Order: <strong>{selectedBiddingJob.workOrderId || selectedBiddingJob.id}</strong> — {selectedBiddingJob.title}
            </p>

            {bidNotice && (
              <div style={{ background: '#ecfdf5', color: '#065f46', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
                {bidNotice}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Bid Amount (₹) *
                </label>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                  placeholder="e.g. 4500"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Estimated Turnaround (Days) *
                </label>
                <input
                  type="number"
                  value={bidDays}
                  onChange={(e) => setBidDays(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                  placeholder="e.g. 2"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Technical Justification &amp; Methodology
                </label>
                <textarea
                  rows={3}
                  value={bidJustification}
                  onChange={(e) => setBidJustification(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  placeholder="Describe parts availability, team readiness, and quality guarantees..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={async () => {
                    const woId = selectedBiddingJob.backendWoId || selectedBiddingJob.workOrderId || selectedBiddingJob.id
                    try {
                      setIsSubmittingBid(true)
                      const result = await dispatch(retractContractorBid({ workOrderId: woId, contractorId: selectedBiddingJob.contractor_id || 'c0000000-0000-0000-0000-000000000001' })); if (retractContractorBid.rejected.match(result)) throw new Error(result.payload || 'Could not retract bid');
                      setBidNotice('Bid retracted successfully.')
                    } catch (err) {
                      alert('Could not retract bid: ' + err.message)
                    } finally {
                      setIsSubmittingBid(false)
                    }
                  }}
                  disabled={isSubmittingBid}
                  style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#64748b', padding: '8px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
                >
                  ↩️ Retract Bid
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const woId = selectedBiddingJob.backendWoId || selectedBiddingJob.workOrderId || selectedBiddingJob.id
                    try {
                      setIsSubmittingBid(true)
                      const result = await dispatch(submitContractorBid({ workOrderId: woId, bidData: { bid_amount: Number(bidAmount), estimated_days: Number(bidDays), justification: bidJustification } })); if (submitContractorBid.rejected.match(result)) throw new Error(result.payload || 'Failed to submit bid');
                      setBidNotice('✓ Bid submitted successfully! The algorithm will evaluate your cost and rating.')
                      setTimeout(() => setSelectedBiddingJob(null), 1500)
                    } catch (err) {
                      alert('Failed to submit bid: ' + err.message)
                    } finally {
                      setIsSubmittingBid(false)
                    }
                  }}
                  disabled={isSubmittingBid || !bidAmount}
                  style={{ background: '#7c3aed', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  {isSubmittingBid ? 'Submitting...' : 'Submit Quote 🚀'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
