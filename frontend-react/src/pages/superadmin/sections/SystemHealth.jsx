import { useState, useEffect, useCallback } from 'react'

function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const ACTION_COLOR = {
  TENANT_CREATED: '#166534', TENANT_SUSPENDED: '#b91c1c', TENANT_REACTIVATED: '#1e40af',
  SUBSCRIPTION_UPDATED: '#166534', USER_CREATED: '#166534', USER_UPDATED: '#1e40af',
  CONFIG_UPDATED: '#b45309', AMC_RATE_UPDATED: '#b45309', SYSTEM_INITIALIZED: '#64748b',
  DEPARTMENT_CREATED: '#166534', CONTRACTOR_CREATED: '#166534',
  USER_PASSWORD_RESET: '#b45309', USER_STATUS_ACTIVE: '#1e40af',
  USER_STATUS_SUSPENDED: '#b91c1c', USER_STATUS_INACTIVE: '#64748b',
}

export default function SystemHealth({ api, showToast }) {
  const [health, setHealth] = useState(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logSearch, setLogSearch] = useState('')
  const [logFilter, setLogFilter] = useState('')

  const load = useCallback(async () => {
    setHealthLoading(true)
    setLogsLoading(true)
    try {
      const [h, l] = await Promise.all([api.getHealth(), api.getAuditLogs()])
      setHealth(h)
      setLogs(Array.isArray(l) ? l : [])
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setHealthLoading(false)
      setLogsLoading(false)
    }
  }, [api, showToast])

  useEffect(() => { load() }, [load])

  const filteredLogs = logs.filter((l) => {
    const q = logSearch.toLowerCase()
    const matchSearch = !q ||
      l.action?.toLowerCase().includes(q) ||
      l.admin_name?.toLowerCase().includes(q) ||
      l.entity_type?.toLowerCase().includes(q) ||
      l.notes?.toLowerCase().includes(q)
    const matchFilter = !logFilter || l.entity_type === logFilter
    return matchSearch && matchFilter
  })

  const entityTypes = [...new Set(logs.map((l) => l.entity_type).filter(Boolean))]

  return (
    <div>
      <div className="sa-section-header">
        <div>
          <div className="sa-section-title">System Health & Audit Logs</div>
          <div className="sa-section-desc">Real-time platform diagnostics and administrative audit trail</div>
        </div>
        <button className="sa-btn sa-btn-secondary" onClick={load} id="sa-btn-refresh-health">
          ↻ Refresh
        </button>
      </div>

      {/* Health Panel */}
      {healthLoading ? (
        <div className="sa-loading"><div className="sa-spinner" /> Checking system health…</div>
      ) : health ? (
        <div className="sa-health-grid">
          {/* API */}
          <div className="sa-health-item healthy">
            <div className="sa-health-icon">🟢</div>
            <div className="sa-health-body">
              <div className="sa-health-name">Backend API</div>
              <div className="sa-health-detail">Express.js server is responding normally.</div>
              <span className="sa-health-status up">UP</span>
            </div>
          </div>

          {/* Database */}
          <div className={`sa-health-item ${health.database?.status?.toLowerCase() === 'healthy' ? 'healthy' : 'degraded'}`}>
            <div className="sa-health-icon">{health.database?.status === 'HEALTHY' ? '💚' : '⚠️'}</div>
            <div className="sa-health-body">
              <div className="sa-health-name">Database — {health.database?.mode || '—'}</div>
              <div className="sa-health-detail">
                {health.database?.note || '—'}
                {health.database?.responseMs !== undefined && ` Response: ${health.database.responseMs}ms`}
              </div>
              <span className={`sa-health-status ${(health.database?.status || 'unavailable').toLowerCase()}`}>
                {health.database?.status || 'UNKNOWN'}
              </span>
            </div>
          </div>

          {/* SLA Escalation */}
          <div className="sa-health-item info">
            <div className="sa-health-icon">📋</div>
            <div className="sa-health-body">
              <div className="sa-health-name">SLA Escalation Monitor</div>
              <div className="sa-health-detail">{health.escalation?.note || 'Not implemented.'}</div>
              <span className="sa-health-status not_implemented">NOT IMPLEMENTED</span>
            </div>
          </div>

          {/* Super Admin collections remain in-memory even when other routes use PostgreSQL. */}
          {(
            <div className="sa-health-item degraded">
              <div className="sa-health-icon">⚠️</div>
              <div className="sa-health-body">
                <div className="sa-health-name">Data Persistence</div>
                <div className="sa-health-detail">{health.database?.note || 'Super Admin tenants, subscriptions, global config, and audit logs remain in memory and reset on server restart.'}</div>
                <span className="sa-health-status degraded">DEGRADED</span>
              </div>
            </div>
          )}

          {/* Audit Log Integrity */}
          <div className="sa-health-item degraded">
            <div className="sa-health-icon">🛡️</div>
            <div className="sa-health-body">
              <div className="sa-health-name">Audit Log Integrity</div>
              <div className="sa-health-detail">Super Admin audit logs remain in-memory, even when PostgreSQL is configured. They are not tamper-resistant and reset on restart.</div>
              <span className="sa-health-status degraded">IN-MEMORY (NOT DURABLE)</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="sa-empty"><div className="sa-empty-icon">⚠️</div><div className="sa-empty-title">Failed to load health status.</div></div>
      )}

      {/* Audit Logs */}
      <div style={{ marginTop: 28 }}>
        <div className="sa-card-header" style={{ background: 'transparent', padding: '0 0 16px' }}>
          <div className="sa-card-title" style={{ fontSize: 16 }}>🛡️ Platform Audit Log</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div className="sa-search-input-wrap" style={{ minWidth: 200 }}>
              <span className="sa-search-icon">🔍</span>
              <input
                className="sa-search-input"
                placeholder="Search action, admin, entity…"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                id="sa-audit-search"
              />
            </div>
            <select className="sa-filter-select" value={logFilter} onChange={(e) => setLogFilter(e.target.value)}>
              <option value="">All Entities</option>
              {entityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="sa-info-box" style={{ marginBottom: 16 }}>
          ℹ️ Audit log records cannot be modified or deleted through this interface, but they are held in memory and reset on server restart.
        </div>

        {logsLoading ? (
          <div className="sa-loading"><div className="sa-spinner" /> Loading audit logs…</div>
        ) : filteredLogs.length === 0 ? (
          <div className="sa-empty">
            <div className="sa-empty-icon">📭</div>
            <div className="sa-empty-title">No audit records found</div>
            <div className="sa-empty-desc">{logSearch ? 'Try adjusting your search.' : 'Platform actions will be recorded here.'}</div>
          </div>
        ) : (
          <div className="sa-card">
            <div className="sa-card-header">
              <div className="sa-card-title">Showing {filteredLogs.length} of {logs.length} records</div>
            </div>
            <div className="sa-table-wrapper">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Admin</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Tenant</th>
                    <th>Outcome</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, i) => (
                    <tr key={log.id || i}>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>
                          {formatTime(log.timestamp)}
                        </span>
                      </td>
                      <td>
                        <div className="sa-name" style={{ fontSize: 12.5 }}>{log.admin_name}</div>
                        <div className="sa-sub">{log.admin_role}</div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: ACTION_COLOR[log.action] || 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                        }}>
                          {log.action?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>{log.entity_type}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>{log.entity_id !== log.entity_type ? log.entity_id?.slice(0, 12) + '…' : ''}</div>
                      </td>
                      <td><span style={{ fontSize: 11.5, color: 'var(--text-soft)' }}>{log.tenant_id ? log.tenant_id.slice(0, 8) + '…' : '—'}</span></td>
                      <td>
                        <span className={`sa-badge ${log.outcome === 'SUCCESS' ? 'active' : 'overdue'}`} style={{ fontSize: 10 }}>
                          {log.outcome}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 11.5, color: 'var(--text-soft)', maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.notes || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
