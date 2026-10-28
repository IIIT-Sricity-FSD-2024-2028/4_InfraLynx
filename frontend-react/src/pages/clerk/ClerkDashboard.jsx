/**
 * ClerkDashboard - Screen 1: Desk Clerk Operations Queue & Metrics Overview
 *
 * Key Features:
 * - Real-time operational KPI metrics (Total complaints, Pending triage, Active WOs, Awaiting Dept Head, Closed).
 * - Multi-criteria client-side search (by ID, title, street, block).
 * - Multi-level filtering (by status pills and civic subcategories).
 * - Quick action buttons routing directly to Triage, Work Order creation, and Tracker views.
 *
 * Key React Concepts:
 * - Derived State (useMemo): Calculates statistics and filtered arrays without redundant re-renders.
 * - Controlled Search & Filter Inputs: Local state updates trigger instant filtered view updates.
 * - Component Communication: Prop callbacks (onNavigate, onSelectComplaint) notify parent ClerkPortal.
 */
import { useState, useMemo } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import { isComplaintInClerkDepartment } from './ClerkPortal.jsx'
import './styles/ClerkDashboard.css'

const STATUS_MAP = {
  REPORTED:             { label: 'Reported',           bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  UNDER_REVIEW:         { label: 'Under Review',       bg: '#fffbeb', color: '#92400e', border: '#fde68a', pulse: true },
  VALIDATED:            { label: 'Validated',          bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  REJECTED:             { label: 'Rejected',           bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  WORK_ORDER_CREATED:   { label: 'WO Created',         bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  AWAITING_DEPT_HEAD:   { label: 'Awaiting Dept Head', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', pulse: true },
  ASSIGNED:             { label: 'Assigned',           bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  IN_PROGRESS:          { label: 'In Progress',        bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', pulse: true },
  COMPLETED:            { label: 'Completed',          bg: '#f0fdf4', color: '#166534', border: '#86efac' },
  PENDING_VERIFICATION: { label: 'Pending Verify',     bg: '#fffbeb', color: '#92400e', border: '#fde68a', pulse: true },
  CLOSED:               { label: 'Closed',             bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
}

const STATUS_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'TRIAGE', label: 'Needs Triage' },
  { id: 'ACTIVE', label: 'Active WO' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CLOSED', label: 'Closed' },
]

export default function ClerkDashboard({
  // --- Props Received from Parent (ClerkPortal) ---
  complaints: propComplaints,          // Complaints list passed down from parent ClerkPortal
  onNavigate,                          // Callback function to switch between portal screens ('triage', 'workorder', 'tracker')
  onSelectComplaint,                   // Callback function to set the active complaint for inspection/triage
  successNotice,                       // Active green toast notification banner object (id & message)
  onDismissNotice,                     // Callback function to close the success toast notification
}) {
  // --- 1. Global Context Consumption (TIMSContext) ---
  // Retrieves logged-in Clerk profile (currentUser) and fallback global complaints
  const { complaints: contextComplaints = [], currentUser } = useTIMS()

  // --- 2. Derived Department Complaints (useMemo) ---
  // Uses complaints passed via props (from ClerkPortal); otherwise falls back to context complaints
  // and filters them strictly to the Desk Clerk's assigned department (e.g. Civil only)
  const complaints = useMemo(() => {
    if (propComplaints) return propComplaints
    return contextComplaints.filter(c => isComplaintInClerkDepartment(c, currentUser))
  }, [propComplaints, contextComplaints, currentUser])

  // --- 3. Component Local State Management (useState) ---
  const [searchQuery, setSearchQuery]           = useState('')      // Controlled input for live search (ID, title, block, street)
  const [selectedStatus, setSelectedStatus]     = useState('ALL')   // Active status filter pill ('ALL', 'TRIAGE', 'ACTIVE', 'COMPLETED', 'CLOSED')
  const [selectedCategory, setSelectedCategory] = useState('ALL')   // Active civic subcategory filter pill

  // Display label of the clerk's assigned department (defaults to 'Operations' if unassigned)
  const deptDisplay = currentUser?.department_name || 'Operations'

  // --- 4. Derived State: Unique Subcategories & KPI Metrics (Memoized) ---
  // Extracts unique civic subcategories present in this department complaints
  const subcategoryOptions = useMemo(() => {
    const seen = new Set()
    complaints.forEach(c => {
      const sub = c.subcategory || c.subCategory
      if (sub && typeof sub === 'string' && sub.trim()) seen.add(sub.trim())
    })
    return Array.from(seen).sort()
  }, [complaints])

  const stats = useMemo(() => ({
    total: complaints.length,
    pendingTriage: complaints.filter(c => c.status === 'REPORTED' || c.status === 'UNDER_REVIEW').length,
    workOrdersRaised: complaints.filter(c => ['WORK_ORDER_CREATED','ASSIGNED','IN_PROGRESS','COMPLETED','PENDING_VERIFICATION'].includes(c.status)).length,
    awaitingDeptHead: complaints.filter(c => c.status === 'AWAITING_DEPT_HEAD').length,
    closed: complaints.filter(c => c.status === 'CLOSED').length,
  }), [complaints])

    // --- 2. Live Client-Side Search & Multi-Filter Logic (Memoized) ---
  // Filters complaints by text query, lifecycle status, and subcategory
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return complaints.filter(c => {
      const matchSearch = !q ||
        c.id?.toLowerCase().includes(q) ||
        c.title?.toLowerCase().includes(q) ||
        (c.location?.street || '').toLowerCase().includes(q) ||
        (c.location?.block || '').toLowerCase().includes(q)

      const matchStatus =
        selectedStatus === 'ALL' ? true :
        selectedStatus === 'TRIAGE' ? (c.status === 'REPORTED' || c.status === 'UNDER_REVIEW') :
        selectedStatus === 'ACTIVE' ? ['VALIDATED','WORK_ORDER_CREATED','ASSIGNED','IN_PROGRESS','AWAITING_DEPT_HEAD'].includes(c.status) :
        selectedStatus === 'COMPLETED' ? ['COMPLETED','PENDING_VERIFICATION'].includes(c.status) :
        selectedStatus === 'CLOSED' ? (c.status === 'CLOSED' || c.status === 'REJECTED') :
        c.status === selectedStatus

      const sub = (c.subCategory || c.subcategory || c.title || '').toLowerCase()
      const matchCat = selectedCategory === 'ALL' || sub.includes(selectedCategory.toLowerCase())

      return matchSearch && matchStatus && matchCat
    })
  }, [complaints, searchQuery, selectedStatus, selectedCategory])

  const metricItems = [
    { label: 'Department Complaints', val: stats.total, sub: `${deptDisplay} register` },
    { label: 'Pending Triage', val: stats.pendingTriage, sub: 'Awaiting clerk review', alert: stats.pendingTriage > 0 ? 'amber' : '' },
    { label: 'Work Orders Raised', val: stats.workOrdersRaised, sub: 'Dispatched to contractors', color: 'blue' },
    { label: 'Awaiting Dept Head', val: stats.awaitingDeptHead, sub: 'Approval required', alert: stats.awaitingDeptHead > 0 ? 'orange' : '' },
    { label: 'Closed / Resolved', val: stats.closed, sub: 'RWA verified & signed off', color: 'green' },
  ]

  return (
    <div className="cd-root">
      <div className="cd-welcome">
        <span className="cd-welcome-badge">Desk Clerk &bull; {deptDisplay}</span>
        <div className="cd-welcome-title">Good day, {currentUser?.name}</div>
        <div className="cd-welcome-sub">
          Review and triage complaints assigned to the <strong>{deptDisplay}</strong> department, validate tickets, and dispatch work orders.
        </div>
      </div>

      {successNotice && (
        <div className="cd-toast">
          <div>
            <div className="cd-toast-title">&#10003; Action Successful &mdash; {successNotice.id}</div>
            <div className="cd-toast-msg">{successNotice.message}</div>
          </div>
          <button className="cd-toast-dismiss" onClick={onDismissNotice}>&#10005;</button>
        </div>
      )}

      <div className="cd-metrics">
        {metricItems.map(({ label, val, sub, alert, color }) => (
          <div key={label} className={`cd-metric-card${alert ? ` ${alert}-alert` : ''}`}>
            <div className="cd-metric-label">{label}</div>
            <div className={`cd-metric-val${alert ? ` ${alert}` : color ? ` ${color}` : ''}`}>{val}</div>
            <div className="cd-metric-sub">{sub}</div>
          </div>
        ))}
      </div>

      <div className="cd-filter-bar">
        <div className="cd-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="cd-search-icon">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="input-clerk-search"
            type="text"
            placeholder="Search by ID, title, location..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="cd-search-input"
          />
        </div>
        <div className="cd-filter-group">
          <button onClick={() => setSelectedCategory('ALL')} className={`cd-filter-btn${selectedCategory === 'ALL' ? ' active' : ''}`}>
            All Subcategories
          </button>
          {subcategoryOptions.map(sub => (
            <button key={sub} onClick={() => setSelectedCategory(sub)} className={`cd-filter-btn${selectedCategory === sub ? ' active' : ''}`}>
              {sub}
            </button>
          ))}
        </div>
        <div className="cd-filter-group">
          {STATUS_FILTERS.map(st => (
            <button key={st.id} onClick={() => setSelectedStatus(st.id)} className={`cd-filter-btn${selectedStatus === st.id ? ' active' : ''}`}>
              {st.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cd-list-section">
        <div className="cd-list-header">
          <h2 className="cd-list-title">Complaints Register ({filtered.length})</h2>
          <span className="cd-list-sub">{deptDisplay} &mdash; clerk queue</span>
        </div>

        {filtered.length === 0 ? (
          <div className="cd-empty">
            <div className="cd-empty-icon">&#128203;</div>
            <div className="cd-empty-title">No complaints found</div>
            <p className="cd-empty-desc">No active complaints under {deptDisplay} matching current criteria.</p>
          </div>
        ) : (
          filtered.map(c => {
            const sb = STATUS_MAP[c.status] || { label: c.status, bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' }
            const needsTriage = c.status === 'REPORTED' || c.status === 'UNDER_REVIEW'
            const isRejected = c.status === 'REJECTED'
            const catCls = (c.category || '').toLowerCase()
            const sevCls = c.severity === 'Emergency' ? 'emergency' : c.severity === 'High' ? 'high' : 'normal'

            return (
              <div key={c.id} className={`cd-card${needsTriage ? ' needs-triage' : ''}${isRejected ? ' rejected' : ''}`}>
                <div className="cd-card-top">
                  <div className="cd-badges">
                    <span className="cd-badge-id">{c.id}</span>
                    <span className={`cd-badge-cat ${catCls}`}>{c.category} &bull; {c.subCategory || c.subcategory || ''}</span>
                    <span className={`cd-badge-sev ${sevCls}`}>{c.severity} Severity</span>
                  </div>
                  <span className="cd-badge-status-pill" style={{ background: sb.bg, color: sb.color, borderColor: sb.border }}>
                    {sb.pulse && <span className="cd-badge-pulse-indicator" style={{ background: sb.color }} />}
                    {sb.label}
                  </span>
                </div>

                <h3 className="cd-card-title">{c.title}</h3>
                <p className="cd-card-desc">{c.description}</p>

                <div className="cd-card-footer">
                  <div className="cd-card-meta">
                    <span>&#128205; <strong>{c.location?.block || 'Block A'}, {c.location?.street || 'N/A'}</strong> ({c.location?.sector || 'Sector 54'})</span>
                    {c.workOrderId && <span>&#128196; WO: <strong className="cd-wo-code">{c.workOrderId}</strong></span>}
                    {c.assignedContractor && <span>&#128295; <strong>{c.assignedContractor.name}</strong></span>}
                  </div>
                  <div className="cd-card-actions">
                    {needsTriage && (
                      <button onClick={() => { onSelectComplaint(c); onNavigate('triage') }} className="cd-btn-triage">
                        Triage &amp; Validate &#10003;
                      </button>
                    )}
                    {c.status === 'VALIDATED' && (
                      <button onClick={() => { onSelectComplaint(c); onNavigate('workorder') }} className="cd-btn-wo">
                        Create Work Order &#8594;
                      </button>
                    )}
                    <button onClick={() => { onSelectComplaint(c); onNavigate('tracker') }} className="cd-btn-track">
                      Track &#8594;
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
