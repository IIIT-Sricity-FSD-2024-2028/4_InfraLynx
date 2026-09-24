import { useState } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'

export default function WorkOrderDetails({ complaint, onBack }) {
  const { updateComplaintStatus } = useTIMS()
  const [showRevisionModal, setShowRevisionModal] = useState(false)
  const [revisionReason, setRevisionReason] = useState('')
  
  if (!complaint) {
    return (
      <div>
        <button className="button button-ghost" onClick={onBack}>&larr; Back</button>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No complaint selected.</div>
      </div>
    )
  }

  // Mock AMC Items (ideally this comes from the estimate object if it were structured)
  const amcItems = [
    { item: 'Electrician (Hourly)', qty: 2, rate: 500, total: 1000 },
    { item: 'Cable Replacement (m)', qty: 10, rate: 150, total: 1500 },
    { item: 'Diagnostic Fee', qty: 1, rate: 900, total: 900 }
  ]
  const mockTotal = 3400

  function handleApprove() {
    // Approve and send to IN_PROGRESS or ASSIGNED for execution
    updateComplaintStatus(complaint.id, 'ASSIGNED', 'Estimate approved by Department Head.')
    onBack()
  }

  function handleRequestRevision(e) {
    e.preventDefault()
    if (!revisionReason.trim()) return
    updateComplaintStatus(complaint.id, 'REVISION_REQUESTED', `Revision Requested: ${revisionReason}`)
    setShowRevisionModal(false)
    onBack()
  }

  return (
    <div>
      <button className="button button-ghost" onClick={onBack} style={{ marginBottom: '16px' }}>&larr; Back to Approvals</button>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="dept-page-title" style={{ marginBottom: 0 }}>Estimate Review: {complaint.workOrderId || complaint.id}</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="button button-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => setShowRevisionModal(true)}>
            Request Revision
          </button>
          <button className="button button-primary" onClick={handleApprove}>
            Approve Estimate
          </button>
        </div>
      </div>

      <div className="dept-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="panel-card" style={{ padding: '24px' }}>
          <h4 style={{ marginBottom: '16px' }}>Complaint Details</h4>
          <p><strong>Title:</strong> {complaint.title}</p>
          <p><strong>Category:</strong> {complaint.category} / {complaint.subCategory}</p>
          <p><strong>Location:</strong> {complaint.location?.sector}, {complaint.location?.block}</p>
          <p><strong>SLA Deadline:</strong> {complaint.slaDeadline ? new Date(complaint.slaDeadline).toLocaleString() : 'N/A'}</p>
          <p><strong>Description:</strong> {complaint.description}</p>
          
          {complaint.beforePhotos && complaint.beforePhotos.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <strong>Reported Photo:</strong>
              <div style={{ marginTop: '8px' }}>
                <img src={complaint.beforePhotos[0]} alt="Issue" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }} />
              </div>
            </div>
          )}
        </div>

        <div className="panel-card" style={{ padding: '24px' }}>
          <h4 style={{ marginBottom: '16px' }}>Contractor Estimate</h4>
          <p><strong>Contractor:</strong> {complaint.assignedContractor?.name || 'Assigned Contractor'}</p>
          <p><strong>Inspection Remarks:</strong> {complaint.inspectionRemarks || 'Site inspected. Issue confirmed. Materials required as per AMC.'}</p>
          <p><strong>Previous Estimates:</strong> None</p>
          
          <div style={{ marginTop: '20px' }}>
            <strong>AMC Items Breakdown</strong>
            <table className="dept-list-table" style={{ marginTop: '8px', border: '1px solid var(--line)', borderRadius: '8px', overflow: 'hidden' }}>
              <thead style={{ background: 'var(--surface-muted)' }}>
                <tr>
                  <th style={{ padding: '8px' }}>Item</th>
                  <th style={{ padding: '8px' }}>Qty</th>
                  <th style={{ padding: '8px' }}>Rate</th>
                  <th style={{ padding: '8px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {amcItems.map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px' }}>{item.item}</td>
                    <td style={{ padding: '8px' }}>{item.qty}</td>
                    <td style={{ padding: '8px' }}>₹{item.rate}</td>
                    <td style={{ padding: '8px' }}><strong>₹{item.total}</strong></td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--surface-muted)' }}>
                  <td colSpan="3" style={{ textAlign: 'right', padding: '12px' }}><strong>Grand Total</strong></td>
                  <td style={{ padding: '12px' }}><strong>₹{complaint.estimateAmount || mockTotal}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showRevisionModal && (
        <div className="modal-overlay">
          <div className="panel-card modal-content" style={{ width: '500px', padding: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Request Estimate Revision</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-soft)', marginBottom: '16px' }}>
              Provide a reason for sending this estimate back to the contractor. They will need to submit a revised estimate for approval.
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
