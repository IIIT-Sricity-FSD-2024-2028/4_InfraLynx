import { useState, useEffect } from 'react';
import { deptHeadApi } from '../../services/api.js';

export default function WorkOrders({ onSelectComplaint }) {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });

  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [selectedWO, setSelectedWO] = useState(null);
  const [escalateReason, setEscalateReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchWorkOrders();
  }, [filters]);

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      // We pass the other filters to backend, SLA is processed locally
      const { sla, ...apiFilters } = filters;
      const res = await deptHeadApi.getWorkOrders(apiFilters);
      let data = res || [];
      
      if (sla === 'overdue') {
        data = data.filter(wo => wo.sla_deadline && new Date(wo.sla_deadline) < new Date() && wo.status !== 'COMPLETED' && wo.status !== 'CLOSED');
      } else if (sla === 'on-track') {
        data = data.filter(wo => !wo.sla_deadline || new Date(wo.sla_deadline) >= new Date() || wo.status === 'COMPLETED' || wo.status === 'CLOSED');
      }
      
      setWorkOrders(data);
    } catch (err) {
      setError(err.message || 'Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = async (e) => {
    e.preventDefault();
    if (!escalateReason.trim() || !selectedWO) return;

    try {
      setProcessing(true);
      await deptHeadApi.escalateWorkOrder(selectedWO.id, escalateReason);
      setShowEscalateModal(false);
      setEscalateReason('');
      setSelectedWO(null);
      await fetchWorkOrders();
    } catch (err) {
      alert(err.message || 'Failed to escalate work order');
    } finally {
      setProcessing(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
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
              <option value="AWAITING_DEPT_HEAD">Awaiting Approval</option>
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
          <button onClick={fetchWorkOrders} className="button button-ghost" style={{ fontSize: '13px' }}>
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
                <th>Work Order</th>
                <th>Status & SLA</th>
                <th>Contractor</th>
                <th>Priority</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map((wo) => {
                const isOverdue = wo.sla_deadline && new Date(wo.sla_deadline) < new Date() && wo.status !== 'COMPLETED' && wo.status !== 'CLOSED';
                
                return (
                  <tr key={wo.id} style={{ background: isOverdue ? '#fef2f2' : 'transparent' }}>
                    <td>
                      <div style={{ fontWeight: '600' }}>{wo.work_order_code || wo.id.substring(0, 8)}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '4px', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={wo.description}>
                        {wo.description || 'No description'}
                      </div>
                      {wo.escalated && <span style={{ display: 'inline-block', marginTop: '8px', padding: '2px 6px', background: '#fee2e2', color: '#991b1b', fontSize: '10px', fontWeight: 'bold', borderRadius: '4px', textTransform: 'uppercase' }}>Escalated</span>}
                    </td>
                    <td>
                      <span className="badge-eyebrow" style={{ background: '#dbeafe', color: '#1e40af' }}>
                        {wo.status.replace(/_/g, ' ')}
                      </span>
                      {wo.sla_deadline && (
                        <div style={{ fontSize: '12px', marginTop: '8px', fontWeight: '600', color: isOverdue ? '#dc2626' : 'var(--text-soft)' }}>
                          {isOverdue ? '⚠️ Overdue' : `Due: ${new Date(wo.sla_deadline).toLocaleDateString()}`}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: '500' }}>
                        {wo.contractor_id ? `Contractor (${wo.contractor_id.substring(0,6)})` : 'Unassigned'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '500' }}>{wo.priority || 'Medium'}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="button button-secondary" 
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => onSelectComplaint ? onSelectComplaint(wo) : null}
                        >
                          Details
                        </button>
                        
                        {(!wo.escalated && isOverdue) && (
                          <button 
                            className="button button-primary" 
                            style={{ padding: '6px 12px', fontSize: '12px', background: '#ef4444' }}
                            onClick={() => { setSelectedWO(wo); setShowEscalateModal(true); }}
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
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="e.g. Contractor has failed to respond after 3 notices. SLA breached by 48 hours."
                  style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '8px', border: '1px solid var(--line-strong)', outline: 'none', resize: 'none', marginBottom: '24px' }}
                  required
                />
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    className="button button-ghost"
                    onClick={() => {
                      setShowEscalateModal(false);
                      setEscalateReason('');
                      setSelectedWO(null);
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
