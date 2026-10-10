import React, { useState } from 'react';

export default function TownshipWorkOrders({
  workOrders,
  departments,
  contractors,
  onOpenDossier,
  onFilterChange,
  filters,
}) {
  const [search, setSearch] = useState(filters.search || '');

  function handleSearchSubmit(e) {
    e.preventDefault();
    onFilterChange({ ...filters, search });
  }

  return (
    <div>
      {/* Banner */}
      <div className="coo-banner">
        <div>
          <h2 className="coo-banner-title">Cross-Department Township Work Orders</h2>
          <p className="coo-banner-sub">
            Holistic tracking of all municipal repair contracts from citizen report through contractor execution, RWA inspection, and financial audit.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ padding: '8px 14px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: 700 }}>
            Total Visible: {workOrders.length} Work Orders
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="coo-panel" style={{ marginBottom: '20px' }}>
        <div className="coo-panel-body" style={{ padding: '16px 20px' }}>
          <form onSubmit={handleSearchSubmit} className="coo-filter-bar" style={{ margin: 0 }}>
            {/* Search */}
            <input
              type="text"
              placeholder="Search by WO#, Complaint Title, Code, Vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="coo-input"
            />

            {/* Department Filter */}
            <select
              value={filters.departmentId || 'ALL'}
              onChange={(e) => onFilterChange({ ...filters, departmentId: e.target.value })}
              className="coo-select"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* Contractor Filter */}
            <select
              value={filters.contractorId || 'ALL'}
              onChange={(e) => onFilterChange({ ...filters, contractorId: e.target.value })}
              className="coo-select"
            >
              <option value="ALL">All Contractors</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>{c.name || c.company_name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filters.status || 'ALL'}
              onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
              className="coo-select"
            >
              <option value="ALL">All Lifecycle Statuses</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="AWAITING_DEPT_HEAD">Awaiting Dept Head</option>
              <option value="ESCALATED_TO_COO">Escalated to COO</option>
              <option value="COMPLETED">Completed</option>
              <option value="CLOSED">Closed (Verified)</option>
            </select>

            {/* Priority Filter */}
            <select
              value={filters.priority || 'ALL'}
              onChange={(e) => onFilterChange({ ...filters, priority: e.target.value })}
              className="coo-select"
            >
              <option value="ALL">All Priorities</option>
              <option value="EMERGENCY">Emergency (SLA 6h)</option>
              <option value="HIGH">High (SLA 24h)</option>
              <option value="MEDIUM">Medium (SLA 48h)</option>
              <option value="LOW">Low (SLA 72h)</option>
            </select>

            {/* SLA Filter */}
            <select
              value={filters.slaStatus || 'ALL'}
              onChange={(e) => onFilterChange({ ...filters, slaStatus: e.target.value })}
              className="coo-select"
            >
              <option value="ALL">All SLA States</option>
              <option value="WITHIN_SLA">Within SLA Target</option>
              <option value="OVERDUE">🚨 Overdue / Breached</option>
            </select>

            <button type="submit" className="btn-coo-primary">
              Filter
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                onFilterChange({
                  departmentId: 'ALL',
                  contractorId: 'ALL',
                  status: 'ALL',
                  priority: 'ALL',
                  slaStatus: 'ALL',
                  search: '',
                });
              }}
              className="btn-coo-secondary"
            >
              Reset
            </button>
          </form>
        </div>
      </div>

      {/* Work Orders Master Table */}
      <div className="coo-panel">
        <div className="coo-panel-body" style={{ padding: 0 }}>
          <div className="coo-table-wrapper">
            <table className="coo-table">
              <thead>
                <tr>
                  <th>Work Order & Task</th>
                  <th>Department</th>
                  <th>Contractor</th>
                  <th>Priority</th>
                  <th>Cost (Est / Actual)</th>
                  <th>SLA Deadline</th>
                  <th>Lifecycle Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-soft)' }}>
                      No township work orders match the selected filters.
                    </td>
                  </tr>
                ) : (
                  workOrders.map((wo) => (
                    <tr key={wo.id} onClick={() => onOpenDossier(wo.id)} style={{ cursor: 'pointer' }}>
                      <td>
                        <strong style={{ color: 'var(--primary-darker)' }}>{wo.workOrderNumber}</strong>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginTop: '2px' }}>
                          {wo.complaint?.title || 'Remediation Task'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-soft)' }}>
                          Ticket: {wo.complaint?.code || 'N/A'} · Sector: {wo.complaint?.sector || 'Sector 54'}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', fontWeight: 600 }}>
                          {wo.department?.name || 'General Municipal'}
                        </span>
                      </td>
                      <td>
                        <div>
                          <strong>{wo.contractor?.name || 'Unassigned'}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-soft)' }}>
                            {wo.contractor?.contactPerson}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${wo.priority === 'EMERGENCY' ? 'escalated' : 'active'}`}>
                          {wo.priority}
                        </span>
                      </td>
                      <td>
                        <strong>₹{wo.estimatedCost?.toLocaleString('en-IN')}</strong>
                        {wo.actualCost && (
                          <div style={{ fontSize: '11px', color: 'var(--text-soft)' }}>
                            Act: ₹{wo.actualCost?.toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td>
                        {wo.isOverdue ? (
                          <span style={{ color: '#b91c1c', fontWeight: 700, fontSize: '12px' }}>
                            🚨 Overdue
                          </span>
                        ) : (
                          <span style={{ color: 'var(--primary-dark)', fontSize: '12px' }}>
                            {wo.slaDeadline ? new Date(wo.slaDeadline).toLocaleDateString() : 'Active Target'}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`status-pill ${wo.status?.toLowerCase()}`}>
                          {wo.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onOpenDossier(wo.id)}
                          className="btn-coo-primary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          🔍 Inspect Dossier
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
