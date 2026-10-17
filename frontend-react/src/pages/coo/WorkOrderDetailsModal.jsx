import { useState, useEffect } from 'react';
import { cooApi } from '../../services/api.js';

export default function WorkOrderDetailsModal({ workOrderId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDetails() {
      try {
        setLoading(true);
        const res = await cooApi.getWorkOrderById(workOrderId);
        setData(res);
      } catch (err) {
        setError(err.message || 'Failed to fetch work order details.');
      } finally {
        setLoading(false);
      }
    }
    if (workOrderId) loadDetails();
  }, [workOrderId]);

  return (
    <div className="coo-modal-overlay" onClick={onClose}>
      <div className="coo-modal-box wide" onClick={(e) => e.stopPropagation()}>
        <div className="coo-modal-header">
          <div>
            <span className="coo-modal-title-eyebrow">Work Order Details</span>
            <h3 className="coo-modal-title">
              {data?.workOrderNumber || workOrderId} — {data?.complaint?.title || 'Civic Infrastructure Remediation'}
            </h3>
          </div>
          <button onClick={onClose} className="coo-modal-close-btn">✕</button>
        </div>

        <div className="coo-modal-body">
          {loading && <div className="coo-table-empty">Loading work order details...</div>}
          {error && <div className="wo-detail-error-box">{error}</div>}

          {data && (
            <>
              <div className="wo-detail-top-bar">
                <div>
                  <span className="wo-detail-label">Department</span>
                  <strong>{data.department?.name || 'General Civic Works'}</strong>
                </div>
                <div className="wo-detail-top-item">
                  <span className="wo-detail-label">Status</span>
                  <span className={`status-pill ${data.status?.toLowerCase()}`}>{data.status}</span>
                </div>
                <div className="wo-detail-top-item">
                  <span className="wo-detail-label">Priority</span>
                  <span className={`status-pill ${data.priority === 'EMERGENCY' ? 'escalated' : 'active'}`}>{data.priority}</span>
                </div>
                <div className="wo-detail-top-item">
                  <span className="wo-detail-label">Estimated Cost</span>
                  <strong className="wo-detail-money-est">₹{(data.estimated_cost || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div className="wo-detail-top-item">
                  <span className="wo-detail-label">Actual Cost</span>
                  <strong className="wo-detail-money-used">
                    ₹{(data.actual_cost || (data.status === 'COMPLETED' ? (data.estimated_cost || 0) : 0)).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              <div className="wo-detail-grid">
                <div className="wo-detail-card">
                  <div className="wo-detail-card-title">1. Citizen Complaint</div>
                  <div className="wo-detail-card-content">
                    <p className="wo-detail-para"><strong>Code:</strong> {data.complaint?.code || 'N/A'}</p>
                    <p className="wo-detail-para"><strong>Location:</strong> {data.complaint?.sector}, {data.complaint?.block}, {data.complaint?.street}</p>
                    <p className="wo-detail-para soft">{data.complaint?.description}</p>
                  </div>
                </div>

                <div className="wo-detail-card">
                  <div className="wo-detail-card-title">2. Assigned Contractor</div>
                  <div className="wo-detail-card-content">
                    <p className="wo-detail-para"><strong>Company:</strong> {data.contractor?.name || 'Unassigned'}</p>
                    <p className="wo-detail-para"><strong>Contact:</strong> {data.contractor?.contactPerson} ({data.contractor?.phone})</p>
                    <p className="wo-detail-para"><strong>GSTIN:</strong> {data.contractor?.gstin || 'N/A'}</p>
                  </div>
                </div>


                <div className="wo-detail-card">
                  <div className="wo-detail-card-title">4. Work Progress</div>
                  <div className="wo-detail-card-content">
                    <p className="wo-detail-para"><strong>Status:</strong> {data.status}</p>
                    <p className="wo-detail-para">
                      <strong>Completed:</strong> {data.completedAt ? new Date(data.completedAt).toLocaleDateString() : 'In Progress'}
                    </p>
                  </div>
                </div>

                <div className="wo-detail-card">
                  <div className="wo-detail-card-title">5. RWA Sign-Off</div>
                  <div className="wo-detail-card-content">
                    {data.complaint?.verification ? (
                      <div>
                        <p className="wo-detail-verified-badge">Verified by {data.complaint.verification.verified_by || 'RWA'}</p>
                        <p className="wo-detail-para">Rating: {data.complaint.verification.rating || 5}/5</p>
                        <p className="wo-detail-para soft">{data.complaint.verification.remarks}</p>
                      </div>
                    ) : (
                      <div className="coo-cell-subtext">Verification pending from citizen / RWA.</div>
                    )}
                  </div>
                </div>

                <div className="wo-detail-card">
                  <div className="wo-detail-card-title">6. Invoice &amp; Payment</div>
                  <div className="wo-detail-card-content">
                    {data.invoice ? (
                      <div>
                        <p className="wo-detail-para"><strong>Invoice #:</strong> {data.invoice.invoiceCode || data.invoice.invoiceNumber}</p>
                        <p className="wo-detail-para"><strong>Billed:</strong> ₹{Number(data.invoice.totalAmount).toLocaleString('en-IN')}</p>
                        <p className="wo-detail-para">
                          <strong>Audit Status:</strong>{' '}
                          <span className={`status-pill ${data.invoice.status?.toLowerCase()}`}>{data.invoice.status}</span>
                        </p>
                        {data.invoice.varianceAmount > 0 && (
                          <p className="wo-detail-variance-alert">
                            Variance: +₹{Number(data.invoice.varianceAmount).toLocaleString('en-IN')} ({data.invoice.varianceReason})
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="coo-cell-subtext">Awaiting contractor invoice submission.</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="coo-modal-footer">
          <button onClick={onClose} className="btn-coo-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}
