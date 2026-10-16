export default function CooDashboard({ dashboardData, onNavigateTab }) {
  const summary = dashboardData?.summary || {
    totalDepartments: 4,
    openComplaints: 7,
    activeWorkOrders: 6,
    overdueWorkOrders: 1,
    totalInvoicedAmount: 47000,
    totalPaidAmount: 3400,
  };

  const departments = dashboardData?.departmentPerformance || [];

  return (
    <div>
      {/* Executive Welcome Banner */}
      <div className="coo-banner">
        <div>
          <div className="coo-banner-eyebrow">
            🏢 Municipal Governance & Operations
          </div>
          <h2 className="coo-banner-title">Township Executive Command Center</h2>
          <p className="coo-banner-sub">
            DLF CyberCity & Aralias Smart Township · Macro Cross-Departmental Operational Telemetry
          </p>
        </div>
        <div className="coo-banner-actions">
          <button onClick={() => onNavigateTab('work_orders')} className="btn-coo-primary">
            📋 Township Work Orders
          </button>
          <button onClick={() => onNavigateTab('departments')} className="btn-coo-secondary">
            🏛️ Manage Departments
          </button>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="coo-kpi-grid">
        <div className="coo-kpi-card" onClick={() => onNavigateTab('departments')}>
          <div className="coo-kpi-top">
            <span className="coo-kpi-label">Total Departments</span>
            <span className="coo-kpi-icon">🏛️</span>
          </div>
          <div className="coo-kpi-value">{summary.totalDepartments}</div>
          <div className="coo-kpi-sub">Civic infrastructure verticals</div>
        </div>

        <div className="coo-kpi-card amber" onClick={() => onNavigateTab('work_orders')}>
          <div className="coo-kpi-top">
            <span className="coo-kpi-label">Open Complaints</span>
            <span className="coo-kpi-icon">⚠️</span>
          </div>
          <div className="coo-kpi-value">{summary.openComplaints}</div>
          <div className="coo-kpi-sub">Active resident tickets across sectors</div>
        </div>

        <div className="coo-kpi-card blue" onClick={() => onNavigateTab('work_orders')}>
          <div className="coo-kpi-top">
            <span className="coo-kpi-label">Active Work Orders</span>
            <span className="coo-kpi-icon">🛠️</span>
          </div>
          <div className="coo-kpi-value">{summary.activeWorkOrders}</div>
          <div className="coo-kpi-sub">Field contractors deployed</div>
        </div>

        <div className="coo-kpi-card red" onClick={() => onNavigateTab('work_orders')}>
          <div className="coo-kpi-top">
            <span className="coo-kpi-label">Overdue Work Orders</span>
            <span className="coo-kpi-icon">🚨</span>
          </div>
          <div className="coo-kpi-value">{summary.overdueWorkOrders}</div>
          <div className="coo-kpi-sub">Breached resolution SLA</div>
        </div>
      </div>

      {/* Department-Wise Performance Matrix */}
      <div className="coo-panel">
        <div className="coo-panel-header">
          <div>
            <h3 className="coo-panel-title">Department-Wise Performance Matrix</h3>
            <p className="coo-panel-subtitle">Staffing, active load, SLA adherence, and municipal budget expenditure</p>
          </div>
          <button onClick={() => onNavigateTab('departments')} className="btn-coo-secondary">
            Manage Departments →
          </button>
        </div>

        <div className="coo-panel-body flush">
          <div className="coo-table-wrapper">
            <table className="coo-table">
              <thead>
                <tr>
                  <th>Department Name</th>
                  <th>Department Head</th>
                  <th>Staff</th>
                  <th>Open Complaints</th>
                  <th>Active Work Orders</th>
                  <th>SLA Compliance</th>
                  <th>Budget Utilization</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="coo-table-empty">
                      Loading departmental analytics...
                    </td>
                  </tr>
                ) : (
                  departments.map((dept) => (
                    <tr key={dept.id}>
                      <td>
                        <strong>{dept.name}</strong>
                        <div className="coo-cell-subtext">Code: {dept.code}</div>
                      </td>
                      <td>
                        {dept.headName !== 'Unassigned' ? (
                          <div>
                            <strong>{dept.headName}</strong>
                            <div className="coo-cell-subtext">{dept.headEmail}</div>
                          </div>
                        ) : (
                          <span className="coo-cell-vacant">Vacant (Assign Head)</span>
                        )}
                      </td>
                      <td>{dept.staffCount} Officers</td>
                      <td>
                        <span className={`coo-cell-stat ${dept.openComplaints > 0 ? 'amber' : 'soft'}`}>
                          {dept.openComplaints}
                        </span>
                      </td>
                      <td>
                        <span className={`coo-cell-stat ${dept.activeWorkOrders > 0 ? 'blue' : 'soft'}`}>
                          {dept.activeWorkOrders}
                        </span>
                      </td>
                      <td>
                        <div className="coo-sla-cell">
                          <span className={`coo-sla-val ${dept.slaComplianceRate >= 90 ? 'good' : 'warn'}`}>
                            {dept.slaComplianceRate}%
                          </span>
                          <div className="coo-sla-track">
                            <div
                              className={`coo-sla-bar ${dept.slaComplianceRate >= 90 ? 'good' : 'warn'}`}
                              style={{ width: `${dept.slaComplianceRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <span className="coo-budget-text">
                            ₹{(dept.spentBudget / 100000).toFixed(1)}L / ₹{(dept.allocatedBudget / 100000).toFixed(1)}L
                          </span>
                          <div className="coo-budget-track">
                            <div
                              className={`coo-budget-bar ${dept.budgetUtilization > 85 ? 'danger' : 'normal'}`}
                              style={{ width: `${Math.min(100, dept.budgetUtilization)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${dept.status?.toLowerCase()}`}>
                          {dept.status || 'ACTIVE'}
                        </span>
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
