import { useState } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'

export default function EscalationManagement() {
  const { complaints, updateComplaintStatus } = useTIMS()
  
  // Mocks for escalated issues
  const escalatedIssues = complaints.filter(c => c.status === 'ESCALATED' || c.status === 'SLA_BREACHED' || c.status === 'DISPUTED')
  
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [escalationRemarks, setEscalationRemarks] = useState('')
  const [showModal, setShowModal] = useState(false)

  function handleEscalateToCOO(e) {
    e.preventDefault()
    if (!escalationRemarks.trim()) return
    updateComplaintStatus(selectedIssue.id, 'ESCALATED_TO_COO', `Escalated to COO: ${escalationRemarks}`)
    setShowModal(false)
    setSelectedIssue(null)
    setEscalationRemarks('')
  }

  function handleEscalateContractor(issue) {
    updateComplaintStatus(issue.id, 'CONTRACTOR_ESCALATED', 'Contractor issue escalated to procurement/legal.')
  }

  function handleRequestRevision(issue) {
    updateComplaintStatus(issue.id, 'REVISION_REQUESTED', 'Revision requested from Escalation Management.')
  }

  function handleAddRemarks(issue) {
    // In a real app this would add a note to history
    alert(`Remarks added for ${issue.id}`)
  }

  return (
    <div>
      <h2 className="dept-page-title">Escalation Management</h2>
      <p style={{ color: 'var(--text-soft)', marginBottom: '24px' }}>
        Manage SLA breaches, severe contractor delays, and escalated disputes.
      </p>

      <div className="panel-card" style={{ overflow: 'hidden' }}>
        <table className="dept-list-table">
          <thead>
            <tr>
              <th>Issue ID</th>
              <th>Status / Reason</th>
              <th>Contractor</th>
              <th>SLA Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {escalatedIssues.map(issue => (
              <tr key={issue.id}>
                <td>
                  <strong>{issue.id}</strong>
                  <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>{issue.title}</div>
                </td>
                <td>
                  <span className="badge-eyebrow badge-amber">{issue.status}</span>
                </td>
                <td>{issue.assignedContractor?.name || 'Unassigned'}</td>
                <td style={{ color: '#ef4444', fontWeight: '600' }}>Breached</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      className="button button-secondary" 
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleAddRemarks(issue)}
                    >
                      Add Remarks
                    </button>
                    <button 
                      className="button button-secondary" 
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleEscalateContractor(issue)}
                    >
                      Escalate Contractor
                    </button>
                    <button 
                      className="button button-secondary" 
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleRequestRevision(issue)}
                    >
                      Request Revision
                    </button>
                    <button 
                      className="button button-primary" 
                      style={{ padding: '6px 12px', fontSize: '12px', background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}
                      onClick={() => { setSelectedIssue(issue); setShowModal(true); }}
                    >
                      Escalate to COO
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {escalatedIssues.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No escalations currently require attention.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && selectedIssue && (
        <div className="modal-overlay">
          <div className="panel-card modal-content" style={{ width: '450px', padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', color: '#ef4444' }}>Escalate to COO</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-soft)', marginBottom: '20px' }}>
              You are escalating <strong>{selectedIssue.id}</strong> ({selectedIssue.title}) to the Chief Operating Officer. Please provide a clear justification.
            </p>
            <form onSubmit={handleEscalateToCOO}>
              <textarea 
                value={escalationRemarks}
                onChange={(e) => setEscalationRemarks(e.target.value)}
                placeholder="e.g. Contractor has failed to respond after 3 notices. SLA breached by 48 hours."
                style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '8px', border: '1px solid var(--line-strong)', resize: 'none', marginBottom: '20px' }}
                required
              />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="button button-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="button button-primary" style={{ background: '#ef4444' }}>Confirm Escalation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
