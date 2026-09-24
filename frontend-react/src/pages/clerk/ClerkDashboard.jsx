import { useState, useMemo } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import './styles/ClerkDashboard.css'

/**
 * ClerkDashboard - Screen 1: Overview of ALL system complaints.
 *
 * Props:
 *   onNavigate(screen)            - navigate to another clerk screen
 *   onSelectComplaint(complaint)  - store complaint in portal state
 *   successNotice                 - { id, message } | null  toast after WO dispatch
 *   onDismissNotice()             - clears the success toast
 *
 * Context used: complaints (all), currentUser
 *
 * Local state:
 *   searchQuery      - text filter on id / title / location
 *   selectedStatus   - status group filter
 *   selectedCategory - category filter
 */
export default function ClerkDashboard({
  onNavigate, onSelectComplaint, successNotice, onDismissNotice,
}) {
  const { complaints, currentUser } = useTIMS()

  const [searchQuery,       setSearchQuery]       = useState('')
  const [selectedStatus,    setSelectedStatus]    = useState('ALL')
  const [selectedCategory,  setSelectedCategory]  = useState('ALL')

  // ── KPI metrics ──────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:            complaints.length,
    pendingTriage:    complaints.filter(c => c.status === 'REPORTED' || c.status === 'UNDER_REVIEW').length,
    workOrdersRaised: complaints.filter(c => ['WORK_ORDER_CREATED','ASSIGNED','IN_PROGRESS','COMPLETED','PENDING_VERIFICATION'].includes(c.status)).length,
    awaitingDeptHead: complaints.filter(c => c.status === 'AWAITING_DEPT_HEAD').length,
    closed:           complaints.filter(c => c.status === 'CLOSED').length,
  }), [complaints])

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return complaints.filter(c => {
      const q = searchQuery.toLowerCase()
      const matchSearch = !q ||
        c.id.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.location.street || '').toLowerCase().includes(q) ||
        (c.location.block  || '').toLowerCase().includes(q)

      const matchStatus =
        selectedStatus === 'ALL'       ? true :
        selectedStatus === 'TRIAGE'    ? (c.status === 'REPORTED' || c.status === 'UNDER_REVIEW') :
        selectedStatus === 'ACTIVE'    ? ['VALIDATED','WORK_ORDER_CREATED','ASSIGNED','IN_PROGRESS','AWAITING_DEPT_HEAD'].includes(c.status) :
        selectedStatus === 'COMPLETED' ? ['COMPLETED','PENDING_VERIFICATION'].includes(c.status) :
        selectedStatus === 'CLOSED'    ? (c.status === 'CLOSED' || c.status === 'REJECTED') :
        c.status === selectedStatus

      const matchCat = selectedCategory === 'ALL' || (c.category || '').toUpperCase() === selectedCategory

      return matchSearch && matchStatus && matchCat
    })
  }, [complaints, searchQuery, selectedStatus, selectedCategory])

  // ── Status badge helper ───────────────────────────────────────────────────
  function statusBadge(status) {
    const m = {
      REPORTED:             { label: 'Reported',           bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', pulse: false },
      UNDER_REVIEW:         { label: 'Under Review',       bg: '#fffbeb', color: '#92400e', border: '#fde68a', pulse: true  },
      VALIDATED:            { label: 'Validated',          bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', pulse: false },
      REJECTED:             { label: 'Rejected',           bg: '#fef2f2', color: '#991b1b', border: '#fecaca', pulse: false },
      WORK_ORDER_CREATED:   { label: 'WO Created',         bg: '#fffbeb', color: '#92400e', border: '#fde68a', pulse: false },
      AWAITING_DEPT_HEAD:   { label: 'Awaiting Dept Head', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', pulse: true  },
      ASSIGNED:             { label: 'Assigned',           bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', pulse: false },
      IN_PROGRESS:          { label: 'In Progress',        bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', pulse: true  },
      COMPLETED:            { label: 'Completed',          bg: '#f0fdf4', color: '#166534', border: '#86efac', pulse: false },
      PENDING_VERIFICATION: { label: 'Pending Verify',     bg: '#fffbeb', color: '#92400e', border: '#fde68a', pulse: true  },
      CLOSED:               { label: 'Closed',             bg: '#f0fdf4', color: '#15803d', border: '#86efac', pulse: false },
      DISPUTED:             { label: 'Disputed',           bg: '#fef2f2', color: '#991b1b', border: '#fca5a5', pulse: true  },
    }
    return m[status] || { label: status, bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', pulse: false }
  }

  return (
    <div className="cd-root">

      {/* ── Welcome banner ── */}
      <div className="cd-welcome">
        <span className="cd-welcome-badge">Desk Clerk</span>
        <div className="cd-welcome-title">Good day, {currentUser.name}</div>
        <div className="cd-welcome-sub">
          Triage incoming complaints, validate issues, and dispatch work orders to AMC contractors.
        </div>
      </div>

      {/* ── Success toast (shown after WO dispatch) ── */}
      {successNotice && (
        <div className="cd-toast">
          <div>
            <div className="cd-toast-title">&#10003; Action Successful &mdash; {successNotice.id}</div>
            <div className="cd-toast-msg">{successNotice.message}</div>
          </div>
          <button className="cd-toast-dismiss" onClick={onDismissNotice}>&#10005;</button>
        </div>
      )}

      {/* ── KPI metric cards ── */}
      <div className="cd-metrics">
        <div className="cd-metric-card">
          <div className="cd-metric-label">Total Complaints</div>
          <div className="cd-metric-val">{stats.total}</div>
          <div className="cd-metric-sub">All system records</div>
        </div>
        <div className={`cd-metric-card${stats.pendingTriage > 0 ? ' amber-alert' : ''}`}>
          <div className="cd-metric-label">Pending Triage</div>
          <div className={`cd-metric-val${stats.pendingTriage > 0 ? ' amber' : ''}`}>{stats.pendingTriage}</div>
          <div className="cd-metric-sub">Awaiting clerk review</div>
        </div>
        <div className="cd-metric-card">
          <div className="cd-metric-label">Work Orders Raised</div>
          <div className="cd-metric-val blue">{stats.workOrdersRaised}</div>
          <div className="cd-metric-sub">Dispatched to contractors</div>
        </div>
        <div className={`cd-metric-card${stats.awaitingDeptHead > 0 ? ' orange-alert' : ''}`}>
          <div className="cd-metric-label">Awaiting Dept Head</div>
          <div className={`cd-metric-val${stats.awaitingDeptHead > 0 ? ' orange' : ''}`}>{stats.awaitingDeptHead}</div>
          <div className="cd-metric-sub">Large-job approvals</div>
        </div>
        <div className="cd-metric-card">
          <div className="cd-metric-label">Closed / Resolved</div>
          <div className="cd-metric-val green">{stats.closed}</div>
          <div className="cd-metric-sub">RWA verified &amp; signed off</div>
        </div>
      </div>

      {/* ── Filter toolbar ── */}
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
          {['ALL','CIVIL','ELECTRICAL','WATER'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`cd-filter-btn${selectedCategory === cat ? ' active' : ''}`}
            >
              {cat === 'ALL' ? 'All Categories' : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="cd-filter-group">
          {[
            { id: 'ALL',       label: 'All'          },
            { id: 'TRIAGE',    label: 'Needs Triage' },
            { id: 'ACTIVE',    label: 'Active WO'    },
            { id: 'COMPLETED', label: 'Completed'    },
            { id: 'CLOSED',    label: 'Closed'       },
          ].map(st => (
            <button
              key={st.id}
              onClick={() => setSelectedStatus(st.id)}
              className={`cd-filter-btn${selectedStatus === st.id ? ' active' : ''}`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Complaint list ── */}
      <div className="cd-list-section">
        <div className="cd-list-header">
          <h2 className="cd-list-title">Complaints Register ({filtered.length})</h2>
          <span className="cd-list-sub">All sectors &mdash; clerk view</span>
        </div>

        {filtered.length === 0 ? (
          <div className="cd-empty">
            <div className="cd-empty-icon">&#128203;</div>
            <div className="cd-empty-title">No complaints found</div>
            <p className="cd-empty-desc">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          filtered.map(c => {
            const sb         = statusBadge(c.status)
            const needsTriage = c.status === 'REPORTED' || c.status === 'UNDER_REVIEW'
            const isRejected  = c.status === 'REJECTED'
            const catCls = c.category === 'Electrical' ? 'electrical' : c.category === 'Water' ? 'water' : 'civil'
            const sevCls = c.severity === 'Emergency'  ? 'emergency'  : c.severity === 'High'  ? 'high' : 'normal'

            return (
              <div
                key={c.id}
                className={`cd-card${needsTriage ? ' needs-triage' : ''}${isRejected ? ' rejected' : ''}`}
              >
                {/* Top row: badges + status pill */}
                <div className="cd-card-top">
                  <div className="cd-badges">
                    <span className="cd-badge-id">{c.id}</span>
                    <span className={`cd-badge-cat ${catCls}`}>{c.category} &bull; {c.subCategory}</span>
                    <span className={`cd-badge-sev ${sevCls}`}>{c.severity} Severity</span>
                  </div>
                  <span style={{
                    fontSize: 12.5, fontWeight: 700,
                    padding: '4px 10px', borderRadius: 'var(--radius-full)',
                    background: sb.bg, color: sb.color, border: `1px solid ${sb.border}`,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    {sb.pulse && <span style={{ width: 7, height: 7, borderRadius: '50%', background: sb.color, display: 'inline-block' }} />}
                    {sb.label}
                  </span>
                </div>

                {/* Title + description */}
                <h3 className="cd-card-title">{c.title}</h3>
                <p className="cd-card-desc">{c.description}</p>

                {/* Footer: location + actions */}
                <div className="cd-card-footer">
                  <div className="cd-card-meta">
                    <span>&#128205; <strong>{c.location.block}, {c.location.street || 'N/A'}</strong> ({c.location.sector})</span>
                    {c.workOrderId && <span>&#128196; WO: <strong style={{ fontFamily: 'var(--font-mono)' }}>{c.workOrderId}</strong></span>}
                    {c.assignedContractor && <span>&#128295; <strong>{c.assignedContractor.name}</strong></span>}
                  </div>
                  <div className="cd-card-actions">
                    {/* Triage button — shown for new/under-review complaints */}
                    {needsTriage && (
                      <button
                        onClick={() => { onSelectComplaint(c); onNavigate('triage') }}
                        className="cd-btn-triage"
                      >
                        Triage &amp; Validate &#10003;
                      </button>
                    )}
                    {/* Create WO button — shown only for VALIDATED complaints */}
                    {c.status === 'VALIDATED' && (
                      <button
                        onClick={() => { onSelectComplaint(c); onNavigate('workorder') }}
                        className="cd-btn-wo"
                      >
                        Create Work Order &#8594;
                      </button>
                    )}
                    {/* Track button — always shown */}
                    <button
                      onClick={() => { onSelectComplaint(c); onNavigate('tracker') }}
                      className="cd-btn-track"
                    >
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
