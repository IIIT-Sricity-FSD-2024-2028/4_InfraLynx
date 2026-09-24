import { useTIMS } from '../../context/TIMSContext.jsx'

export default function DeptDashboard({ onNavigate, onSelectComplaint }) {
  const { complaints } = useTIMS()

  const openComplaints = complaints.filter(c => !['CLOSED', 'COMPLETED'].includes(c.status)).length
  const activeWorkOrders = complaints.filter(c => ['IN_PROGRESS', 'ASSIGNED'].includes(c.status)).length
  const pendingApprovals = complaints.filter(c => c.status === 'AWAITING_DEPT_HEAD').length
  const escalatedCount = complaints.filter(c => c.status === 'ESCALATED' || c.status === 'SLA_BREACHED').length

  const completedCount = complaints.filter(c => c.status === 'COMPLETED' || c.status === 'CLOSED').length
  
  // Calculate mock department expenditure (sum of estimates for completed/closed work orders)
  const totalExpenditure = complaints
    .filter(c => (c.status === 'COMPLETED' || c.status === 'CLOSED') && c.estimateAmount)
    .reduce((sum, c) => sum + (Number(c.estimateAmount) || 0), 0)

  return (
    <div>
      <h2 className="dept-page-title">Department Dashboard</h2>
      
      <div className="dept-grid">
        <div className="panel-card dept-metric-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <span className="dept-metric-title">Open Complaints</span>
          <span className="dept-metric-value">{openComplaints}</span>
        </div>
        <div className="panel-card dept-metric-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <span className="dept-metric-title">Active Work Orders</span>
          <span className="dept-metric-value">{activeWorkOrders}</span>
        </div>
        <div className="panel-card dept-metric-card" style={{ borderLeft: '4px solid #6366f1' }}>
          <span className="dept-metric-title">Pending Approvals</span>
          <span className="dept-metric-value">{pendingApprovals}</span>
          <button className="button button-ghost" style={{ alignSelf: 'flex-start', marginTop: '10px', color: '#6366f1' }} onClick={() => onNavigate('approvals')}>
            Review Queue &rarr;
          </button>
        </div>
        <div className="panel-card dept-metric-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <span className="dept-metric-title">Escalations / SLA Breaches</span>
          <span className="dept-metric-value">{escalatedCount}</span>
          <button className="button button-ghost" style={{ alignSelf: 'flex-start', marginTop: '10px', color: '#ef4444' }} onClick={() => onNavigate('escalations')}>
            View Escalations &rarr;
          </button>
        </div>
      </div>

      <h3 className="dept-page-title" style={{ marginTop: '48px', fontSize: '20px' }}>Department Analytics</h3>
      <div className="dept-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="panel-card" style={{ padding: '24px' }}>
          <h4 style={{ marginBottom: '16px', color: 'var(--text-soft)' }}>Work Overview</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>Completed Work</span>
            <strong>{completedCount}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>Pending Work</span>
            <strong>{openComplaints}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>Avg. Resolution Time</span>
            <strong>2.4 Days</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>SLA Compliance</span>
            <strong style={{ color: 'var(--primary)' }}>94%</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: '8px', marginTop: '8px' }}>
            <span>Total Department Expenditure</span>
            <strong>₹{totalExpenditure.toLocaleString()}</strong>
          </div>
        </div>
        
        <div className="panel-card" style={{ padding: '24px' }}>
          <h4 style={{ marginBottom: '16px', color: 'var(--text-soft)' }}>Contractor Activity</h4>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Top performing contractors and active jobs.</p>
          <ul style={{ marginTop: '16px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>BuildIt Civil Contractors</span>
              <span className="badge-eyebrow">4 Active</span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>UrbanFix Solutions</span>
              <span className="badge-eyebrow">2 Active</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
