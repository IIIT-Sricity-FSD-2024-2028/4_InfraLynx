import { useState, useEffect } from 'react'

const ROLE_LABELS = {
  RWA: 'RWA Rep', DESK_CLERK: 'Desk Clerk', FIELD_CONTRACTOR: 'Field Contractor',
  DEPARTMENT_HEAD: 'Dept Head', FINANCE_CLERK: 'Finance Clerk', TOWNSHIP_COO: 'Township COO',
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const ACTION_COLORS = {
  TENANT_CREATED: '#15803d', TENANT_SUSPENDED: '#b91c1c', TENANT_REACTIVATED: '#1e40af',
  SUBSCRIPTION_UPDATED: '#166534', USER_CREATED: '#15803d', USER_STATUS_ACTIVE: '#1e40af',
  USER_STATUS_SUSPENDED: '#b91c1c', CONFIG_UPDATED: '#b45309', AMC_RATE_UPDATED: '#b45309',
  SYSTEM_INITIALIZED: '#6b7280', DEPARTMENT_CREATED: '#15803d', CONTRACTOR_CREATED: '#15803d',
  USER_PASSWORD_RESET: '#b45309',
}

export default function Overview({ api }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    api.getOverview()
      .then((d) => { if (mounted) { setData(d); setLoading(false) } })
      .catch((e) => { if (mounted) { setError(e.message); setLoading(false) } })
    return () => { mounted = false }
  }, [api])

  async function refreshOverview() {
    setRefreshing(true)
    try {
      setData(await api.getOverview())
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) return (
    <div className="sa-loading"><div className="sa-spinner" /> Loading platform overview…</div>
  )
  if (error) return (
    <div className="sa-empty">
      <div className="sa-empty-icon">⚠️</div>
      <div className="sa-empty-title">Failed to load overview</div>
      <div className="sa-empty-desc">{error}</div>
      <button type="button" className="sa-btn sa-btn-secondary sa-overview-retry" onClick={refreshOverview} disabled={refreshing}>
        {refreshing ? 'Retrying…' : 'Try again'}
      </button>
    </div>
  )
  if (!data) return null

  const roleEntries = Object.entries(data.roleBreakdown || {}).sort((a, b) => b[1] - a[1])
  const maxRoleCount = Math.max(1, ...roleEntries.map(([, count]) => count))
  const attentionCount = Number(data.expiringSoon || 0) + Number(data.overdue || 0) + Number(data.suspended || 0)

  const metrics = [
    { icon: '🏢', value: data.totalTownships ?? 0, label: 'Total tenants', sub: 'Townships on platform', tone: 'green' },
    { icon: '✓', value: data.activeSubscriptions ?? 0, label: 'Active subscriptions', sub: 'Currently active', tone: 'green' },
    { icon: '↗', value: data.expiringSoon ?? 0, label: 'Expiring soon', sub: 'Within 30 days', tone: data.expiringSoon > 0 ? 'amber' : 'green' },
    { icon: '!', value: data.overdue ?? 0, label: 'Overdue', sub: 'Past renewal date', tone: data.overdue > 0 ? 'red' : 'green' },
    { icon: '⏸', value: data.suspended ?? 0, label: 'Suspended tenants', sub: 'Access is paused', tone: data.suspended > 0 ? 'red' : 'green' },
    { icon: '👥', value: data.totalUsers ?? 0, label: 'Platform users', sub: 'Tenant accounts', tone: 'blue' },
    { icon: '▤', value: data.totalComplaints ?? 0, label: 'Total complaints', sub: 'Across all tenants', tone: 'blue' },

  ]

  return (
    <div>
      {/* Overview header */}
      <section className="sa-overview-banner-panel" aria-labelledby="sa-overview-title">
        <div className="sa-overview-banner">
          <div>
            <div className="sa-overview-eyebrow"><span className="sa-overview-live-dot" /> PLATFORM SNAPSHOT</div>
            <div className="sa-overview-heading" id="sa-overview-title">
              Your platform at a glance
            </div>
            <div className="sa-overview-date">
              Tenant activity, subscription health, and access across InfraLynx.
            </div>
          </div>
          <div className="sa-overview-header-actions">
            <button type="button" className="sa-btn sa-btn-secondary sa-overview-refresh" onClick={refreshOverview} disabled={refreshing}>
              <span className={refreshing ? 'sa-refresh-icon is-refreshing' : 'sa-refresh-icon'}>↻</span>
              {refreshing ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        </div>
        <div className="sa-overview-context-row">
          <span>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          <span className="sa-overview-context-divider" />
          <span>Platform status</span>
        </div>
      </section>

      {/* KPI Metrics */}
      <div className="sa-kpi-grid">
        {metrics.map((m) => (
          <article key={m.label} className={`sa-kpi-card tone-${m.tone}`}>
            <div className="sa-kpi-top">
              <span className="sa-kpi-label">{m.label}</span>
              <span className="sa-kpi-icon" aria-hidden="true">{m.icon}</span>
            </div>
            <div className="sa-kpi-value">{m.value}</div>
            {m.sub && <div className="sa-kpi-sub">{m.sub}</div>}
          </article>
        ))}
      </div>

      {/* Two-column: activity + role breakdown */}
      <div className="sa-overview-columns">
        {/* Recent Activity */}
        <section className="sa-panel sa-overview-activity-panel" aria-labelledby="sa-activity-title">
          <div className="sa-panel-header">
            <div>
              <div className="sa-panel-title" id="sa-activity-title">Recent activity</div>
              <div className="sa-panel-subtitle">Latest platform administration events</div>
            </div>
            <span className="sa-overview-count-pill">{data.recentActivity?.length || 0} events</span>
          </div>
          <div className="sa-panel-body sa-activity-list">
            {(!data.recentActivity || data.recentActivity.length === 0) ? (
              <div className="sa-empty sa-overview-activity-empty">
                <div className="sa-empty-icon">📭</div>
                <div className="sa-empty-title">No activity yet</div>
                <div className="sa-empty-desc">Administrative actions will appear here.</div>
              </div>
            ) : (
              data.recentActivity.map((log, i) => (
                <article key={log.id || i} className="sa-activity-row">
                  <div className="sa-activity-dot" style={{ background: ACTION_COLORS[log.action] || '#94a3b8' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sa-activity-mainline">
                      <div>
                        <span className="sa-activity-action">{log.action?.replace(/_/g, ' ') || 'Platform event'}</span>
                        {log.entity_type && <span className="sa-activity-entity">{log.entity_type.replace(/_/g, ' ')}</span>}
                      </div>
                      <span className="sa-activity-time">{fmt(log.timestamp)}</span>
                    </div>
                    {log.notes && <div className="sa-activity-note">{log.notes}</div>}
                    {log.admin_name && <div className="sa-activity-by"><span className="sa-activity-avatar">{log.admin_name.slice(0, 1).toUpperCase()}</span> {log.admin_name}</div>}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {/* Role Breakdown */}
        <aside className="sa-overview-side-column">
          <section className="sa-panel sa-overview-roles-panel" aria-labelledby="sa-roles-title">
            <div className="sa-panel-header">
              <div>
                <div className="sa-panel-title" id="sa-roles-title">Users by role</div>
                <div className="sa-panel-subtitle">Account distribution by access</div>
              </div>
              <span className="sa-overview-total-pill">{data.totalUsers ?? 0} total</span>
            </div>
            <div className="sa-panel-body sa-role-list">
              {roleEntries.length === 0 ? (
                <div className="sa-empty sa-overview-role-empty">
                  <div className="sa-empty-desc">No users found.</div>
                </div>
              ) : (
                roleEntries.map(([role, count]) => (
                  <div key={role} className="sa-role-item">
                    <div className="sa-role-item-head">
                      <span className="sa-role-name">{ROLE_LABELS[role] || role.replace(/_/g, ' ')}</span>
                      <span className="sa-role-count">{count}</span>
                    </div>
                    <div
                      className="sa-role-meter"
                      role="progressbar"
                      aria-label={`${ROLE_LABELS[role] || role} accounts`}
                      aria-valuemin={0}
                      aria-valuemax={maxRoleCount}
                      aria-valuenow={count}
                    >
                      <span style={{ width: `${Math.max(6, (count / maxRoleCount) * 100)}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>


        </aside>
      </div>
    </div>
  )
}
