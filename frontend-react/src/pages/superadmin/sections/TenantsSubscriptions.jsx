import { useState, useEffect, useCallback } from 'react'

const PLAN_BADGE = { Enterprise: 'enterprise', Professional: 'professional', Starter: 'starter' }

function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Add Tenant Modal ─────────────────────────────────────────────────────────
function AddTenantModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', address: '', contact_email: '', contact_phone: '',
    legal_entity: '', primary_contact: '', plan_label: 'Enterprise',
    billing_cycle: 'YEARLY', start_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    max_users: 10, max_complaints_monthly: 100, max_storage_gb: 5, status: 'ACTIVE',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Township name is required'
    if (!form.contact_email.trim()) e.contact_email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) e.contact_email = 'Invalid email'
    if (!form.plan_label) e.plan_label = 'Select a plan'
    if (!form.start_date) e.start_date = 'Start date required'
    if (!form.expiry_date) e.expiry_date = 'Expiry date required'
    else if (new Date(form.expiry_date) <= new Date(form.start_date)) e.expiry_date = 'Expiry must be after start date'
    if (!form.max_users || form.max_users < 1) e.max_users = 'Must be ≥ 1'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <div className="sa-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sa-modal wide">
        <div className="sa-modal-header">
          <div>
            <div className="sa-modal-title">🏢 Onboard New Tenant</div>
            <div className="sa-modal-subtitle">Register a new township on the InfraLynx platform</div>
          </div>
          <button className="sa-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="sa-modal-body">
            <div className="sa-form-grid">
              <div className="sa-form-group full">
                <label className="sa-label">Township / Organization Name *</label>
                <input id="sa-add-tenant-name" className="sa-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Prestige Smart Township, Bangalore" />
                {errors.name && <div className="sa-form-error">{errors.name}</div>}
              </div>
              <div className="sa-form-group full">
                <label className="sa-label">Legal Entity Name</label>
                <input className="sa-input" value={form.legal_entity} onChange={(e) => set('legal_entity', e.target.value)} placeholder="e.g. DLF Infrastructure Management Ltd." />
              </div>
              <div className="sa-form-group full">
                <label className="sa-label">Location / Address</label>
                <input className="sa-input" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="e.g. Golf Course Road, Gurugram, Haryana" />
              </div>
              <div className="sa-form-group">
                <label className="sa-label">Primary Contact Name</label>
                <input className="sa-input" value={form.primary_contact} onChange={(e) => set('primary_contact', e.target.value)} placeholder="e.g. Col. Sanjeev Dewan" />
              </div>
              <div className="sa-form-group">
                <label className="sa-label">Contact Phone</label>
                <input className="sa-input" value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} placeholder="+91 98000 00000" />
              </div>
              <div className="sa-form-group">
                <label className="sa-label">Contact Email *</label>
                <input id="sa-add-tenant-email" className="sa-input" value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} placeholder="coo@township.in" />
                {errors.contact_email && <div className="sa-form-error">{errors.contact_email}</div>}
              </div>
              <div className="sa-form-group">
                <label className="sa-label">Subscription Plan *</label>
                <select className="sa-select" value={form.plan_label} onChange={(e) => set('plan_label', e.target.value)}>
                  <option value="Enterprise">Enterprise</option>
                  <option value="Professional">Professional</option>
                  <option value="Starter">Starter — Free/Trial</option>
                </select>
              </div>
              <div className="sa-form-group">
                <label className="sa-label">Billing Cycle *</label>
                <select className="sa-select" value={form.billing_cycle} onChange={(e) => set('billing_cycle', e.target.value)}>
                  <option value="YEARLY">Annual</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
              <div className="sa-form-group">
                <label className="sa-label">Start Date *</label>
                <input type="date" className="sa-input" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
                {errors.start_date && <div className="sa-form-error">{errors.start_date}</div>}
              </div>
              <div className="sa-form-group">
                <label className="sa-label">Expiry Date *</label>
                <input type="date" className="sa-input" value={form.expiry_date} onChange={(e) => set('expiry_date', e.target.value)} />
                {errors.expiry_date && <div className="sa-form-error">{errors.expiry_date}</div>}
              </div>
              <div className="sa-form-group">
                <label className="sa-label">Max Users</label>
                <input type="number" className="sa-input" value={form.max_users} min={1} onChange={(e) => set('max_users', parseInt(e.target.value))} />
              </div>
              <div className="sa-form-group">
                <label className="sa-label">Monthly Complaint Quota</label>
                <input type="number" className="sa-input" value={form.max_complaints_monthly} min={1} onChange={(e) => set('max_complaints_monthly', parseInt(e.target.value))} />
              </div>
            </div>
          </div>
          <div className="sa-modal-footer">
            <button type="button" className="sa-btn sa-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="sa-btn sa-btn-primary" disabled={saving} id="sa-btn-save-tenant">
              {saving ? 'Saving…' : '✓ Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Tenant Detail Modal ──────────────────────────────────────────────────────
function TenantDetailModal({ tenant, onClose, onUpdate, onStatusChange }) {
  const [tab, setTab] = useState('details')
  const [editForm, setEditForm] = useState({
    name: tenant.name || '', address: tenant.address || '',
    contact_email: tenant.contact_email || '', contact_phone: tenant.contact_phone || '',
  })
  const [subForm, setSubForm] = useState({
    plan_label: tenant.subscription?.plan_label || 'Enterprise',
    billing_cycle: tenant.subscription?.billing_cycle || 'YEARLY',
    expiry_date: tenant.subscription?.expiry_date || '',
    reason: '',
  })
  const [confirmSuspend, setConfirmSuspend] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reason, setReason] = useState('')
  const sub = tenant.subscription

  async function handleSaveDetails() {
    setSaving(true)
    try { await onUpdate(tenant.id, editForm) } finally { setSaving(false) }
  }

  async function handleSaveSub() {
    setSaving(true)
    try { await onUpdate(tenant.id, subForm) } finally { setSaving(false) }
  }

  async function handleSuspend() {
    setSaving(true)
    try { await onStatusChange(tenant.id, 'SUSPENDED', reason) } finally { setSaving(false) }
  }

  async function handleReactivate() {
    setSaving(true)
    try { await onStatusChange(tenant.id, 'ACTIVE', reason) } finally { setSaving(false) }
  }

  const TABS = ['details', 'subscription', 'actions']

  return (
    <div className="sa-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sa-modal wide">
        <div className="sa-modal-header">
          <div>
            <div className="sa-modal-title">{tenant.name}</div>
            <div className="sa-modal-subtitle" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
              <span className={`sa-pill ${(tenant.status || 'active').toLowerCase()}`}>{tenant.status}</span>
              {sub && <span className={`sa-pill ${PLAN_BADGE[sub.plan_label] || 'starter'}`}>{sub.plan_label}</span>}
            </div>
          </div>
          <button className="sa-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="sa-modal-tabs">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`sa-modal-tab${tab === t ? ' active' : ''}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="sa-modal-body">
          {tab === 'details' && (
            <div>
              <div className="sa-detail-grid">
                <div><div className="sa-detail-label">Tenant ID</div><div className="sa-detail-value" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-soft)' }}>{tenant.id}</div></div>
                <div><div className="sa-detail-label">Users</div><div className="sa-detail-value">{tenant.userCount || 0}</div></div>
                <div><div className="sa-detail-label">Complaints</div><div className="sa-detail-value">{tenant.complaintCount || 0}</div></div>
                <div><div className="sa-detail-label">Departments</div><div className="sa-detail-value">{tenant.departmentCount || 0}</div></div>
              </div>
              <div className="sa-form-grid">
                <div className="sa-form-group full">
                  <label className="sa-label">Township Name</label>
                  <input className="sa-input" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="sa-form-group full">
                  <label className="sa-label">Address</label>
                  <input className="sa-input" value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="sa-form-group">
                  <label className="sa-label">Contact Email</label>
                  <input className="sa-input" value={editForm.contact_email} onChange={(e) => setEditForm((f) => ({ ...f, contact_email: e.target.value }))} />
                </div>
                <div className="sa-form-group">
                  <label className="sa-label">Contact Phone</label>
                  <input className="sa-input" value={editForm.contact_phone} onChange={(e) => setEditForm((f) => ({ ...f, contact_phone: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="sa-btn sa-btn-primary" onClick={handleSaveDetails} disabled={saving}>
                  {saving ? 'Saving…' : '✓ Save Details'}
                </button>
              </div>
            </div>
          )}

          {tab === 'subscription' && (
            <div>
              {sub ? (
                <>
                  <div className="sa-detail-grid">
                    <div><div className="sa-detail-label">Plan</div><div className="sa-detail-value">{sub.plan_label}</div></div>
                    <div><div className="sa-detail-label">Billing</div><div className="sa-detail-value">{sub.billing_cycle}</div></div>
                    <div><div className="sa-detail-label">Start Date</div><div className="sa-detail-value">{fmt(sub.start_date)}</div></div>
                    <div><div className="sa-detail-label">Expiry Date</div><div className="sa-detail-value">{fmt(sub.expiry_date)}</div></div>
                    <div><div className="sa-detail-label">Max Users</div><div className="sa-detail-value">{sub.max_users}</div></div>
                    <div><div className="sa-detail-label">Complaint Quota/mo</div><div className="sa-detail-value">{sub.max_complaints_monthly}</div></div>
                  </div>
                  <div className="sa-form-grid">
                    <div className="sa-form-group">
                      <label className="sa-label">Upgrade/Change Plan</label>
                      <select className="sa-select" value={subForm.plan_label} onChange={(e) => setSubForm((f) => ({ ...f, plan_label: e.target.value }))}>
                        <option value="Enterprise">Enterprise</option>
                        <option value="Professional">Professional</option>
                        <option value="Starter">Starter — Free/Trial</option>
                      </select>
                    </div>
                    <div className="sa-form-group">
                      <label className="sa-label">Billing Cycle</label>
                      <select className="sa-select" value={subForm.billing_cycle} onChange={(e) => setSubForm((f) => ({ ...f, billing_cycle: e.target.value }))}>
                        <option value="YEARLY">Annual</option>
                        <option value="MONTHLY">Monthly</option>
                      </select>
                    </div>
                    <div className="sa-form-group">
                      <label className="sa-label">New Expiry Date</label>
                      <input type="date" className="sa-input" value={subForm.expiry_date} onChange={(e) => setSubForm((f) => ({ ...f, expiry_date: e.target.value }))} />
                    </div>
                    <div className="sa-form-group">
                      <label className="sa-label">Renewal Note</label>
                      <input className="sa-input" value={subForm.reason} onChange={(e) => setSubForm((f) => ({ ...f, reason: e.target.value }))} placeholder="e.g. Annual renewal FY26-27" />
                    </div>
                  </div>
                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="sa-btn sa-btn-primary" onClick={handleSaveSub} disabled={saving}>
                      {saving ? 'Saving…' : '↑ Update Subscription'}
                    </button>
                  </div>

                  {sub.history?.length > 0 && (
                    <div style={{ marginTop: 24 }}>
                      <div className="sa-label" style={{ marginBottom: 10, display: 'block' }}>Subscription History</div>
                      {[...sub.history].reverse().map((h, i) => (
                        <div key={i} className="sa-history-row">
                          <div className="sa-history-dot" />
                          <div>
                            <span className="sa-history-action">{h.action}</span>
                            <span className="sa-history-date">{fmt(h.date)}</span>
                            {h.note && <div className="sa-history-note">{h.note}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="sa-empty"><div className="sa-empty-icon">📭</div><div className="sa-empty-title">No subscription data.</div></div>
              )}
            </div>
          )}

          {tab === 'actions' && (
            <div>
              {tenant.status === 'ACTIVE' ? (
                !confirmSuspend ? (
                  <div>
                    <div className="sa-warn-box">
                      ⚠️ <strong>Suspending this tenant</strong> will set the township status to SUSPENDED. The subscription record is preserved and you can reactivate at any time. This action is audited.
                    </div>
                    <div className="sa-form-group" style={{ marginTop: 12 }}>
                      <label className="sa-label">Reason for Suspension (required)</label>
                      <input className="sa-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Non-payment for Q3 FY26" />
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        className="sa-btn sa-btn-danger"
                        onClick={() => { if (!reason.trim()) { alert('Please enter a reason.'); return } setConfirmSuspend(true) }}
                      >
                        🚫 Proceed to Suspend
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div className="sa-confirm-icon">🚫</div>
                    <div className="sa-confirm-title">Confirm Suspension</div>
                    <div className="sa-confirm-body">
                      Are you sure you want to suspend <strong>{tenant.name}</strong>?<br />
                      <em style={{ fontSize: 13, color: 'var(--text-muted)' }}>Reason: {reason}</em>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20 }}>
                      <button className="sa-btn sa-btn-secondary" onClick={() => setConfirmSuspend(false)}>Cancel</button>
                      <button className="sa-btn sa-btn-danger" onClick={handleSuspend} disabled={saving} id="sa-btn-confirm-suspend">
                        {saving ? 'Suspending…' : '🚫 Confirm Suspend'}
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div>
                  <div className="sa-info-box">
                    ℹ️ This tenant is currently <strong>SUSPENDED</strong>. Reactivating will restore access for township users.
                  </div>
                  <div className="sa-form-group" style={{ marginTop: 12 }}>
                    <label className="sa-label">Reactivation Reason</label>
                    <input className="sa-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Payment received, subscription renewed" />
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="sa-btn sa-btn-primary" onClick={handleReactivate} disabled={saving} id="sa-btn-reactivate">
                      {saving ? 'Reactivating…' : '✅ Reactivate Tenant'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function TenantsSubscriptions({ api, showToast }) {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState(null)

  const loadTenants = useCallback(() => {
    setLoading(true)
    api.getTenants()
      .then((d) => { setTenants(Array.isArray(d) ? d : []); setLoading(false) })
      .catch((e) => { showToast(e.message, 'error'); setLoading(false) })
  }, [api, showToast])

  useEffect(() => { loadTenants() }, [loadTenants])

  const filtered = tenants.filter((t) => {
    const q = search.toLowerCase()
    return (
      (!q || t.name?.toLowerCase().includes(q) || t.contact_email?.toLowerCase().includes(q) || t.address?.toLowerCase().includes(q)) &&
      (!filterStatus || t.status === filterStatus || t.subscription?.status === filterStatus) &&
      (!filterPlan || t.subscription?.plan_label === filterPlan)
    )
  })

  async function handleAddTenant(form) {
    try { await api.createTenant(form); showToast('Tenant onboarded!', 'success'); setShowAdd(false); loadTenants() }
    catch (e) { showToast(e.message, 'error') }
  }

  async function handleUpdate(id, form) {
    try { await api.updateTenant(id, form); showToast('Tenant updated.', 'success'); setSelectedTenant(null); loadTenants() }
    catch (e) { showToast(e.message, 'error') }
  }

  async function handleStatusChange(id, status, reason) {
    try {
      await api.updateTenantStatus(id, status, reason)
      showToast(`Tenant ${status === 'SUSPENDED' ? 'suspended' : 'reactivated'}.`, 'success')
      setSelectedTenant(null); loadTenants()
    } catch (e) { showToast(e.message, 'error') }
  }

  return (
    <div>
      <div className="sa-page-header">
        <div>
          <div className="sa-page-title">Subscriptions & Tenants</div>
          <div className="sa-page-desc">Manage all townships registered on the InfraLynx platform</div>
        </div>
        <button className="sa-btn sa-btn-primary" onClick={() => setShowAdd(true)} id="sa-btn-add-tenant">
          + Onboard Tenant
        </button>
      </div>

      {/* Filters */}
      <div className="sa-filter-bar">
        <div className="sa-search-wrap">
          <span className="sa-search-icon">🔍</span>
          <input id="sa-tenant-search" className="sa-search-input" placeholder="Search name, email, location…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="sa-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <select className="sa-select" value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)}>
          <option value="">All Plans</option>
          <option value="Enterprise">Enterprise</option>
          <option value="Professional">Professional</option>
          <option value="Starter">Starter</option>
        </select>
      </div>

      {loading ? (
        <div className="sa-loading"><div className="sa-spinner" /> Loading tenants…</div>
      ) : filtered.length === 0 ? (
        <div className="sa-empty" style={{ padding: 48 }}>
          <div className="sa-empty-icon">🏢</div>
          <div className="sa-empty-title">No tenants found</div>
          <div className="sa-empty-desc">{search ? 'Try adjusting your search.' : 'Onboard your first tenant.'}</div>
        </div>
      ) : (
        <div className="sa-panel">
          <div className="sa-panel-header">
            <div className="sa-panel-title">Township Registry</div>
            <div className="sa-panel-subtitle">{filtered.length} tenant{filtered.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Township</th>
                  <th>Location</th>
                  <th>Plan</th>
                  <th>Billing</th>
                  <th>Status</th>
                  <th>Expiry</th>
                  <th>Users</th>
                  <th>Complaints</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const sub = t.subscription
                  return (
                    <tr key={t.id}>
                      <td>
                        <div className="sa-td-name">{t.name}</div>
                        <div className="sa-td-sub">{t.contact_email}</div>
                      </td>
                      <td><div style={{ fontSize: 13, color: 'var(--text-soft)', maxWidth: 160 }}>{t.address || '—'}</div></td>
                      <td>
                        {sub ? <span className={`sa-pill ${PLAN_BADGE[sub.plan_label] || 'starter'}`}>{sub.plan_label}</span>
                             : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td><span style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>{sub?.billing_cycle || '—'}</span></td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span className={`sa-pill ${(t.status || 'active').toLowerCase()}`}>{t.status}</span>
                          {sub && sub.status !== t.status && (
                            <span className={`sa-pill ${(sub.status || 'active').toLowerCase()}`} style={{ fontSize: 10 }}>{sub.status}</span>
                          )}
                        </div>
                      </td>
                      <td><span style={{ fontSize: 13, color: 'var(--text-soft)' }}>{fmt(sub?.expiry_date)}</span></td>
                      <td><span className="sa-td-mono" style={{ fontWeight: 700 }}>{t.userCount || 0}</span></td>
                      <td><span className="sa-td-mono">{t.complaintCount || 0}</span></td>
                      <td>
                        <button className="sa-btn sa-btn-ghost sa-btn-sm" onClick={() => setSelectedTenant(t)}>Details →</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && <AddTenantModal onClose={() => setShowAdd(false)} onSave={handleAddTenant} />}
      {selectedTenant && (
        <TenantDetailModal
          tenant={selectedTenant}
          onClose={() => setSelectedTenant(null)}
          onUpdate={handleUpdate}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
