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
        <div className="coo-banner-actions">
          <span className="coo-badge-pill">
            Total Visible: {workOrders.length} Work Orders
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="coo-panel">
        <div className="coo-panel-body">
          <form onSubmit={handleSearchSubmit} className="coo-filter-bar">
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
        <div className="coo-panel-body flush">
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
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="coo-table-empty">
                      No township work orders match the selected filters.
                    </td>
                  </tr>
                ) : (
                  workOrders.map((wo) => (
                    <tr key={wo.id} onClick={() => onOpenDossier(wo.id)} className="wo-table-row-clickable">
                      <td>
                        <strong className="coo-approval-wo-code">{wo.workOrderNumber}</strong>
                        <div className="coo-cell-strong-text">
                          {wo.complaint?.title || 'Remediation Task'}
                        </div>
                        <div className="coo-cell-subtext">
                          Ticket: {wo.complaint?.code || 'N/A'} · Sector: {wo.complaint?.sector || 'Sector 54'}
                        </div>
                      </td>
                      <td>
                        <span className="dept-scope-desc">
                          {wo.department?.name || 'General Municipal'}
                        </span>
                      </td>
                      <td>
                        <div>
                          <strong>{wo.contractor?.name || 'Unassigned'}</strong>
                          <div className="coo-cell-subtext">
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
                          <div className="coo-cell-subtext">
                            Act: ₹{wo.actualCost?.toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td>
                        {wo.isOverdue ? (
                          <span className="wo-sla-overdue">
                            🚨 Overdue
                          </span>
                        ) : (
                          <span className="wo-sla-target">
                            {wo.slaDeadline ? new Date(wo.slaDeadline).toLocaleDateString() : 'Active Target'}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`status-pill ${wo.status?.toLowerCase()}`}>
                          {wo.status}
                        </span>
                      </td>
                      <td className="align-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onOpenDossier(wo.id)}
                          className="btn-coo-primary btn-coo-sm"
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
