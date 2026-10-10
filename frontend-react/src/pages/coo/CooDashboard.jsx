import React from 'react';

export default function CooDashboard({ dashboardData, onNavigateTab }) {
  const summary = dashboardData?.summary || {
    totalDepartments: 4,
    openComplaints: 7,
    activeWorkOrders: 6,
    pendingApprovals: 2,
    overdueWorkOrders: 1,
    totalInvoicedAmount: 47000,
    totalPaidAmount: 3400,
  };

  const departments = dashboardData?.departmentPerformance || [];
  const recentActivities = dashboardData?.recentActivities || [];

  return (
    <div>
      {/* Executive Welcome Banner */}
      <div className="coo-banner">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', background: 'var(--primary-subtle)', borderRadius: 'var(--radius-full)', color: 'var(--primary-darker)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
            🏢 Municipal Governance & Operations
          </div>
          <h2 className="coo-banner-title">Township Executive Command Center</h2>
          <p className="coo-banner-sub">
            DLF CyberCity & Aralias Smart Township · Macro Cross-Departmental Operational Telemetry
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => onNavigateTab('approvals')} className="btn-coo-primary">
            ⚖️ Review Pending Approvals ({summary.pendingApprovals})
          </button>
          <button onClick={() => onNavigateTab('work_orders')} className="btn-coo-secondary">
            📋 Township Work Orders
          </button>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="coo-kpi-grid">
        <div className="coo-kpi-card" onClick={() => onNavigateTab('departments')} style={{ cursor: 'pointer' }}>
          <div className="coo-kpi-top">
            <span className="coo-kpi-label">Total Departments</span>
            <span className="coo-kpi-icon">🏛️</span>
          </div>
          <div className="coo-kpi-value">{summary.totalDepartments}</div>
          <div className="coo-kpi-sub">Civic infrastructure verticals</div>
        </div>

        <div className="coo-kpi-card amber" onClick={() => onNavigateTab('work_orders')} style={{ cursor: 'pointer' }}>
          <div className="coo-kpi-top">
            <span className="coo-kpi-label">Open Complaints</span>
            <span className="coo-kpi-icon">⚠️</span>
          </div>
          <div className="coo-kpi-value">{summary.openComplaints}</div>
          <div className="coo-kpi-sub">Active resident tickets across sectors</div>
        </div>

        <div className="coo-kpi-card blue" onClick={() => onNavigateTab('work_orders')} style={{ cursor: 'pointer' }}>
          <div className="coo-kpi-top">
            <span className="coo-kpi-label">Active Work Orders</span>
            <span className="coo-kpi-icon">🛠️</span>
          </div>
          <div className="coo-kpi-value">{summary.activeWorkOrders}</div>
          <div className="coo-kpi-sub">Field contractors deployed</div>
        </div>

        <div className="coo-kpi-card amber" onClick={() => onNavigateTab('approvals')} style={{ cursor: 'pointer' }}>
          <div className="coo-kpi-top">
            <span className="coo-kpi-label">Pending Approvals</span>
            <span className="coo-kpi-icon">⚖️</span>
          </div>
          <div className="coo-kpi-value">{summary.pendingApprovals}</div>
          <div className="coo-kpi-sub">Requires COO joint sign-off</div>
        </div>

        <div className="coo-kpi-card red" onClick={() => onNavigateTab('work_orders')} style={{ cursor: 'pointer' }}>
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

        <div className="coo-panel-body" style={{ padding: 0 }}>
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
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-soft)' }}>
                      Loading departmental analytics...
                    </td>
                  </tr>
                ) : (
                  departments.map((dept) => (
                    <tr key={dept.id}>
                      <td>
                        <strong>{dept.name}</strong>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-soft)' }}>Code: {dept.code}</div>
                      </td>
                      <td>
                        {dept.headName !== 'Unassigned' ? (
                          <div>
                            <strong>{dept.headName}</strong>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-soft)' }}>{dept.headEmail}</div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Vacant (Assign Head)</span>
                        )}
                      </td>
                      <td>{dept.staffCount} Officers</td>
                      <td>
                        <span style={{ fontWeight: 700, color: dept.openComplaints > 0 ? 'var(--accent-amber)' : 'var(--text-soft)' }}>
                          {dept.openComplaints}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: dept.activeWorkOrders > 0 ? 'var(--accent-blue)' : 'var(--text-soft)' }}>
                          {dept.activeWorkOrders}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: dept.slaComplianceRate >= 90 ? 'var(--primary-dark)' : 'var(--accent-amber)' }}>
                            {dept.slaComplianceRate}%
                          </span>
                          <div style={{ width: '60px', height: '6px', background: 'var(--surface-muted)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${dept.slaComplianceRate}%`,
                                height: '100%',
                                background: dept.slaComplianceRate >= 90 ? 'var(--primary)' : 'var(--accent-amber)',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>
                            ₹{(dept.spentBudget / 100000).toFixed(1)}L / ₹{(dept.allocatedBudget / 100000).toFixed(1)}L
                          </span>
                          <div style={{ width: '80px', height: '6px', background: 'var(--surface-muted)', borderRadius: '3px', overflow: 'hidden', marginTop: '3px' }}>
                            <div
                              style={{
                                width: `${Math.min(100, dept.budgetUtilization)}%`,
                                height: '100%',
                                background: dept.budgetUtilization > 85 ? 'var(--accent-red)' : 'var(--primary)',
                              }}
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

      {/* Recent Activity Audit Stream */}
      <div className="coo-panel">
        <div className="coo-panel-header">
          <div>
            <h3 className="coo-panel-title">Recent Township Activity Stream</h3>
            <p className="coo-panel-subtitle">Real-time municipal audit log entries across all actors</p>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-soft)', fontWeight: 600 }}>
            ⚡ Live Event Stream
          </span>
        </div>

        <div className="coo-panel-body">
          {recentActivities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-soft)' }}>
              No recent audit trail entries logged.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentActivities.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'var(--primary-subtle)',
                        color: 'var(--primary-dark)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      🛡️
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)' }}>
                        {log.action} · <span style={{ fontWeight: 500, color: 'var(--text-soft)' }}>{log.notes}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '2px' }}>
                        By <strong>{log.actorName}</strong> ({log.actorRole}) · Target: {log.entityType} ({log.entityId?.slice(0, 8)}...)
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
