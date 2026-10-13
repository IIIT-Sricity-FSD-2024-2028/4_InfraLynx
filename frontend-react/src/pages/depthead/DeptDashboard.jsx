import { useState, useEffect } from 'react';
import { deptHeadApi } from '../../services/api.js';

export default function DeptDashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await deptHeadApi.getDashboard();
      const summary = res.summary || res;
      setData({
        ...summary,
        departmentName: res.departmentName || summary.departmentName || 'Civil Infrastructure & Roads',
        recentActivity: res.recentActivity || [],
      });
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', color: 'var(--text-soft)' }}>
        <div style={{ 
          width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #e0e7ff', borderTopColor: '#4f46e5', 
          animation: 'spin 1s linear infinite', marginBottom: '16px' 
        }}></div>
        <p style={{ fontSize: '15px', fontWeight: '500', letterSpacing: '0.5px' }}>Loading department metrics...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '24px', margin: '24px 0', boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <span style={{ background: '#fee2e2', color: '#dc2626', padding: '8px', borderRadius: '50%' }}>⚠️</span>
          <p style={{ color: '#b91c1c', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>Connection Error</p>
        </div>
        <p style={{ color: '#991b1b', fontSize: '15px', marginTop: '0', marginLeft: '48px' }}>{error}</p>
        <button 
          onClick={fetchDashboard} 
          style={{ marginTop: '16px', marginLeft: '48px', padding: '8px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'background 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.background = '#b91c1c'}
          onMouseOut={(e) => e.currentTarget.style.background = '#dc2626'}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const cardStyle = (id, baseColor, lightColor) => ({
    padding: '24px', 
    display: 'flex', 
    flexDirection: 'column', 
    justifyContent: 'space-between', 
    background: 'white',
    borderRadius: '16px',
    border: '1px solid #f1f5f9',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: hoveredCard === id ? 'translateY(-4px)' : 'translateY(0)',
    boxShadow: hoveredCard === id ? `0 12px 24px -8px ${lightColor}` : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  });

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .glass-btn { transition: all 0.2s; }
        .glass-btn:hover { background: rgba(255,255,255,0.2) !important; transform: translateX(4px); }
      `}</style>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '30px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
              {data.departmentName || 'Civil Infrastructure & Roads'}
            </h2>
            <span style={{ background: '#ede9fe', color: '#6d28d9', fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '12px', textTransform: 'uppercase' }}>
              Civil Exclusivity
            </span>
          </div>
          <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>
            Real-time operational metrics, work order SLA tracking, and estimate authorization for {data.departmentName || 'your department'}.
          </p>
        </div>
        <button 
          onClick={fetchDashboard} 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#334155', fontWeight: '600', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
        >
          <span style={{ fontSize: '16px' }}>↻</span> Refresh Data
        </button>
      </div>
      
      {/* 5-Card Metric Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '20px', marginBottom: '36px' }}>
        
        {/* Total Civil Work Orders */}
        <div 
          style={cardStyle(1, '#3b82f6', 'rgba(59, 130, 246, 0.3)')}
          onMouseEnter={() => setHoveredCard(1)} onMouseLeave={() => setHoveredCard(null)}
          onClick={() => onNavigate('work-orders')}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#3b82f6', transition: 'width 0.2s', ...(hoveredCard === 1 && { width: '8px' }) }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', paddingLeft: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Work Orders</span>
            <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '10px', color: '#3b82f6' }}>🏗️</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', paddingLeft: '8px' }}>
            <span style={{ fontSize: '36px', fontWeight: '900', color: '#0f172a', lineHeight: '1' }}>{data.totalWorkOrders}</span>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>({data.openWorkOrders} open)</span>
          </div>
        </div>

        {/* In-Progress Work Orders */}
        <div 
          style={cardStyle(2, '#f59e0b', 'rgba(245, 158, 11, 0.3)')}
          onMouseEnter={() => setHoveredCard(2)} onMouseLeave={() => setHoveredCard(null)}
          onClick={() => onNavigate('work-orders')}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#f59e0b', transition: 'width 0.2s', ...(hoveredCard === 2 && { width: '8px' }) }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', paddingLeft: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In-Progress Work Orders</span>
            <div style={{ background: '#fffbeb', padding: '8px', borderRadius: '10px', color: '#f59e0b' }}>⚙️</div>
          </div>
          <span style={{ fontSize: '36px', fontWeight: '900', color: '#0f172a', lineHeight: '1', paddingLeft: '8px' }}>{data.inProgressWorkOrders}</span>
        </div>

        {/* Completed Work Orders */}
        <div 
          style={cardStyle(3, '#10b981', 'rgba(16, 185, 129, 0.3)')}
          onMouseEnter={() => setHoveredCard(3)} onMouseLeave={() => setHoveredCard(null)}
          onClick={() => onNavigate('work-orders')}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#10b981', transition: 'width 0.2s', ...(hoveredCard === 3 && { width: '8px' }) }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', paddingLeft: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed Work Orders</span>
            <div style={{ background: '#ecfdf5', padding: '8px', borderRadius: '10px', color: '#10b981' }}>✅</div>
          </div>
          <span style={{ fontSize: '36px', fontWeight: '900', color: '#0f172a', lineHeight: '1', paddingLeft: '8px' }}>{data.completedWorkOrders}</span>
        </div>

        {/* Pending Estimate Approvals */}
        <div 
          style={cardStyle(4, '#8b5cf6', 'rgba(139, 92, 246, 0.3)')}
          onMouseEnter={() => setHoveredCard(4)} onMouseLeave={() => setHoveredCard(null)}
          onClick={() => onNavigate('approvals')}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#8b5cf6', transition: 'width 0.2s', ...(hoveredCard === 4 && { width: '8px' }) }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', paddingLeft: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Approvals</span>
            <div style={{ background: '#f5f3ff', padding: '8px', borderRadius: '10px', color: '#8b5cf6' }}>✍️</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '8px' }}>
            <span style={{ fontSize: '36px', fontWeight: '900', color: '#0f172a', lineHeight: '1', marginBottom: '8px' }}>{data.pendingApprovals}</span>
            <span style={{ color: '#8b5cf6', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Review Queue <span style={{ transition: 'transform 0.2s', transform: hoveredCard === 4 ? 'translateX(4px)' : 'none' }}>&rarr;</span>
            </span>
          </div>
        </div>

        {/* SLA-at-Risk & Overdue */}
        <div 
          style={cardStyle(5, '#ef4444', 'rgba(239, 68, 68, 0.3)')}
          onMouseEnter={() => setHoveredCard(5)} onMouseLeave={() => setHoveredCard(null)}
          onClick={() => onNavigate('work-orders')}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#ef4444', transition: 'width 0.2s', ...(hoveredCard === 5 && { width: '8px' }) }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', paddingLeft: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SLA Overdue / At-Risk</span>
            <div style={{ background: '#fef2f2', padding: '8px', borderRadius: '10px', color: '#ef4444' }}>🚨</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '8px' }}>
            <span style={{ fontSize: '36px', fontWeight: '900', color: '#0f172a', lineHeight: '1', marginBottom: '8px' }}>{data.overdueWorkOrders}</span>
            <span style={{ color: '#ef4444', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View Escalations <span style={{ transition: 'transform 0.2s', transform: hoveredCard === 5 ? 'translateX(4px)' : 'none' }}>&rarr;</span>
            </span>
          </div>
        </div>

      </div>
      
      {/* Two-Column Middle Section: Expenditure Analytics & Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px', marginBottom: '36px' }}>
        
        {/* Left Panel: Analytics & Expenditure */}
        <div style={{ background: 'white', padding: '30px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%' }}></span>
            {data.departmentName || 'Department'} Expenditure & Compliance
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f8fafc', borderRadius: '12px' }}>
              <span style={{ color: '#475569', fontWeight: '600' }}>Open Work Orders</span>
              <strong style={{ fontSize: '18px', color: '#0f172a', fontWeight: '800' }}>{data.openWorkOrders}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f8fafc', borderRadius: '12px' }}>
              <span style={{ color: '#475569', fontWeight: '600' }}>Pending Citizen Complaints</span>
              <strong style={{ fontSize: '18px', color: '#0f172a', fontWeight: '800' }}>{data.pendingComplaints}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px' }}>
              <span style={{ color: '#166534', fontWeight: '600' }}>Average SLA Compliance</span>
              <strong style={{ fontSize: '18px', color: '#15803d', fontWeight: '900' }}>{data.averageSlaCompliance}</strong>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px dashed #e2e8f0', paddingTop: '20px', marginTop: '6px' }}>
              <div>
                <span style={{ display: 'block', color: '#334155', fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>{data.departmentName || 'Department'} Expenditure</span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Cumulative across active & closed work orders</span>
              </div>
              <strong style={{ fontSize: '26px', color: '#0f172a', fontWeight: '900', letterSpacing: '-0.5px' }}>
                ₹{data.totalExpenditure?.toLocaleString() || '0'}
              </strong>
            </div>
          </div>
        </div>
        
        {/* Right Panel: Quick Actions (Glassmorphism / Indigo Theme) */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', 
          padding: '32px', 
          borderRadius: '20px', 
          boxShadow: '0 20px 25px -5px rgba(49, 46, 129, 0.4)', 
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* Decorative glows */}
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: '#6366f1', borderRadius: '50%', filter: 'blur(50px)', opacity: '0.4' }}></div>
          <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '200px', height: '200px', background: '#8b5cf6', borderRadius: '50%', filter: 'blur(60px)', opacity: '0.3' }}></div>
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Civil Governance Actions</h4>
            <p style={{ color: '#e0e7ff', fontSize: '14px', marginBottom: '28px', lineHeight: '1.5', opacity: '0.9' }}>
              Direct access to Civil employee management, contractor AMC estimate authorizations, and work orders.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <button 
                className="glass-btn"
                onClick={() => onNavigate('employees')}
                style={{ 
                  width: '100%', textAlign: 'left', 
                  background: 'rgba(255,255,255,0.08)', 
                  border: '1px solid rgba(255,255,255,0.15)', 
                  padding: '16px 20px', 
                  borderRadius: '14px', 
                  color: 'white', 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  cursor: 'pointer', fontWeight: '600', fontSize: '15px',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ background: 'rgba(255,255,255,0.15)', padding: '6px', borderRadius: '8px' }}>👥</span>
                  <span>View Civil Employees ({data.departmentName})</span>
                </div>
                <span style={{ color: '#a5b4fc', fontSize: '18px' }}>&rarr;</span>
              </button>
  
              <button 
                className="glass-btn"
                onClick={() => onNavigate('approvals')}
                style={{ 
                  width: '100%', textAlign: 'left', 
                  background: 'rgba(255,255,255,0.08)', 
                  border: '1px solid rgba(255,255,255,0.15)', 
                  padding: '16px 20px', 
                  borderRadius: '14px', 
                  color: 'white', 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  cursor: 'pointer', fontWeight: '600', fontSize: '15px',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ background: 'rgba(255,255,255,0.15)', padding: '6px', borderRadius: '8px' }}>📑</span>
                  <span>Pending Approvals Queue ({data.pendingApprovals})</span>
                </div>
                <span style={{ color: '#f9a8d4', fontSize: '18px' }}>&rarr;</span>
              </button>

              <button 
                className="glass-btn"
                onClick={() => onNavigate('work-orders')}
                style={{ 
                  width: '100%', textAlign: 'left', 
                  background: 'rgba(255,255,255,0.08)', 
                  border: '1px solid rgba(255,255,255,0.15)', 
                  padding: '16px 20px', 
                  borderRadius: '14px', 
                  color: 'white', 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  cursor: 'pointer', fontWeight: '600', fontSize: '15px',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ background: 'rgba(255,255,255,0.15)', padding: '6px', borderRadius: '8px' }}>🛠️</span>
                  <span>Browse Civil Work Orders</span>
                </div>
                <span style={{ color: '#93c5fd', fontSize: '18px' }}>&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panel: Recent Civil Department Activity */}
      <div style={{ background: 'white', padding: '30px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span>
          Recent Activity ({data.departmentName || 'Department'})
        </h4>

        {(!data.recentActivity || data.recentActivity.length === 0) ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
            No recent activity logged for {data.departmentName || 'this department'} yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.recentActivity.slice(0, 8).map((act, i) => (
              <div key={act.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#f8fafc', borderRadius: '12px', borderLeft: '4px solid #6366f1' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>
                      {act.action?.replace(/_/g, ' ')}
                    </span>
                    <span style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px' }}>
                      {act.actor_role || 'STAFF'}
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', color: '#475569' }}>
                    {act.notes || 'System transaction recorded.'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap', marginLeft: '16px' }}>
                  {act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

