import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDeptWorkOrders,
  escalateDeptWorkOrder,
  setDeptWorkOrdersUiField,
  setDeptWorkOrdersFilter,
  selectDeptWorkOrders,
  selectDeptWorkOrdersStatus,
  selectDeptWorkOrdersProcessing,
  selectDeptWorkOrdersUi,
} from '../../store/depthead/deptHeadSlice.js';

export default function WorkOrders({ onSelectComplaint }) {
  const dispatch = useDispatch();
  const rawWorkOrders = useSelector(selectDeptWorkOrders);
  const workOrdersStatus = useSelector(selectDeptWorkOrdersStatus);
  const reduxProcessing = useSelector(selectDeptWorkOrdersProcessing);
  const {
    localProcessing,
    filters,
    showEscalateModal,
    selectedWO,
    escalateReason,
  } = useSelector(selectDeptWorkOrdersUi);

  const setWoUi = (field, value) => dispatch(setDeptWorkOrdersUiField({ field, value }));

  const processing = reduxProcessing || localProcessing;
  const loading = workOrdersStatus === 'loading' && rawWorkOrders.length === 0;
  const error = workOrdersStatus === 'failed' ? 'Failed to load work orders' : null;

  useEffect(() => {
    const { sla: _sla, ...apiFilters } = filters;
    dispatch(fetchDeptWorkOrders(apiFilters));
  }, [dispatch, filters.status, filters.search]);

  const workOrders = useMemo(() => {
    let data = rawWorkOrders || [];
    if (filters.sla === 'overdue') {
      data = data.filter(wo => wo.sla_deadline && new Date(wo.sla_deadline) < new Date() && wo.status !== 'COMPLETED' && wo.status !== 'CLOSED');
    } else if (filters.sla === 'on-track') {
      data = data.filter(wo => !wo.sla_deadline || new Date(wo.sla_deadline) >= new Date() || wo.status === 'COMPLETED' || wo.status === 'CLOSED');
    }
    return data;
  }, [rawWorkOrders, filters.sla]);

  const handleEscalate = async (e) => {
    e.preventDefault();
    if (!escalateReason.trim() || !selectedWO) return;

    try {
      setWoUi('localProcessing', true);
      await dispatch(escalateDeptWorkOrder({ id: selectedWO.id, reason: escalateReason })).unwrap();
      setWoUi('showEscalateModal', false);
      setWoUi('escalateReason', '');
      setWoUi('selectedWO', null);
    } catch (err) {
      alert(err || 'Failed to escalate work order');
    } finally {
      setWoUi('localProcessing', false);
    }
  };

  const handleFilterChange = (key, value) => {
    dispatch(setDeptWorkOrdersFilter({ key, value }));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="dept-page-title" style={{ marginBottom: 0 }}>Work Orders & Escalations</h2>
          <p style={{ color: 'var(--text-soft)', marginTop: '8px' }}>
            Monitor all active work orders, SLA deadlines, and handle escalations for delayed jobs.
          </p>
        </div>
      </div>

      <div className="panel-card" style={{ overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '16px', background: 'var(--surface-muted)', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
            <input 
              type="text" 
              placeholder="Search ID or Description..." 
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line-strong)', outline: 'none', width: '220px' }}
            />
            <select 
              value={filters.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line-strong)', outline: 'none', background: '#fff' }}
            >
              <option value="">All Statuses</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="AWAITING_DEPT_HEAD">Awaiting Dept Head</option>
              <option value="AWAITING_COO">Awaiting COO</option>
              <option value="REVISION_REQUESTED">Revision Requested</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select 
              value={filters.priority} 
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line-strong)', outline: 'none', background: '#fff' }}
            >
              <option value="">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select 
              value={filters.sla} 
              onChange={(e) => handleFilterChange('sla', e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line-strong)', outline: 'none', background: '#fff' }}
            >
              <option value="">All SLA Status</option>
              <option value="overdue">Overdue</option>
              <option value="on-track">On Track</option>
            </select>
            <input 
              type="text" 
              placeholder="Contractor ID" 
              value={filters.contractor_id || ''}
              onChange={(e) => handleFilterChange('contractor_id', e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line-strong)', outline: 'none', width: '150px' }}
            />
          </div>
          <button onClick={() => { const { sla: _sla, ...apiFilters } = filters; dispatch(fetchDeptWorkOrders(apiFilters)); }} className="button button-ghost" style={{ fontSize: '13px' }}>
            Refresh Data
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-soft)' }}>
            <p>Loading work orders...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '24px', background: '#fef2f2', color: '#dc2626', textAlign: 'center' }}>
            <p>{error}</p>
          </div>
        ) : (
          <table className="dept-list-table">
            <thead>
              <tr>
                <th>Work Order ID & Date</th>
                <th>Description & Category</th>
                <th>Location</th>
                <th>Assigned Contractor</th>
                <th>Status & SLA</th>
                <th>Priority</th>
                <th>Estimated Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map((wo) => {
                const isOverdue =
                  wo.sla_status === 'OVERDUE' ||
                  (wo.sla_deadline && new Date(wo.sla_deadline) < new Date() && wo.status !== 'COMPLETED' && wo.status !== 'CLOSED');
                
                const woId = wo.work_order_number || wo.id;
                const desc = wo.description || wo.title || 'Civil infrastructure repair';
                const cat = wo.category || 'Civil';
                const loc = wo.location_details || wo.sector || 'Sector 54';
                const contractorName = wo.contractor?.name || (wo.contractor_id ? `Contractor (${wo.contractor_id.substring(0,6)})` : 'Unassigned');
                const estAmt = Number(wo.estimated_cost || 0);
                const createdDate = wo.created_at;

                return (
                  <tr key={wo.id} style={{ background: isOverdue ? '#fff1f2' : 'transparent' }}>
                    <td>
                      <div style={{ fontWeight: '700', color: '#1e293b' }}>{woId}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {createdDate ? new Date(createdDate).toLocaleDateString() : ''}
                      </div>
                      {wo.escalated && (
                        <span style={{ display: 'inline-block', marginTop: '4px', padding: '2px 6px', background: '#fee2e2', color: '#991b1b', fontSize: '10px', fontWeight: 'bold', borderRadius: '4px', textTransform: 'uppercase' }}>
                          Escalated
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: '500', color: '#0f172a', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.4 }} title={desc}>
                        {desc}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>{cat}</span>
                        {wo.subcategory && <span style={{ marginLeft: '4px' }}>• {wo.subcategory}</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', color: '#334155' }}>📍 {loc}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', color: '#4338ca', fontSize: '13px' }}>
                        {contractorName}
                      </div>
                    </td>
                    <td>
                      <span className="badge-eyebrow" style={{ background: '#e0e7ff', color: '#3730a3', fontWeight: '700' }}>
                        {wo.status.replace(/_/g, ' ')}
                      </span>
                      <div style={{ fontSize: '11px', marginTop: '4px', fontWeight: '600', color: isOverdue ? '#dc2626' : '#64748b' }}>
                        {isOverdue ? '⚠️ Overdue' : wo.slaStatus === 'AT_RISK' ? '⚡ At Risk' : (wo.slaDeadline || wo.sla_deadline ? `Due: ${new Date(wo.slaDeadline || wo.sla_deadline).toLocaleDateString()}` : 'On Track')}
                      </div>
                    </td>
                    <td>
                      <span style={{ 
                        fontWeight: '700', 
                        fontSize: '12px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: wo.priority === 'EMERGENCY' ? '#fee2e2' : wo.priority === 'HIGH' ? '#ffedd5' : '#f1f5f9',
                        color: wo.priority === 'EMERGENCY' ? '#b91c1c' : wo.priority === 'HIGH' ? '#c2410c' : '#334155'
                      }}>
                        {wo.priority || 'Medium'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '14px' }}>
                        {estAmt > 0 ? `₹${estAmt.toLocaleString()}` : '—'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button 
                          className="button button-secondary" 
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          onClick={() => onSelectComplaint ? onSelectComplaint(wo) : null}
                        >
                          Details
                        </button>
                        
                        {(!wo.escalated && isOverdue) && (
                          <button 
                            className="button button-primary" 
                            style={{ padding: '6px 10px', fontSize: '12px', background: '#ef4444' }}
                            onClick={() => { setWoUi('selectedWO', wo); setWoUi('showEscalateModal', true); }}
                          >
                            Escalate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {workOrders.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-soft)' }}>
                    No work orders found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showEscalateModal && selectedWO && (
        <div className="modal-overlay">
          <div className="panel-card modal-content" style={{ width: '500px', padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', background: '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
              <h3 style={{ margin: 0, color: '#b91c1c' }}>Escalate Work Order</h3>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-soft)', marginBottom: '16px' }}>
                You are escalating <strong>{selectedWO.work_order_code || selectedWO.id}</strong>. Please provide a justification for this escalation (e.g. severe SLA breach, contractor non-responsive).
              </p>
              <form onSubmit={handleEscalate}>
                <textarea 
                  value={escalateReason}
                  onChange={(e) => setWoUi('escalateReason', e.target.value)}
                  placeholder="e.g. Contractor has failed to respond after 3 notices. SLA breached by 48 hours."
                  style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '8px', border: '1px solid var(--line-strong)', outline: 'none', resize: 'none', marginBottom: '24px' }}
                  required
                />
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    className="button button-ghost"
                    onClick={() => {
                      setWoUi('showEscalateModal', false);
                      setWoUi('escalateReason', '');
                      setWoUi('selectedWO', null);
                    }}
                    disabled={processing}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="button button-primary" style={{ background: '#ef4444' }}
                    disabled={processing || !escalateReason.trim()}
                  >
                    Confirm Escalation
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
