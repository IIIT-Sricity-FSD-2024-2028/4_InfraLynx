import { useState, useEffect } from 'react';
import { deptHeadApi } from '../../services/api.js';

export default function ApprovalQueue({ onSelectComplaint }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState('REQUEST_REVISION'); // or 'REJECT'
  const [reason, setReason] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await deptHeadApi.getApprovals();
      setApprovals(res || []);
    } catch (err) {
      setError(err.message || 'Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (item) => {
    try {
      setProcessing(true);
      await deptHeadApi.processApproval(item.id, { action: 'APPROVE' });
      await fetchApprovals();
    } catch (err) {
      alert(err.message || 'Failed to approve estimate');
    } finally {
      setProcessing(false);
    }
  };

  const handleForwardCoo = async (item) => {
    try {
      setProcessing(true);
      await deptHeadApi.processApproval(item.id, { action: 'FORWARD_TO_COO' });
      await fetchApprovals();
    } catch (err) {
      alert(err.message || 'Failed to forward estimate');
    } finally {
      setProcessing(false);
    }
  };

  const handleNegativeAction = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    
    try {
      setProcessing(true);
      await deptHeadApi.processApproval(selectedItem.id, { 
        action: modalAction, 
        notes: reason 
      });
      setShowModal(false);
      setReason('');
      setSelectedItem(null);
      await fetchApprovals();
    } catch (err) {
      alert(err.message || `Failed to ${modalAction.toLowerCase()}`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-soft)' }}>
        <p>Loading approval queue...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '16px', margin: '16px' }}>
        <p style={{ color: '#b91c1c', fontWeight: 'bold' }}>Error loading queue</p>
        <p style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>{error}</p>
        <button onClick={fetchApprovals} className="button button-ghost" style={{ marginTop: '12px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 className="dept-page-title">Approval Queue</h2>
        <p style={{ color: 'var(--text-soft)', marginTop: '8px' }}>
          Review contractor estimates and work orders that require Department Head authorization (estimates &gt; ₹10,000).
        </p>
      </div>
      
      <div className="panel-card" style={{ overflow: 'hidden' }}>
        <table className="dept-list-table">
          <thead>
            <tr>
              <th>Work Order / ID</th>
              <th>Issue</th>
              <th>Contractor</th>
              <th>Estimate Amount</th>
              <th>SLA Deadline</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {approvals.map((item) => {
              const slaDeadline = new Date(item.slaDeadline).getTime();
              const now = new Date().getTime();
              const hoursRemaining = Math.max(0, Math.floor((slaDeadline - now) / (1000 * 60 * 60)));
              const slaText = hoursRemaining > 0 ? `${hoursRemaining}h remaining` : 'Breached';
              const slaColor = hoursRemaining > 0 ? (hoursRemaining < 24 ? '#d97706' : 'var(--text-soft)') : '#dc2626';

              return (
                <tr key={item.id}>
                  <td>
                    <strong>{item.workOrderCode || item.id}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: '500' }}>{item.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>{item.category} • {item.severity} Priority</div>
                  </td>
                  <td>{item.contractor?.name || 'Unassigned'}</td>
                  <td>
                    <strong>₹{Number(item.estimateAmount || 0).toLocaleString()}</strong>
                  </td>
                  <td style={{ color: slaColor, fontWeight: 'bold' }}>{slaText}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button 
                        className="button button-secondary" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => onSelectComplaint ? onSelectComplaint(item) : null}
                        disabled={processing}
                      >
                        Details
                      </button>
                      <button 
                        className="button button-primary" 
                        style={{ padding: '6px 12px', fontSize: '12px', background: '#10b981' }}
                        onClick={() => handleApprove(item)}
                        disabled={processing}
                      >
                        Approve
                      </button>
                      <button 
                        className="button button-secondary" 
                        style={{ padding: '6px 12px', fontSize: '12px', color: '#d97706', borderColor: '#d97706' }}
                        onClick={() => handleForwardCoo(item)}
                        disabled={processing}
                        title="Forward to COO if amount is large"
                      >
                        Fwd COO
                      </button>
                      <button 
                        className="button button-secondary" 
                        style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444', borderColor: '#ef4444' }}
                        onClick={() => { setSelectedItem(item); setModalAction('REQUEST_REVISION'); setShowModal(true); }}
                        disabled={processing}
                      >
                        Revise
                      </button>
                      <button 
                        className="button button-secondary" 
                        style={{ padding: '6px 12px', fontSize: '12px', color: '#b91c1c', borderColor: '#b91c1c', background: '#fef2f2' }}
                        onClick={() => { setSelectedItem(item); setModalAction('REJECT'); setShowModal(true); }}
                        disabled={processing}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {approvals.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-soft)' }}>
                  <div style={{ fontSize: '18px', marginBottom: '8px' }}>All caught up!</div>
                  <div style={{ fontSize: '14px' }}>No pending estimates require your approval at this time.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && selectedItem && (
        <div className="modal-overlay">
          <div className="panel-card modal-content" style={{ width: '500px', padding: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>{modalAction === 'REJECT' ? 'Reject Estimate' : 'Request Estimate Revision'}</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-soft)', marginBottom: '16px' }}>
              Provide a reason for {modalAction === 'REJECT' ? 'rejecting' : 'sending this estimate back to the contractor for'} work order <strong>{selectedItem.workOrderCode || selectedItem.id}</strong>.
            </p>
            <form onSubmit={handleNegativeAction}>
              <textarea 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={modalAction === 'REJECT' ? "e.g. Budget exceeded. Do not proceed." : "e.g. Please verify the quantity of cable required."}
                style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '8px', border: '1px solid var(--line-strong)', resize: 'none', marginBottom: '20px' }}
                required
              />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="button button-ghost"
                  onClick={() => {
                    setShowModal(false);
                    setReason('');
                    setSelectedItem(null);
                  }}
                  disabled={processing}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="button button-primary" style={{ background: '#ef4444' }}
                  disabled={processing || !reason.trim()}
                >
                  Confirm {modalAction === 'REJECT' ? 'Rejection' : 'Revision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
