import { useState, useEffect } from 'react';
import { deptHeadApi } from '../../services/api.js';
import ComplaintDetailsModal from './ComplaintDetailsModal.jsx';

export default function DeptDashboard({ onNavigate, onSelectComplaint }) {
  const [data, setData] = useState(null);
  const [civilComplaints, setCivilComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [hoveredCard, setHoveredCard] = useState(null);

  // Complaints list filtering & modal states
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComplaintForModal, setSelectedComplaintForModal] = useState(null);
  const [refreshingComplaints, setRefreshingComplaints] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await deptHeadApi.getDashboard();
      const summary = res.summary || res;
      
      let complaints = res.complaints || [];
      if (complaints.length === 0) {
        try {
          const cRes = await deptHeadApi.getComplaints();
          complaints = cRes || [];
        } catch (cErr) {
          console.warn('Fallback getComplaints error:', cErr.message);
        }
      }

      setCivilComplaints(complaints);
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

  const handleRefreshComplaints = async () => {
    try {
      setRefreshingComplaints(true);
      const res = await deptHeadApi.getComplaints();
      setCivilComplaints(res || []);
    } catch (err) {
      console.warn('Refresh complaints error:', err.message);
    } finally {
      setRefreshingComplaints(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', color: 'var(--text-soft)' }}>
        <div style={{ 
          width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #e0e7ff', borderTopColor: '#4f46e5', 
          animation: 'spin 1s linear infinite', marginBottom: '16px' 
        }}></div>
        <p style={{ fontSize: '15px', fontWeight: '500', letterSpacing: '0.5px' }}>Loading Civil department metrics & complaints...</p>
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

  // Status badge style mapping
  const getStatusBadge = (status) => {
    const s = (status || 'REPORTED').toUpperCase();
    const map = {
      REPORTED: { bg: '#e0f2fe', color: '#0369a1', label: 'Reported' },
      UNDER_REVIEW: { bg: '#f1f5f9', color: '#475569', label: 'Under Review' },
      VALIDATED: { bg: '#ede9fe', color: '#6d28d9', label: 'Validated' },
      WORK_ORDER_CREATED: { bg: '#f5f3ff', color: '#7c3aed', label: 'Work Order Created' },
      ASSIGNED: { bg: '#e0e7ff', color: '#3730a3', label: 'Assigned' },
      IN_PROGRESS: { bg: '#fef3c7', color: '#b45309', label: 'In Progress' },
      AWAITING_DEPT_HEAD: { bg: '#fae8ff', color: '#86198f', label: 'Awaiting Dept Head' },
      AWAITING_COO: { bg: '#ffedd5', color: '#c2410c', label: 'Awaiting COO' },
      PENDING_VERIFICATION: { bg: '#e0f2fe', color: '#0284c7', label: 'Pending Verification' },
      COMPLETED: { bg: '#dcfce7', color: '#15803d', label: 'Completed' },
      CLOSED: { bg: '#dcfce7', color: '#166534', label: 'Closed / Verified' },
      REJECTED: { bg: '#fee2e2', color: '#b91c1c', label: 'Rejected' },
      DISPUTED: { bg: '#fef2f2', color: '#dc2626', label: 'Disputed' },
    };
    const current = map[s] || { bg: '#f3f4f6', color: '#374151', label: s.replace(/_/g, ' ') };
    return (
      <span style={{ 
        background: current.bg, 
        color: current.color, 
        padding: '3px 8px', 
        borderRadius: '6px', 
        fontSize: '11px', 
        fontWeight: '700',
        display: 'inline-block',
        whiteSpace: 'nowrap'
      }}>
        {current.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const p = (priority || 'MEDIUM').toUpperCase();
    const map = {
      EMERGENCY: { bg: '#fee2e2', color: '#b91c1c' },
      HIGH: { bg: '#ffedd5', color: '#c2410c' },
      MEDIUM: { bg: '#fef3c7', color: '#b45309' },
      LOW: { bg: '#f1f5f9', color: '#475569' },
    };
    const current = map[p] || map.MEDIUM;
    return (
      <span style={{
        background: current.bg,
        color: current.color,
        padding: '2px 7px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '700',
        textTransform: 'uppercase'
      }}>
        {p}
      </span>
    );
  };

  // Filter complaints based on user controls
  const filteredComplaints = civilComplaints.filter((c) => {
    if (statusFilter !== 'ALL') {
      if ((c.status || '').toUpperCase() !== statusFilter.toUpperCase()) return false;
    }
    if (priorityFilter !== 'ALL') {
      const p = (c.priority || c.severity || '').toUpperCase();
      if (p !== priorityFilter.toUpperCase()) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const code = (c.complaint_code || c.id || '').toLowerCase();
      const title = (c.title || '').toLowerCase();
      const desc = (c.description || '').toLowerCase();
      const loc = (c.location_details || c.sector || c.block || c.street || '').toLowerCase();
      const cat = (c.subcategory || c.category || '').toLowerCase();
      const reporter = (c.reported_by_name || '').toLowerCase();
      if (!code.includes(q) && !title.includes(q) && !desc.includes(q) && !loc.includes(q) && !cat.includes(q) && !reporter.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Calculate dynamic counts
  const totalCount = civilComplaints.length;
  const pendingCount = civilComplaints.filter((c) => ['REPORTED', 'UNDER_REVIEW', 'VALIDATED', 'AWAITING_DEPT_HEAD', 'WORK_ORDER_CREATED'].includes((c.status || '').toUpperCase())).length;
  const inProgressCount = civilComplaints.filter((c) => ['IN_PROGRESS', 'ASSIGNED'].includes((c.status || '').toUpperCase())).length;
  const resolvedCount = civilComplaints.filter((c) => ['COMPLETED', 'CLOSED'].includes((c.status || '').toUpperCase())).length;
  const rejectedCount = civilComplaints.filter((c) => (c.status || '').toUpperCase() === 'REJECTED').length;

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
        .complaint-row:hover { background: #f8fafc !important; }
      `}</style>
      
      {/* Header */}
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
            Comprehensive operational control, complaints registry, work order SLA tracking, and estimate authorization for {data.departmentName || 'Civil Department'}.
          </p>
        </div>
        <button 
          onClick={fetchDashboard} 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#334155', fontWeight: '600', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
        >
          <span style={{ fontSize: '16px' }}>↻</span> Refresh Dashboard
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

      {/* ─────────────────────────────────────────────────────────────────────────────
          CIVIL DEPARTMENT COMPLAINTS REGISTRY (ALL STATUSES INCLUDED)
          Requirements:
          1. Full complaint description, ID, status, priority, and location shown without truncation.
          2. Shows all Civil complaints: pending, in-progress, rejected, and resolved (never filtered out by status).
          3. Filtered strictly by Civil department using live backend data.
         ───────────────────────────────────────────────────────────────────────────── */}
      <div style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', padding: '28px', marginBottom: '36px' }}>
        
        {/* Registry Header & Stats Pills */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '20px' }}>📋</span>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Civil Department Complaints Registry
              </h3>
              <span style={{ background: '#ede9fe', color: '#6d28d9', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                All Statuses
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              Live citizen and RWA complaints assigned to the Civil Department. Showing all stages: pending validation, in-progress repair, rejected tickets, and resolved closures.
            </p>
          </div>

          <button
            onClick={handleRefreshComplaints}
            disabled={refreshingComplaints}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#334155', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
          >
            <span>{refreshingComplaints ? '⌛' : '↻'}</span> {refreshingComplaints ? 'Refreshing...' : 'Refresh Complaints'}
          </button>
        </div>

        {/* Dynamic Status Breakdown Badges */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <div 
            onClick={() => setStatusFilter('ALL')}
            style={{ 
              padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
              background: statusFilter === 'ALL' ? '#1e293b' : '#f1f5f9',
              color: statusFilter === 'ALL' ? '#ffffff' : '#475569',
              transition: 'all 0.2s'
            }}
          >
            All Civil Complaints ({totalCount})
          </div>
          <div 
            onClick={() => setStatusFilter('REPORTED')}
            style={{ 
              padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
              background: statusFilter === 'REPORTED' ? '#0369a1' : '#e0f2fe',
              color: statusFilter === 'REPORTED' ? '#ffffff' : '#0369a1',
              transition: 'all 0.2s'
            }}
          >
            Pending / Open ({pendingCount})
          </div>
          <div 
            onClick={() => setStatusFilter('IN_PROGRESS')}
            style={{ 
              padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
              background: statusFilter === 'IN_PROGRESS' ? '#b45309' : '#fef3c7',
              color: statusFilter === 'IN_PROGRESS' ? '#ffffff' : '#b45309',
              transition: 'all 0.2s'
            }}
          >
            In-Progress ({inProgressCount})
          </div>
          <div 
            onClick={() => setStatusFilter('COMPLETED')}
            style={{ 
              padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
              background: statusFilter === 'COMPLETED' ? '#15803d' : '#dcfce7',
              color: statusFilter === 'COMPLETED' ? '#ffffff' : '#15803d',
              transition: 'all 0.2s'
            }}
          >
            Resolved / Closed ({resolvedCount})
          </div>
          <div 
            onClick={() => setStatusFilter('REJECTED')}
            style={{ 
              padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
              background: statusFilter === 'REJECTED' ? '#b91c1c' : '#fee2e2',
              color: statusFilter === 'REJECTED' ? '#ffffff' : '#b91c1c',
              transition: 'all 0.2s'
            }}
          >
            Rejected Complaints ({rejectedCount})
          </div>
        </div>

        {/* Filter Controls Toolbar */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px', padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <input 
              type="text" 
              placeholder="🔍 Search Complaint Code, description, location, or reporter..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '9px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#ffffff', fontSize: '13px', fontWeight: '500' }}
              >
                <option value="ALL">All Statuses ({totalCount})</option>
                <option value="REPORTED">Reported</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="VALIDATED">Validated</option>
                <option value="WORK_ORDER_CREATED">Work Order Created</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="AWAITING_DEPT_HEAD">Awaiting Dept Head</option>
                <option value="PENDING_VERIFICATION">Pending Verification</option>
                <option value="COMPLETED">Completed</option>
                <option value="CLOSED">Closed / Verified</option>
                <option value="REJECTED">Rejected</option>
                <option value="DISPUTED">Disputed</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#ffffff', fontSize: '13px', fontWeight: '500' }}
              >
                <option value="ALL">All Priorities</option>
                <option value="EMERGENCY">Emergency</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {(statusFilter !== 'ALL' || priorityFilter !== 'ALL' || searchQuery.trim()) && (
              <button 
                onClick={() => { setStatusFilter('ALL'); setPriorityFilter('ALL'); setSearchQuery(''); }}
                style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: '4px 8px' }}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Complaints Table (Untruncated) */}
        {filteredComplaints.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📂</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>No Civil Complaints Found</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>
              {statusFilter !== 'ALL' || searchQuery.trim() 
                ? 'No complaints match the selected filter criteria. Try resetting filters.' 
                : 'No complaints are currently logged under the Civil Department.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '14px 16px', fontWeight: '800', color: '#475569', fontSize: '12px', textTransform: 'uppercase', minWidth: '150px' }}>
                    Complaint ID & Date
                  </th>
                  <th style={{ padding: '14px 16px', fontWeight: '800', color: '#475569', fontSize: '12px', textTransform: 'uppercase', minWidth: '320px' }}>
                    Title & Full Description
                  </th>
                  <th style={{ padding: '14px 16px', fontWeight: '800', color: '#475569', fontSize: '12px', textTransform: 'uppercase', minWidth: '130px' }}>
                    Category & Priority
                  </th>
                  <th style={{ padding: '14px 16px', fontWeight: '800', color: '#475569', fontSize: '12px', textTransform: 'uppercase', minWidth: '180px' }}>
                    Complete Location
                  </th>
                  <th style={{ padding: '14px 16px', fontWeight: '800', color: '#475569', fontSize: '12px', textTransform: 'uppercase', minWidth: '130px' }}>
                    Current Status
                  </th>
                  <th style={{ padding: '14px 16px', fontWeight: '800', color: '#475569', fontSize: '12px', textTransform: 'uppercase', minWidth: '160px' }}>
                    SLA & Work Order
                  </th>
                  <th style={{ padding: '14px 16px', fontWeight: '800', color: '#475569', fontSize: '12px', textTransform: 'uppercase', textAlign: 'center', minWidth: '110px' }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((c) => {
                  const code = c.complaint_code || c.complaintCode || c.id;
                  const dateStr = c.reported_at || c.created_at;
                  const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString() : 'Recent';
                  const formattedTime = dateStr ? new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                  const locDetails = c.location_details || [c.sector, c.block, c.street].filter(Boolean).join(', ') || 'Sector 54';
                  const isBreached = c.sla_deadline && new Date(c.sla_deadline) < new Date() && c.status !== 'COMPLETED' && c.status !== 'CLOSED';
                  
                  return (
                    <tr 
                      key={c.id || code} 
                      className="complaint-row"
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s', background: c.status === 'REJECTED' ? '#fffbfb' : 'transparent' }}
                    >
                      {/* 1. ID & Date */}
                      <td style={{ padding: '16px', verticalAlign: 'top' }}>
                        <div 
                          onClick={() => setSelectedComplaintForModal(c)}
                          style={{ fontWeight: '800', color: '#4f46e5', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {code}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          📅 {formattedDate}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          ⏰ {formattedTime}
                        </div>
                      </td>

                      {/* 2. Full Title & Untruncated Description */}
                      <td style={{ padding: '16px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px', marginBottom: '4px' }}>
                          {c.title || `${c.category || 'Civil'}: ${c.subcategory || 'General'}`}
                        </div>
                        <div style={{ 
                          fontSize: '13px', 
                          color: '#334155', 
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap', 
                          wordBreak: 'break-word',
                          background: '#f8fafc',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #f1f5f9'
                        }}>
                          {c.description || 'No detailed description provided.'}
                        </div>
                        {c.status === 'REJECTED' && c.rejection_reason && (
                          <div style={{ marginTop: '6px', fontSize: '12px', color: '#b91c1c', background: '#fee2e2', padding: '4px 8px', borderRadius: '6px', fontWeight: '600' }}>
                            🚫 Rejection: {c.rejection_reason}
                          </div>
                        )}
                      </td>

                      {/* 3. Category & Priority */}
                      <td style={{ padding: '16px', verticalAlign: 'top' }}>
                        <div style={{ marginBottom: '6px' }}>
                          <span style={{ background: '#ede9fe', color: '#6d28d9', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px' }}>
                            {c.category || 'Civil'}
                          </span>
                        </div>
                        {c.subcategory && (
                          <div style={{ fontSize: '12px', color: '#475569', marginBottom: '6px', fontWeight: '500' }}>
                            • {c.subcategory}
                          </div>
                        )}
                        <div>
                          {getPriorityBadge(c.priority || c.severity)}
                        </div>
                      </td>

                      {/* 4. Complete Location */}
                      <td style={{ padding: '16px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>📍</span> {c.sector || 'Sector 54'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px', lineHeight: 1.4 }}>
                          {locDetails}
                        </div>
                        {c.asset_id && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                            Asset ID: <code>{c.asset_id}</code>
                          </div>
                        )}
                      </td>

                      {/* 5. Status Badge */}
                      <td style={{ padding: '16px', verticalAlign: 'top' }}>
                        {getStatusBadge(c.status)}
                      </td>

                      {/* 6. SLA & Work Order */}
                      <td style={{ padding: '16px', verticalAlign: 'top' }}>
                        <div>
                          {isBreached ? (
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#dc2626' }}>
                              🚨 Overdue SLA
                            </span>
                          ) : c.status === 'COMPLETED' || c.status === 'CLOSED' ? (
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a' }}>
                              ✅ Resolved
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#0284c7' }}>
                              Due: {c.sla_deadline ? new Date(c.sla_deadline).toLocaleDateString() : '48h'}
                            </span>
                          )}
                        </div>
                        {c.work_order ? (
                          <div style={{ marginTop: '6px', fontSize: '12px', color: '#4338ca', fontWeight: '600' }}>
                            WO: {c.work_order.work_order_number || c.work_order.id}
                          </div>
                        ) : (
                          <div style={{ marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
                            No WO assigned
                          </div>
                        )}
                      </td>

                      {/* 7. Action Button */}
                      <td style={{ padding: '16px', verticalAlign: 'top', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedComplaintForModal(c)}
                          style={{
                            padding: '6px 14px',
                            background: '#4f46e5',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(79, 70, 229, 0.2)',
                            transition: 'background 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = '#4338ca'}
                          onMouseOut={(e) => e.currentTarget.style.background = '#4f46e5'}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

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
              <span style={{ color: '#475569', fontWeight: '600' }}>Total Civil Complaints Logged</span>
              <strong style={{ fontSize: '18px', color: '#0f172a', fontWeight: '800' }}>{totalCount}</strong>
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

      {/* Complete Complaint Details Modal */}
      {selectedComplaintForModal && (
        <ComplaintDetailsModal 
          complaint={selectedComplaintForModal}
          onClose={() => setSelectedComplaintForModal(null)}
        />
      )}

    </div>
  );
}
