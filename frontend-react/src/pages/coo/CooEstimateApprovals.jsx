import { useState } from 'react';
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
          <div className="coo-banner-eyebrow amber">
            ⚖️ Tier 3 Executive Governance
          </div>
          <h2 className="coo-banner-title">Major Capital & Estimate Approvals Board</h2>
          <p className="coo-banner-sub">
            Joint sign-off authority for high-value contractor estimates exceeding municipal thresholds (&gt; ₹10,000 INR).
          </p>
        </div>
        <span className="coo-badge-pill">
          {approvals.length} Awaiting Executive Decision
        </span>
      </div>

      {/* Approvals List Grid */}
      {approvals.length === 0 ? (
        <div className="coo-panel">
          <div className="coo-panel-body coo-cleared-box">
            <div className="coo-cleared-emoji">🎉</div>
            <h3 className="coo-cleared-title">All High-Value Estimates Cleared</h3>
            <p className="coo-cleared-desc">
              No contractor estimates are currently pending Township COO joint sign-off.
            </p>
          </div>
        </div>
      ) : (
        <div className="coo-approvals-feed">
          {approvals.map((item) => (
            <div key={item.id} className="coo-panel coo-approval-card">
              <div className="coo-panel-header">
                <div>
                  <span className="coo-approval-wo-code">
                    {item.workOrderNumber}
                  </span>
                  <h3 className="coo-modal-title">{item.title}</h3>
                </div>
                <div className="coo-approval-total-box">
                  <div className="coo-approval-total-label">Estimated Total</div>
                  <strong className="coo-approval-total-val">
                    ₹{item.estimatedCost.toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              <div className="coo-panel-body">
                {/* Meta details */}
                <div className="coo-approval-meta-grid">
                  <div>
                    <span className="coo-approval-meta-label">Department</span>
                    <strong>{item.departmentName}</strong>
                  </div>
                  <div>
                    <span className="coo-approval-meta-label">Contractor</span>
                    <strong>{item.contractorName}</strong> ({item.contractorContact})
                  </div>
                  <div>
                    <span className="coo-approval-meta-label">Department Head Status</span>
                    <span className="coo-approval-meta-status">Recommended for COO Sign-Off ✓</span>
                  </div>
                </div>

                {/* Line Items Table */}
                <div>
                  <div className="coo-approval-section-title">
                    Itemized AMC Rate Card Schedule
                  </div>
                  <div className="coo-table-wrapper">
                    <table className="coo-table coo-approval-table">
                      <thead>
                        <tr>
                          <th>Item Description</th>
                          <th>Unit</th>
                          <th>Qty</th>
                          <th>Agreed AMC Rate</th>
                          <th className="align-right">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.lineItems.map((li, idx) => (
                          <tr key={idx}>
                            <td><strong>{li.description}</strong></td>
                            <td>{li.unit}</td>
                            <td>{li.quantity || li.qty}</td>
                            <td>₹{Number(li.rate).toLocaleString('en-IN')}</td>
                            <td className="align-right">
                              <strong>₹{Number(li.amount || li.rate * (li.quantity || li.qty)).toLocaleString('en-IN')}</strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Dept Head Notes */}
                <div className="coo-approval-note-box">
                  <strong>Department Head Recommendation:</strong> {item.deptHeadRecommendation}
                </div>

                {/* Action Buttons */}
                <div className="coo-approval-actions">
                  <button onClick={() => onOpenDossier(item.id)} className="btn-coo-secondary">
                    🔍 Full Dossier
                  </button>
                  <button onClick={() => openDecisionModal(item, 'REQUEST_REVISION')} className="btn-coo-warn">
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
                <span className="coo-modal-title-eyebrow">
                  Executive Action Decision
                </span>
                <h3 className="coo-modal-title">
                  {decisionAction === 'APPROVE' ? 'Authorize Estimate' : decisionAction === 'REJECT' ? 'Reject Estimate' : 'Request Contractor Revision'}: {activeApproval.workOrderNumber}
                </h3>
              </div>
              <button onClick={() => setActiveApproval(null)} className="coo-modal-close-btn">✕</button>
            </div>

            <form onSubmit={handleSubmitDecision}>
              <div className="coo-modal-body">
                <p className="dossier-paragraph soft">
                  Amount: <strong>₹{activeApproval.estimatedCost.toLocaleString('en-IN')}</strong> · Vendor: <strong>{activeApproval.contractorName}</strong>
                </p>

                <div className="coo-form-group">
                  <label className="coo-form-label">
                    Executive Decision Remarks / Directive:
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={decisionRemarks}
                    onChange={(e) => setDecisionRemarks(e.target.value)}
                    className="coo-textarea"
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
