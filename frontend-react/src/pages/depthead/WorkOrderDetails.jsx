import { useState, useEffect } from 'react';
import { deptHeadApi } from '../../services/api.js';

export default function WorkOrderDetails({ complaint, onBack }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState('REQUEST_REVISION'); // or 'REJECT'
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (complaint?.id) {
      fetchDetails();
    }
  }, [complaint]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await deptHeadApi.getWorkOrderById(complaint.id);
      setDetails(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setProcessing(true);
      await deptHeadApi.processApproval(details?.workOrder?.id || complaint.id, { action: 'APPROVE' });
      onBack();
    } catch (err) {
      alert(err.message || 'Failed to approve');
    } finally {
      setProcessing(false);
    }
  };

  const handleForwardCoo = async () => {
    try {
      setProcessing(true);
      await deptHeadApi.processApproval(details?.workOrder?.id || complaint.id, { action: 'FORWARD_TO_COO' });
      onBack();
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
      await deptHeadApi.processApproval(details?.workOrder?.id || complaint.id, { 
        action: modalAction, 
        notes: reason 
      });
      setShowModal(false);
      onBack();
    } catch (err) {
      alert(err.message || `Failed to ${modalAction.toLowerCase()}`);
    } finally {
      setProcessing(false);
    }
  };

  if (!complaint) {
    return (
      <div style={{ padding: '24px' }}>
        <button className="button button-ghost" onClick={onBack} style={{ marginBottom: '24px' }}>
          &larr; Back
        </button>
        <div style={{ padding: '48px', textAlign: 'center', background: 'var(--surface-muted)', borderRadius: '8px', color: 'var(--text-soft)' }}>
          No item selected.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <button className="button button-ghost" onClick={onBack} style={{ marginBottom: '24px' }}>
          &larr; Back
        </button>
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-soft)' }}>
          <p>Loading details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <button className="button button-ghost" onClick={onBack} style={{ marginBottom: '24px' }}>
          &larr; Back
        </button>
        <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '16px', borderRadius: '4px' }}>
          <p style={{ color: '#b91c1c', fontWeight: 'bold' }}>Error loading details</p>
          <p style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>{error}</p>
        </div>
      </div>
    );
  }

  const wo = details?.workOrder || complaint;
  const comp = details?.complaint || complaint;
  const contractor = details?.contractor || complaint.contractor;

  const amcItems = (wo.line_items && wo.line_items.length > 0)
    ? wo.line_items.map(it => ({
        item: it.description || it.service || it.item || 'AMC Service Item',
        qty: it.qty || it.quantity || 1,
        rate: it.rate || it.amcRate || 500,
        total: (it.qty || it.quantity || 1) * (it.rate || it.amcRate || 500),
      }))
    : [
        { item: 'Senior Electrical Technician / Wireman', qty: 2, rate: 500, total: 1000 },
        { item: 'Armoured 3-Core Copper Cable 16 sq.mm', qty: 10, rate: 150, total: 1500 },
        { item: 'General Labour (Semi-Skilled / Safety Assist)', qty: 3, rate: 300, total: 900 }
      ];
      
  const totalAmount = wo.estimate_amount || wo.estimateAmount || amcItems.reduce((acc, curr) => acc + curr.total, 0);
  const isAwaitingApproval = wo.status === 'AWAITING_DEPT_HEAD' || comp.status === 'AWAITING_DEPT_HEAD';

  return (
    <div>
      <button className="button button-ghost" onClick={onBack} style={{ marginBottom: '24px' }}>
        &larr; Back to List
      </button>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="dept-page-title" style={{ marginBottom: 0 }}>
            Details: {wo.work_order_code || wo.workOrderId || wo.id.substring(0, 8)}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
            <span className="badge-eyebrow" style={{ background: '#f3f4f6', color: '#374151' }}>
              {wo.status?.replace(/_/g, ' ') || 'Unknown'}
            </span>
            <span style={{ color: 'var(--text-soft)', fontSize: '13px' }}>
              {new Date(wo.created_at || wo.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
        
        {isAwaitingApproval && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="button button-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }}
              onClick={() => { setModalAction('REQUEST_REVISION'); setShowModal(true); }}
              disabled={processing}
            >
              Request Revision
            </button>
            <button 
              className="button button-secondary" style={{ color: '#d97706', borderColor: '#d97706' }}
              onClick={handleForwardCoo}
              disabled={processing}
            >
              Fwd COO
            </button>
            <button 
              className="button button-secondary" style={{ color: '#b91c1c', borderColor: '#b91c1c', background: '#fef2f2' }}
              onClick={() => { setModalAction('REJECT'); setShowModal(true); }}
              disabled={processing}
            >
              Reject
            </button>
            <button 
              className="button button-primary" style={{ background: '#10b981' }}
              onClick={handleApprove}
              disabled={processing}
            >
              Approve Estimate
            </button>
          </div>
        )}
      </div>

      <div className="dept-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="panel-card" style={{ padding: '24px' }}>
          <h4 style={{ marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px solid var(--line)', color: 'var(--text-main)' }}>Complaint Information</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-soft)', textTransform: 'uppercase' }}>Title</span>
              <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{comp.title || wo.title || 'Infrastructure Remediation'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-soft)', textTransform: 'uppercase' }}>Category</span>
                <span style={{ color: 'var(--text-main)' }}>{comp.category || wo.category}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-soft)', textTransform: 'uppercase' }}>Priority</span>
                <span style={{ color: 'var(--text-main)' }}>{comp.severity || wo.priority}</span>
              </div>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-soft)', textTransform: 'uppercase' }}>SLA Deadline</span>
              <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>
                {comp.slaDeadline || wo.sla_deadline ? new Date(comp.slaDeadline || wo.sla_deadline).toLocaleString() : 'N/A'}
              </span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-soft)', textTransform: 'uppercase' }}>Description</span>
              <p style={{ color: 'var(--text-soft)', marginTop: '4px', padding: '12px', background: 'var(--surface-muted)', borderRadius: '8px', fontSize: '13px' }}>
                {comp.description || wo.description}
              </p>
            </div>
            
            {(comp.beforePhotos || wo.beforePhotos) && (comp.beforePhotos?.length > 0 || wo.beforePhotos?.length > 0) && (
              <div style={{ marginTop: '8px' }}>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-soft)', textTransform: 'uppercase', marginBottom: '8px' }}>Reported Photo</span>
                <img 
                  src={(comp.beforePhotos || wo.beforePhotos)[0]} 
                  alt="Issue" 
                  style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--line)' }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="panel-card" style={{ padding: '24px' }}>
          <h4 style={{ marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px solid var(--line)', color: 'var(--text-main)' }}>Contractor & Estimate</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-soft)', textTransform: 'uppercase' }}>Assigned Contractor</span>
              <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{contractor?.name || contractor?.company_name || 'Assigned Contractor'}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-soft)', textTransform: 'uppercase' }}>Special Instructions / Remarks</span>
              <p style={{ color: 'var(--text-soft)', marginTop: '4px' }}>{wo.special_instructions || wo.approval_notes || 'Site inspected. Issue confirmed. Materials required as per AMC.'}</p>
            </div>
            
            <div style={{ marginTop: '24px' }}>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-soft)', textTransform: 'uppercase', marginBottom: '12px' }}>AMC Items Breakdown</span>
              <div style={{ overflow: 'hidden', border: '1px solid var(--line)', borderRadius: '12px' }}>
                <table className="dept-list-table">
                  <thead style={{ background: 'var(--surface-muted)' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-soft)' }}>Item</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--text-soft)' }}>Qty</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--text-soft)' }}>Rate</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--text-soft)' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amcItems.map((item, i) => (
                      <tr key={i}>
                        <td style={{ padding: '12px 16px', fontSize: '13px' }}>{item.item}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right', color: 'var(--text-soft)' }}>{item.qty}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right', color: 'var(--text-soft)' }}>₹{item.rate}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right', fontWeight: '600' }}>₹{item.total}</td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--surface-muted)' }}>
                      <td colSpan="3" style={{ padding: '16px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Grand Total</td>
                      <td style={{ padding: '16px', textAlign: 'right', fontSize: '18px', fontWeight: '900', color: 'var(--primary)' }}>₹{totalAmount.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dept-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '24px' }}>
        <div className="panel-card" style={{ padding: '24px' }}>
          <h4 style={{ marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px solid var(--line)', color: 'var(--text-main)' }}>Contractor Execution & Photos</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-soft)', textTransform: 'uppercase' }}>Inspection Findings</span>
              <p style={{ color: 'var(--text-main)', marginTop: '4px' }}>{wo.contractor_notes || wo.inspection_remarks || 'Inspection findings recorded by contractor.'}</p>
            </div>
            
            {(comp.afterPhotos || wo.afterPhotos || wo.completion_photos) && (comp.afterPhotos?.length > 0 || wo.afterPhotos?.length > 0 || wo.completion_photos?.length > 0) ? (
              <div style={{ marginTop: '8px' }}>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-soft)', textTransform: 'uppercase', marginBottom: '8px' }}>Completion Photo</span>
                <img 
                  src={(comp.afterPhotos || wo.afterPhotos || wo.completion_photos)[0]} 
                  alt="Completed Work" 
                  style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--line)' }}
                />
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--surface-muted)', borderRadius: '8px', color: 'var(--text-soft)' }}>
                No completion photos uploaded yet.
              </div>
            )}
          </div>
        </div>

        <div className="panel-card" style={{ padding: '24px' }}>
          <h4 style={{ marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px solid var(--line)', color: 'var(--text-main)' }}>RWA Verification & Dispute Status</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-soft)', textTransform: 'uppercase', marginBottom: '8px' }}>Verification Status</span>
              {comp.verifiedByRwa || comp.verificationStatus === 'VERIFIED' ? (
                <span className="badge-eyebrow" style={{ background: '#dcfce7', color: '#16a34a' }}>VERIFIED BY RWA</span>
              ) : comp.disputed || comp.verificationStatus === 'DISPUTED' ? (
                <span className="badge-eyebrow" style={{ background: '#fee2e2', color: '#dc2626' }}>DISPUTED BY RWA</span>
              ) : (
                <span className="badge-eyebrow" style={{ background: '#f3f4f6', color: '#6b7280' }}>PENDING VERIFICATION</span>
              )}
            </div>

            {(comp.disputed || comp.verificationStatus === 'DISPUTED') && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '8px' }}>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#b91c1c', textTransform: 'uppercase' }}>Dispute Reason</span>
                <p style={{ color: '#991b1b', marginTop: '4px', fontSize: '13px' }}>
                  {comp.disputeReason || 'RWA has flagged issues with the completed work. Contractor intervention required.'}
                </p>
              </div>
            )}
            
            {(comp.verifiedByRwa || comp.verificationStatus === 'VERIFIED') && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '8px' }}>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#15803d', textTransform: 'uppercase' }}>Verification Remarks</span>
                <p style={{ color: '#166534', marginTop: '4px', fontSize: '13px' }}>
                  {comp.verificationRemarks || 'Work verified by Resident Welfare Association successfully.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      {(comp.history && comp.history.length > 0) && (
        <div className="panel-card" style={{ padding: '24px', marginTop: '24px' }}>
          <h4 style={{ marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px solid var(--line)', color: 'var(--text-main)' }}>Approval & Action History</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {comp.history.map((hist, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ minWidth: '120px', fontSize: '12px', color: 'var(--text-soft)', marginTop: '4px' }}>
                  {new Date(hist.timestamp || hist.date).toLocaleString()}
                </div>
                <div style={{ flex: 1, background: 'var(--surface-muted)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{hist.stage || hist.action}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-soft)', fontWeight: 'bold' }}>{hist.actor || hist.user}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-soft)', margin: 0 }}>
                    {hist.note || hist.remarks || 'Status updated.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="panel-card modal-content" style={{ width: '500px', padding: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>{modalAction === 'REJECT' ? 'Reject Estimate' : 'Request Estimate Revision'}</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-soft)', marginBottom: '16px' }}>
              Provide a reason for {modalAction === 'REJECT' ? 'rejecting' : 'sending this estimate back to the contractor.'}
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
                  onClick={() => setShowModal(false)}
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
