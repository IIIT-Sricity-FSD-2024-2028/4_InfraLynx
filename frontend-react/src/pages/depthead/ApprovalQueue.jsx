import { useState } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'

export default function ApprovalQueue({ onSelectComplaint }) {
  const { complaints, updateComplaintStatus } = useTIMS()
  const [showRevisionModal, setShowRevisionModal] = useState(false)
  const [revisionReason, setRevisionReason] = useState('')
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  
  const pendingApprovals = complaints.filter(c => c.status === 'AWAITING_DEPT_HEAD')

  function handleApprove(complaint) {
    updateComplaintStatus(complaint.id, 'ASSIGNED', 'Estimate approved by Department Head.')
  }

  function handleRequestRevision(e) {
    e.preventDefault()
    if (!revisionReason.trim()) return
    updateComplaintStatus(selectedComplaint.id, 'REVISION_REQUESTED', `Revision Requested: ${revisionReason}`)
    setShowRevisionModal(false)
    setRevisionReason('')
    setSelectedComplaint(null)
  }

  return (
    <div>
      <h2 className="dept-page-title">Approval Queue</h2>
      <p style={{ color: 'var(--text-soft)', marginBottom: '24px' }}>
        Review contractor estimates and work orders that require Department Head approval (estimates &gt; ₹10,000).
      </p>
      
      <div className="panel-card" style={{ overflow: 'hidden' }}>
        <table className="dept-list-table">
          <thead>
            <tr>
              <th>Work Order / ID</th>
              <th>Issue</th>
              <th>Contractor</th>
              <th>Estimate Amount</th>
              <th>SLA Remaining</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingApprovals.map(c => {
              // mock SLA logic
              const slaDeadline = new Date(c.slaDeadline).getTime()
              const now = new Date().getTime()
              const hoursRemaining = Math.max(0, Math.floor((slaDeadline - now) / (1000 * 60 * 60)))
              const slaText = hoursRemaining > 0 ? `${hoursRemaining}h remaining` : 'Breached'
              const slaColor = hoursRemaining > 0 ? (hoursRemaining < 12 ? '#f59e0b' : 'var(--text-soft)') : '#ef4444'

              return (
                <tr key={c.id}>
                  <td>
                    <strong>{c.workOrderId || c.id}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</div>
                  </td>
                  <td>{c.title}</td>
                  <td>{c.assignedContractor?.name || 'Unassigned'}</td>
                  <td><strong>₹{Number(c.estimateAmount || 0).toLocaleString()}</strong></td>
                  <td style={{ color: slaColor, fontWeight: '600' }}>{slaText}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button 
                        className="button button-secondary" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => onSelectComplaint(c)}
                        title="View Full Details"
                      >
                        Review
                      </button>
                      <button 
                        className="button button-primary" 
                        style={{ padding: '6px 12px', fontSize: '12px', background: '#10b981' }}
                        onClick={() => handleApprove(c)}
                      >
                        Approve
                      </button>
                      <button 
                        className="button button-secondary" 
                        style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444', borderColor: '#ef4444' }}
                        onClick={() => { setSelectedComplaint(c); setShowRevisionModal(true); }}
                      >
                        Request Revision
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {pendingApprovals.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No items pending approval.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showRevisionModal && selectedComplaint && (
        <div className="modal-overlay">
          <div className="panel-card modal-content" style={{ width: '500px', padding: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Request Estimate Revision</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-soft)', marginBottom: '16px' }}>
              Provide a reason for sending this estimate back to the contractor for work order <strong>{selectedComplaint.workOrderId || selectedComplaint.id}</strong>.
            </p>
            <form onSubmit={handleRequestRevision}>
              <textarea 
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                placeholder="e.g. Please verify the quantity of cable required. 10m seems excessive."
                style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '8px', border: '1px solid var(--line-strong)', resize: 'none', marginBottom: '20px' }}
                required
              />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="button button-ghost" onClick={() => setShowRevisionModal(false)}>Cancel</button>
                <button type="submit" className="button button-primary" style={{ background: '#ef4444' }}>Send Revision Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
