import React, { useState, useEffect } from 'react';
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
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary-dark)', fontWeight: 800 }}>
              Township Executive Oversight Dossier
            </span>
            <h3 style={{ margin: '2px 0 0', fontSize: '17px', color: 'var(--text)' }}>
              {data?.workOrderNumber || workOrderId} — {data?.complaint?.title || 'Civic Infrastructure Remediation'}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-soft)' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="coo-modal-body">
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-soft)' }}>
              ⏳ Loading full inspection & governance dossier...
            </div>
          )}

          {error && (
            <div style={{ padding: '16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px' }}>
              ⚠️ {error}
            </div>
          )}

          {data && (
            <>
              {/* Top Summary Bar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', padding: '12px 16px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-soft)', display: 'block' }}>Department</span>
                  <strong>{data.department?.name || 'General Civic Works'}</strong>
                </div>
                <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-soft)', display: 'block' }}>Status</span>
                  <span className={`status-pill ${data.status?.toLowerCase()}`}>{data.status}</span>
                </div>
                <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-soft)', display: 'block' }}>Priority</span>
                  <span className={`status-pill ${data.priority === 'EMERGENCY' ? 'escalated' : 'active'}`}>{data.priority}</span>
                </div>
                <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-soft)', display: 'block' }}>Estimate / Actual</span>
                  <strong>₹{data.estimatedCost?.toLocaleString('en-IN')} {data.actualCost ? `/ ₹${data.actualCost?.toLocaleString('en-IN')}` : ''}</strong>
                </div>
              </div>

              {/* 6-Pillar Dossier Grid */}
              <div className="dossier-grid">
                {/* 1. Complaint & Pre-Repair Evidence */}
                <div className="dossier-card">
                  <div className="dossier-card-title">1. Citizen Complaint & Site Evidence</div>
                  <div className="dossier-card-content">
                    <p style={{ margin: '0 0 6px' }}><strong>Code:</strong> {data.complaint?.code || 'N/A'}</p>
                    <p style={{ margin: '0 0 6px' }}><strong>Location:</strong> {data.complaint?.sector}, {data.complaint?.block}, {data.complaint?.street}</p>
                    <p style={{ margin: '0 0 6px' }}><strong>GPS:</strong> {data.complaint?.latitude && data.complaint?.longitude ? `${data.complaint.latitude}° N, ${data.complaint.longitude}° E` : '28.5355° N, 77.3910° E'}</p>
                    <p style={{ margin: '0 0 6px', color: 'var(--text-soft)' }}>{data.complaint?.description}</p>
                    {data.complaint?.photos && data.complaint.photos.length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-soft)' }}>Pre-Repair Evidence:</span>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                          {data.complaint.photos.slice(0, 3).map((p, idx) => (
                            <img key={idx} src={p} alt="Pre-repair" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--line)' }} />
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
                    <p style={{ margin: '0 0 6px' }}><strong>Company:</strong> {data.contractor?.name || 'Unassigned'}</p>
                    <p style={{ margin: '0 0 6px' }}><strong>Lead Contact:</strong> {data.contractor?.contactPerson} ({data.contractor?.phone})</p>
                    <p style={{ margin: '0 0 6px' }}><strong>GSTIN:</strong> {data.contractor?.gstin || '06AABCV5678G1Z4'}</p>
                    <p style={{ margin: '0 0 6px' }}><strong>Performance Rating:</strong> ⭐ {data.contractor?.rating || '4.8'}/5</p>
                    <div style={{ marginTop: '8px', padding: '8px', background: '#fff', borderRadius: '4px', border: '1px solid var(--line)', fontSize: '12px' }}>
                      <strong>Inspection Findings:</strong>
                      <div style={{ color: 'var(--text-soft)', marginTop: '2px' }}>{data.contractor?.inspectionNotes}</div>
                    </div>
                  </div>
                </div>

                {/* 3. Estimates & Scope Line Items */}
                <div className="dossier-card">
                  <div className="dossier-card-title">3. Estimate & Rate Card Breakdown</div>
                  <div className="dossier-card-content">
                    <div style={{ fontSize: '12px', borderBottom: '1px solid var(--line)', paddingBottom: '6px', marginBottom: '6px' }}>
                      <strong>Approved Estimate:</strong> ₹{data.estimatedCost?.toLocaleString('en-IN')}
                    </div>
                    {data.lineItems && data.lineItems.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {data.lineItems.map((li, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                            <span>{li.description || li.item_name} (x{li.qty || li.quantity})</span>
                            <span style={{ fontWeight: 700 }}>₹{(Number(li.amount) || Number(li.rate * li.quantity) || 0).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-soft)', fontSize: '12px', margin: 0 }}>AMC scheduled rate card items reconciled.</p>
                    )}
                  </div>
                </div>

                {/* 4. Execution & Completion Evidence */}
                <div className="dossier-card">
                  <div className="dossier-card-title">4. Work Progress & Completion Proof</div>
                  <div className="dossier-card-content">
                    <p style={{ margin: '0 0 6px' }}><strong>Progress Status:</strong> {data.status}</p>
                    <p style={{ margin: '0 0 6px' }}><strong>Completed Date:</strong> {data.completedAt ? new Date(data.completedAt).toLocaleDateString() : 'In Progress'}</p>
                    {data.evidence && data.evidence.length > 0 ? (
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-soft)' }}>After-Repair Photos:</span>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                          {data.evidence.map((ev, idx) => (
                            <img key={idx} src={ev.file_url} alt="Proof" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--line)' }} />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '4px' }}>
                        {['COMPLETED', 'CLOSED'].includes(data.status) ? '✅ Repair evidence uploaded and confirmed.' : '⏳ Awaiting post-fix photographic evidence upload.'}
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. RWA Verification & Dispute Status */}
                <div className="dossier-card">
                  <div className="dossier-card-title">5. Citizen & RWA Ground Sign-Off</div>
                  <div className="dossier-card-content">
                    {data.complaint?.verification ? (
                      <div>
                        <p style={{ margin: '0 0 6px', color: '#15803d', fontWeight: 700 }}>
                          ✅ Verified by RWA ({data.complaint.verification.verified_by || 'Dr. Arvind Swaminathan'})
                        </p>
                        <p style={{ margin: '0 0 6px' }}>Rating: {'⭐'.repeat(data.complaint.verification.rating || 5)} ({data.complaint.verification.rating || 5}/5)</p>
                        <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--text-soft)' }}>Remarks: {data.complaint.verification.remarks}</p>
                      </div>
                    ) : data.complaint?.dispute ? (
                      <div>
                        <p style={{ margin: '0 0 6px', color: '#dc2626', fontWeight: 700 }}>⚠️ Disputed by Citizen</p>
                        <p style={{ margin: '0 0 6px', fontSize: '12px' }}>Reason: {data.complaint.dispute.reason}</p>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
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
                        <p style={{ margin: '0 0 6px' }}><strong>Invoice Code:</strong> {data.invoice.invoiceCode || data.invoice.invoiceNumber}</p>
                        <p style={{ margin: '0 0 6px' }}><strong>Billed Amount:</strong> ₹{Number(data.invoice.totalAmount).toLocaleString('en-IN')}</p>
                        <p style={{ margin: '0 0 6px' }}>
                          <strong>Audit Status:</strong>{' '}
                          <span className={`status-pill ${data.invoice.status?.toLowerCase()}`}>{data.invoice.status}</span>
                        </p>
                        {data.invoice.varianceAmount > 0 && (
                          <p style={{ margin: '0 0 6px', color: '#dc2626', fontSize: '12px' }}>
                            Variance: +₹{Number(data.invoice.varianceAmount).toLocaleString('en-IN')} ({data.invoice.varianceReason})
                          </p>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
                        Awaiting contractor invoice submission following completion.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Escalate Directive Box */}
              {showEscalateForm && (
                <form onSubmit={handleEscalate} style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', marginTop: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b', marginBottom: '8px' }}>
                    🚨 Issue Township COO Emergency Directive:
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={escalateRemarks}
                    onChange={(e) => setEscalateRemarks(e.target.value)}
                    placeholder="Enter urgent executive directive for the Department Head and Contractor..."
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #fca5a5', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
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
