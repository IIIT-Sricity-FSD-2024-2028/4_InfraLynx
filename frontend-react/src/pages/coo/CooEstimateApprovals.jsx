import React, { useState } from 'react';
import { cooApi } from '../../services/api.js';

export default function CooEstimateApprovals({ approvals, onRefresh, onOpenDossier }) {
  const [activeApproval, setActiveApproval] = useState(null);
  const [decisionAction, setDecisionAction] = useState('APPROVE'); // 'APPROVE' | 'REJECT' | 'REQUEST_REVISION'
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function openDecisionModal(item, action) {
    setActiveApproval(item);
    setDecisionAction(action);
    setDecisionRemarks(
      action === 'APPROVE'
        ? 'Capital expenditure verified against AMC Schedule of Rates and authorized.'
        : action === 'REQUEST_REVISION'
        ? 'Please revise labor line items and submit updated material estimates.'
        : 'Estimate rejected due to departmental budget allocation limits.'
    );
  }

  async function handleSubmitDecision(e) {
    e.preventDefault();
    if (!activeApproval) return;

    try {
      setSubmitting(true);
      await cooApi.processApproval(activeApproval.id, {
        action: decisionAction,
        remarks: decisionRemarks.trim(),
      });
      alert(`Estimate decision '${decisionAction}' recorded for ${activeApproval.workOrderNumber}!`);
      setActiveApproval(null);
      onRefresh();
    } catch (err) {
      alert(`Decision processing failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Banner */}
      <div className="coo-banner">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', background: '#fef3c7', borderRadius: 'var(--radius-full)', color: '#b45309', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
            ⚖️ Tier 3 Executive Governance
          </div>
          <h2 className="coo-banner-title">Major Capital & Estimate Approvals Board</h2>
          <p className="coo-banner-sub">
            Joint sign-off authority for high-value contractor estimates exceeding municipal thresholds (&gt; ₹10,000 INR).
          </p>
        </div>
        <span style={{ padding: '8px 14px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: 700 }}>
          {approvals.length} Awaiting Executive Decision
        </span>
      </div>

      {/* Approvals List Grid */}
      {approvals.length === 0 ? (
        <div className="coo-panel">
          <div className="coo-panel-body" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-soft)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
            <h3 style={{ margin: '0 0 6px', color: 'var(--text)' }}>All High-Value Estimates Cleared</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              No contractor estimates are currently pending Township COO joint sign-off.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {approvals.map((item) => (
            <div key={item.id} className="coo-panel" style={{ margin: 0 }}>
              <div className="coo-panel-header">
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--primary-darker)' }}>
                    {item.workOrderNumber}
                  </span>
                  <h3 style={{ margin: '2px 0 0', fontSize: '16px' }}>{item.title}</h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>Estimated Total</div>
                  <strong style={{ fontSize: '19px', color: 'var(--primary-darker)' }}>
                    ₹{item.estimatedCost.toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              <div className="coo-panel-body">
                {/* Meta details */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px', padding: '12px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-soft)', display: 'block' }}>Department</span>
                    <strong>{item.departmentName}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-soft)', display: 'block' }}>Contractor</span>
                    <strong>{item.contractorName}</strong> ({item.contractorContact})
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-soft)', display: 'block' }}>Department Head Status</span>
                    <span style={{ color: 'var(--primary-dark)', fontWeight: 700 }}>Recommended for COO Sign-Off ✓</span>
                  </div>
                </div>

                {/* Line Items Table */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Itemized AMC Rate Card Schedule
                  </div>
                  <div className="coo-table-wrapper">
                    <table className="coo-table" style={{ background: '#ffffff' }}>
                      <thead>
                        <tr>
                          <th>Item Description</th>
                          <th>Unit</th>
                          <th>Qty</th>
                          <th>Agreed AMC Rate</th>
                          <th style={{ textAlign: 'right' }}>Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.lineItems.map((li, idx) => (
                          <tr key={idx}>
                            <td><strong>{li.description}</strong></td>
                            <td>{li.unit}</td>
                            <td>{li.quantity || li.qty}</td>
                            <td>₹{Number(li.rate).toLocaleString('en-IN')}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>
                              ₹{Number(li.amount || li.rate * (li.quantity || li.qty)).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Dept Head Notes */}
                <div style={{ padding: '10px 14px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-sm)', fontSize: '12.5px', color: '#92400e', marginBottom: '18px' }}>
                  <strong>Department Head Recommendation:</strong> {item.deptHeadRecommendation}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
                  <button onClick={() => onOpenDossier(item.id)} className="btn-coo-secondary">
                    🔍 Full Dossier
                  </button>
                  <button onClick={() => openDecisionModal(item, 'REQUEST_REVISION')} className="btn-coo-secondary" style={{ color: '#b45309', borderColor: '#fde68a' }}>
                    🔄 Request Revision
                  </button>
                  <button onClick={() => openDecisionModal(item, 'REJECT')} className="btn-coo-danger">
                    ❌ Reject Estimate
                  </button>
                  <button onClick={() => openDecisionModal(item, 'APPROVE')} className="btn-coo-primary">
                    ✅ Authorize Capital Expenditure
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DECISION PROCESSING MODAL */}
      {activeApproval && (
        <div className="coo-modal-overlay" onClick={() => setActiveApproval(null)}>
          <div className="coo-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="coo-modal-header">
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-soft)', textTransform: 'uppercase', fontWeight: 800 }}>
                  Executive Action Decision
                </span>
                <h3 style={{ margin: 0, fontSize: '16px' }}>
                  {decisionAction === 'APPROVE' ? 'Authorize Estimate' : decisionAction === 'REJECT' ? 'Reject Estimate' : 'Request Contractor Revision'}: {activeApproval.workOrderNumber}
                </h3>
              </div>
              <button onClick={() => setActiveApproval(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSubmitDecision}>
              <div className="coo-modal-body">
                <p style={{ fontSize: '13.5px', color: 'var(--text-soft)', marginTop: 0 }}>
                  Amount: <strong>₹{activeApproval.estimatedCost.toLocaleString('en-IN')}</strong> · Vendor: <strong>{activeApproval.contractorName}</strong>
                </p>

                <div style={{ marginTop: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                    Executive Decision Remarks / Directive:
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={decisionRemarks}
                    onChange={(e) => setDecisionRemarks(e.target.value)}
                    className="coo-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div className="coo-modal-footer">
                <button type="button" onClick={() => setActiveApproval(null)} className="btn-coo-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={decisionAction === 'APPROVE' ? 'btn-coo-primary' : decisionAction === 'REJECT' ? 'btn-coo-danger' : 'btn-coo-secondary'}
                >
                  {submitting ? 'Processing...' : `Confirm ${decisionAction}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
