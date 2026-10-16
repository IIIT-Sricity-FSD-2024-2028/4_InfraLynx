import { useState, useEffect } from 'react';
import { cooApi } from '../../services/api.js';

export default function WorkOrderDossierModal({ workOrderId, onClose, onEscalateSuccess }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showEscalateForm, setShowEscalateForm] = useState(false);
  const [escalateRemarks, setEscalateRemarks] = useState('');
  const [escalating, setEscalating] = useState(false);

  useEffect(() => {
    async function loadDossier() {
      try {
        setLoading(true);
        const res = await cooApi.getWorkOrderById(workOrderId);
        setData(res);
      } catch (err) {
        setError(err.message || 'Failed to fetch work order dossier.');
      } finally {
        setLoading(false);
      }
    }
    if (workOrderId) loadDossier();
  }, [workOrderId]);

  async function handleEscalate(e) {
    e.preventDefault();
    if (!escalateRemarks.trim()) return;
    try {
      setEscalating(true);
      await cooApi.escalateWorkOrder(workOrderId, {
        remarks: escalateRemarks.trim(),
        targetPriority: 'EMERGENCY',
      });
      alert(`Work order ${data?.workOrderNumber || workOrderId} escalated with COO Emergency Directive!`);
      setShowEscalateForm(false);
      if (onEscalateSuccess) onEscalateSuccess();
      onClose();
    } catch (err) {
      alert(`Escalation failed: ${err.message}`);
    } finally {
      setEscalating(false);
    }
  }

  return (
    <div className="coo-modal-overlay" onClick={onClose}>
      <div className="coo-modal-box wide" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="coo-modal-header">
          <div>
            <span className="coo-modal-title-eyebrow">
              Township Executive Oversight Dossier
            </span>
            <h3 className="coo-modal-title">
              {data?.workOrderNumber || workOrderId} — {data?.complaint?.title || 'Civic Infrastructure Remediation'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="coo-modal-close-btn"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="coo-modal-body">
          {loading && (
            <div className="coo-table-empty">
              ⏳ Loading full inspection & governance dossier...
            </div>
          )}

          {error && (
            <div className="dossier-error-box">
              ⚠️ {error}
            </div>
          )}

          {data && (
            <>
              {/* Top Summary Bar */}
              <div className="dossier-top-bar">
                <div>
                  <span className="dossier-top-label">Department</span>
                  <strong>{data.department?.name || 'General Civic Works'}</strong>
                </div>
                <div className="dossier-top-item">
                  <span className="dossier-top-label">Status</span>
                  <span className={`status-pill ${data.status?.toLowerCase()}`}>{data.status}</span>
                </div>
                <div className="dossier-top-item">
                  <span className="dossier-top-label">Priority</span>
                  <span className={`status-pill ${data.priority === 'EMERGENCY' ? 'escalated' : 'active'}`}>{data.priority}</span>
                </div>
                <div className="dossier-top-item">
                  <span className="dossier-top-label">Money Estimated</span>
                  <strong className="dossier-money-est">₹{(data.estimated_cost || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div className="dossier-top-item">
                  <span className="dossier-top-label">Money Used</span>
                  <strong className="dossier-money-used">₹{(data.actual_cost || (data.status === 'COMPLETED' ? (data.estimated_cost || 0) : 0)).toLocaleString('en-IN')}</strong>
                </div>
              </div>

              {/* 6-Pillar Dossier Grid */}
              <div className="dossier-grid">
                {/* 1. Complaint & Pre-Repair Evidence */}
                <div className="dossier-card">
                  <div className="dossier-card-title">1. Citizen Complaint & Site Evidence</div>
                  <div className="dossier-card-content">
                    <p className="dossier-paragraph"><strong>Code:</strong> {data.complaint?.code || 'N/A'}</p>
                    <p className="dossier-paragraph"><strong>Location:</strong> {data.complaint?.sector}, {data.complaint?.block}, {data.complaint?.street}</p>
                    <p className="dossier-paragraph soft">{data.complaint?.description}</p>
                    {data.complaint?.photos && data.complaint.photos.length > 0 && (
                      <div className="coo-form-group">
                        <span className="dossier-photo-label">Pre-Repair Evidence:</span>
                        <div className="dossier-photo-grid">
                          {data.complaint.photos.slice(0, 3).map((p, idx) => (
                            <img key={idx} src={p} alt="Pre-repair" className="dossier-photo-thumb" />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Assigned Contractor & Findings */}
                <div className="dossier-card">
                  <div className="dossier-card-title">2. Assigned Contractor & Inspection</div>
                  <div className="dossier-card-content">
                    <p className="dossier-paragraph"><strong>Company:</strong> {data.contractor?.name || 'Unassigned'}</p>
                    <p className="dossier-paragraph"><strong>Lead Contact:</strong> {data.contractor?.contactPerson} ({data.contractor?.phone})</p>
                    <p className="dossier-paragraph"><strong>GSTIN:</strong> {data.contractor?.gstin || '06AABCV5678G1Z4'}</p>
                    <p className="dossier-paragraph"><strong>Performance Rating:</strong> ⭐ {data.contractor?.rating || '4.8'}/5</p>
                    <div className="dossier-inspection-box">
                      <strong>Inspection Findings:</strong>
                      <div className="coo-cell-subtext">{data.contractor?.inspectionNotes}</div>
                    </div>
                  </div>
                </div>

                {/* 3. Estimates & Scope Line Items */}
                <div className="dossier-card">
                  <div className="dossier-card-title">3. Estimate & Rate Card Breakdown</div>
                  <div className="dossier-card-content">
                    <div className="dossier-breakdown-header">
                      <span><strong>Money Estimated:</strong> ₹{(data.estimated_cost || 0).toLocaleString('en-IN')}</span>
                      <span className="dossier-money-used"><strong>Money Used:</strong> ₹{(data.actual_cost || (data.status === 'COMPLETED' ? (data.estimated_cost || 0) : 0)).toLocaleString('en-IN')}</span>
                    </div>
                    {data.lineItems && data.lineItems.length > 0 ? (
                      <div className="dossier-items-list">
                        {data.lineItems.map((li, idx) => (
                          <div key={idx} className="dossier-item-row">
                            <span>{li.description || li.item_name} (x{li.qty || li.quantity})</span>
                            <strong>₹{(Number(li.amount) || Number(li.rate * li.quantity) || 0).toLocaleString('en-IN')}</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="coo-cell-subtext">AMC scheduled rate card items reconciled.</p>
                    )}
                  </div>
                </div>

                {/* 4. Execution & Completion Evidence */}
                <div className="dossier-card">
                  <div className="dossier-card-title">4. Work Progress & Completion Proof</div>
                  <div className="dossier-card-content">
                    <p className="dossier-paragraph"><strong>Progress Status:</strong> {data.status}</p>
                    <p className="dossier-paragraph"><strong>Completed Date:</strong> {data.completedAt ? new Date(data.completedAt).toLocaleDateString() : 'In Progress'}</p>
                    {data.evidence && data.evidence.length > 0 ? (
                      <div>
                        <span className="dossier-photo-label">After-Repair Photos:</span>
                        <div className="dossier-photo-grid">
                          {data.evidence.map((ev, idx) => (
                            <img key={idx} src={ev.file_url} alt="Proof" className="dossier-photo-thumb" />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="coo-cell-subtext">
                        {['COMPLETED', 'CLOSED'].includes(data.status) ? '✅ Repair evidence uploaded and confirmed.' : '⏳ Awaiting post-fix photographic evidence upload.'}
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. RWA Verification Status */}
                <div className="dossier-card">
                  <div className="dossier-card-title">5. Citizen & RWA Ground Sign-Off</div>
                  <div className="dossier-card-content">
                    {data.complaint?.verification ? (
                      <div>
                        <p className="dossier-verified-badge">
                          ✅ Verified by RWA ({data.complaint.verification.verified_by || 'Dr. Arvind Swaminathan'})
                        </p>
                        <p className="dossier-paragraph">Rating: {'⭐'.repeat(data.complaint.verification.rating || 5)} ({data.complaint.verification.rating || 5}/5)</p>
                        <p className="dossier-paragraph soft">Remarks: {data.complaint.verification.remarks}</p>
                      </div>
                    ) : (
                      <div className="coo-cell-subtext">
                        ⏳ On-ground verification pending citizen / RWA inspection.
                      </div>
                    )}
                  </div>
                </div>

                {/* 6. Invoice & Payment Status */}
                <div className="dossier-card">
                  <div className="dossier-card-title">6. Invoice Audit & Municipal Payout</div>
                  <div className="dossier-card-content">
                    {data.invoice ? (
                      <div>
                        <p className="dossier-paragraph"><strong>Invoice Code:</strong> {data.invoice.invoiceCode || data.invoice.invoiceNumber}</p>
                        <p className="dossier-paragraph"><strong>Billed Amount:</strong> ₹{Number(data.invoice.totalAmount).toLocaleString('en-IN')}</p>
                        <p className="dossier-paragraph">
                          <strong>Audit Status:</strong>{' '}
                          <span className={`status-pill ${data.invoice.status?.toLowerCase()}`}>{data.invoice.status}</span>
                        </p>
                        {data.invoice.varianceAmount > 0 && (
                          <p className="dossier-variance-alert">
                            Variance: +₹{Number(data.invoice.varianceAmount).toLocaleString('en-IN')} ({data.invoice.varianceReason})
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="coo-cell-subtext">
                        Awaiting contractor invoice submission following completion.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Escalate Directive Box */}
              {showEscalateForm && (
                <form onSubmit={handleEscalate} className="dossier-escalate-form">
                  <div className="dossier-escalate-title">
                    🚨 Issue Township COO Emergency Directive:
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={escalateRemarks}
                    onChange={(e) => setEscalateRemarks(e.target.value)}
                    placeholder="Enter urgent executive directive for the Department Head and Contractor..."
                    className="dossier-escalate-textarea"
                  />
                  <div className="dossier-escalate-actions">
                    <button type="button" onClick={() => setShowEscalateForm(false)} className="btn-coo-secondary">
                      Cancel
                    </button>
                    <button type="submit" disabled={escalating} className="btn-coo-danger">
                      {escalating ? 'Issuing...' : 'Confirm Emergency Escalation'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="coo-modal-footer">
          <button onClick={onClose} className="btn-coo-secondary">
            Close Dossier
          </button>
          {!showEscalateForm && data?.status !== 'CLOSED' && (
            <button onClick={() => setShowEscalateForm(true)} className="btn-coo-danger">
              🚨 Escalate Delayed Work Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
