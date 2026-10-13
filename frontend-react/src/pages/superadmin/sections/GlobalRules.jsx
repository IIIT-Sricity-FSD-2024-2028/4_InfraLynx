import { useState, useEffect, useCallback } from 'react'

const CATEGORY_META = {
  FINANCIAL: { icon: '💰', label: 'Financial Approval Thresholds', unit: '₹', note: 'Department Head, independent COO, and joint-approval thresholds are enforced by live estimate submission and approval workflows. Changes are audited and take effect immediately.' },
  SLA:       { icon: '⏱️', label: 'SLA Default Timings', unit: 'hrs', note: 'Configured values are used when new complaint and work-order SLA deadlines are calculated. Existing deadlines are not recalculated; automated escalation monitoring is not implemented.' },
  WORKFLOW:  { icon: '🔄', label: 'Workflow Rules', unit: 'days', note: 'Auto-closure days are stored for policy configuration, but an automated closure job is not implemented yet.' },
}

export default function GlobalRules({ api, showToast }) {
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editValues, setEditValues] = useState({})
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('FINANCIAL')
  const [reason, setReason] = useState('')
  const [confirmSave, setConfirmSave] = useState(false)

  const [amcRates, setAmcRates] = useState([])
  const [editingRate, setEditingRate] = useState(null)
  const [rateForm, setRateForm] = useState({ rate: '', reason: '' })

  const [departments, setDepartments] = useState([])
  const [townships, setTownships] = useState([])
  const [showAddDept, setShowAddDept] = useState(false)
  const [deptForm, setDeptForm] = useState({ township_id: '', name: '', description: '' })

  const [contractors, setContractors] = useState([])
  const [showAddContractor, setShowAddContractor] = useState(false)
  const [contractorForm, setContractorForm] = useState({ township_id: '', company_name: '', contact_person: '', email: '', phone: '', gstin: '', address: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cfg, rates, depts, tenants, conts] = await Promise.all([
        api.getConfig(), api.getAmcRates(), api.getDepartments(), api.getTenants(), api.getContractors()
      ])
      setConfigs(Array.isArray(cfg) ? cfg : [])
      const initValues = {}
      ;(Array.isArray(cfg) ? cfg : []).forEach((c) => { initValues[c.key] = c.value })
      setEditValues(initValues)
      setAmcRates(Array.isArray(rates) ? rates : [])
      setDepartments(Array.isArray(depts) ? depts : [])
      setTownships(Array.isArray(tenants) ? tenants : [])
      setContractors(Array.isArray(conts) ? conts : [])
    } catch (e) {
      showToast(e.message, 'error')
    } finally { setLoading(false) }
  }, [api, showToast])

  useEffect(() => { load() }, [load])

  function handleSaveConfig() {
    if (!reason.trim()) { alert('Please provide a reason for this configuration change.'); return }
    const changed = configs.filter((c) => c.category === activeTab && String(editValues[c.key]) !== String(c.value))
    if (changed.length === 0) { showToast('No changes to save.', 'error'); return }
    setConfirmSave(true)
  }

  async function doSave() {
    setConfirmSave(false)
    setSaving(true)
    const updates = {}
    configs.filter((c) => c.category === activeTab).forEach((c) => {
      if (String(editValues[c.key]) !== String(c.value)) updates[c.key] = editValues[c.key]
    })
    try {
      const updated = await api.updateConfig(updates, reason)
      if (Array.isArray(updated)) {
        setConfigs(updated)
        const nv = {}; updated.forEach((c) => { nv[c.key] = c.value }); setEditValues(nv)
      }
      showToast('Configuration saved successfully.', 'success')
      setReason('')
    } catch (e) {
      showToast(e.message, 'error')
    } finally { setSaving(false) }
  }

  async function handleSaveRate() {
    if (!rateForm.rate || isNaN(parseFloat(rateForm.rate))) { alert('Enter a valid rate.'); return }
    try {
      await api.updateAmcRate(editingRate.id, { rate: parseFloat(rateForm.rate), reason: rateForm.reason })
      showToast('AMC rate updated. Existing approved estimates are NOT retroactively changed.', 'success')
      setEditingRate(null); load()
    } catch (e) { showToast(e.message, 'error') }
  }

  async function handleAddDept(e) {
    e.preventDefault()
    if (!deptForm.township_id || !deptForm.name.trim()) { alert('Township and name are required.'); return }
    try { await api.createDepartment(deptForm); showToast('Department created.', 'success'); setShowAddDept(false); setDeptForm({ township_id: '', name: '', description: '' }); load() }
    catch (e) { showToast(e.message, 'error') }
  }

  async function handleAddContractor(e) {
    e.preventDefault()
    if (!contractorForm.company_name.trim() || !contractorForm.email.trim()) { alert('Company name and email are required.'); return }
    try { await api.createContractor(contractorForm); showToast('Contractor registered.', 'success'); setShowAddContractor(false); setContractorForm({ township_id: '', company_name: '', contact_person: '', email: '', phone: '', gstin: '', address: '' }); load() }
    catch (e) { showToast(e.message, 'error') }
  }

  if (loading) return <div className="sa-loading"><div className="sa-spinner" /> Loading configuration…</div>

  const ALL_TABS = ['FINANCIAL', 'SLA', 'WORKFLOW', 'AMC_RATES', 'DEPARTMENTS', 'CONTRACTORS']
  const TAB_LABELS = {
    FINANCIAL: '💰 Financial', SLA: '⏱️ SLA', WORKFLOW: '🔄 Workflow',
    AMC_RATES: '📋 AMC Rates', DEPARTMENTS: '🏗️ Departments', CONTRACTORS: '🔧 Contractors',
  }

  return (
    <div>
      <div className="sa-page-header">
        <div>
          <div className="sa-page-title">Global Rules & Catalogs</div>
          <div className="sa-page-desc">Platform-wide configuration, approval thresholds, SLA defaults, and master catalogs</div>
        </div>
      </div>

      {/* Sub-tab bar */}
      <div style={{ borderBottom: '1px solid var(--line)', display: 'flex', gap: 4, marginBottom: 24, overflowX: 'auto' }}>
        {ALL_TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`sa-tab-btn${activeTab === tab ? ' active' : ''}`}>
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Config Panels */}
      {['FINANCIAL', 'SLA', 'WORKFLOW'].includes(activeTab) && (
        <div className="sa-panel">
          <div className="sa-panel-header">
            <div>
              <div className="sa-panel-title">{CATEGORY_META[activeTab]?.icon} {CATEGORY_META[activeTab]?.label}</div>
            </div>
          </div>
          <div className="sa-panel-body">
            <div className="sa-info-box">{CATEGORY_META[activeTab]?.note}</div>
            {configs.filter((c) => c.category === activeTab).map((c) => (
              <div key={c.id} className="sa-config-row">
                <div className="sa-config-info">
                  <div className="sa-config-key">{c.key}</div>
                  <div className="sa-config-desc">{c.description}</div>
                  {c.updated_at && (
                    <div className="sa-config-updated">
                      Last updated {new Date(c.updated_at).toLocaleDateString('en-IN')} by {c.updated_by}
                    </div>
                  )}
                </div>
                <div className="sa-config-ctrl">
                  <input
                    type="number"
                    className="sa-config-num"
                    value={editValues[c.key] ?? c.value}
                    min={0}
                    onChange={(e) => setEditValues((v) => ({ ...v, [c.key]: e.target.value }))}
                    id={`sa-config-${c.key}`}
                  />
                  <span className="sa-config-unit">{CATEGORY_META[activeTab]?.unit}</span>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              <div className="sa-form-group">
                <label className="sa-label">Reason for Change (required before saving)</label>
                <input className="sa-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Updated per Q4 board resolution" id="sa-config-reason" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button className="sa-btn sa-btn-primary" onClick={handleSaveConfig} disabled={saving} id="sa-btn-save-config">
                  {saving ? 'Saving…' : '✓ Save Configuration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmSave && (
        <div className="sa-modal-overlay">
          <div className="sa-modal narrow">
            <div className="sa-modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div className="sa-confirm-icon">⚙️</div>
              <div className="sa-confirm-title">Confirm Configuration Change</div>
              <div className="sa-confirm-body">
                This change will take effect immediately and be recorded in the platform audit log.
                <br /><br /><strong>Reason:</strong> {reason}
              </div>
              <div className="sa-warn-box" style={{ marginTop: 16, textAlign: 'left' }}>
                ⚠️ Financial threshold changes affect the approval workflow for all future estimates across all townships.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
                <button className="sa-btn sa-btn-secondary" onClick={() => setConfirmSave(false)}>Cancel</button>
                <button className="sa-btn sa-btn-primary" onClick={doSave} id="sa-btn-confirm-config">Confirm Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AMC Rates */}
      {activeTab === 'AMC_RATES' && (
        <div>
          <div className="sa-warn-box">
            ⚠️ <strong>Rate changes are NOT retroactive.</strong> Existing approved estimates retain their locked rate snapshots. Only new estimates will use updated rates.
          </div>
          <div className="sa-panel">
            <div className="sa-panel-header">
              <div className="sa-panel-title">📋 AMC Rate Catalog</div>
              <div className="sa-panel-subtitle">{amcRates.length} items</div>
            </div>
            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead>
                  <tr><th>Code</th><th>Item</th><th>Category</th><th>Unit</th><th>Rate (₹)</th><th>AMC Contract</th><th></th></tr>
                </thead>
                <tbody>
                  {amcRates.map((r) => (
                    <tr key={r.id}>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--sa-accent)', fontWeight: 700 }}>{r.item_code}</span></td>
                      <td><div className="sa-td-name">{r.item_name}</div></td>
                      <td><span style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>{r.service_type}</span></td>
                      <td><span style={{ fontSize: 12.5 }}>{r.unit}</span></td>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>₹{Number(r.rate).toLocaleString('en-IN')}</span></td>
                      <td><span style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 160, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.amc_title || '—'}</span></td>
                      <td><button className="sa-btn sa-btn-ghost sa-btn-sm" onClick={() => { setEditingRate(r); setRateForm({ rate: r.rate, reason: '' }) }}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {editingRate && (
            <div className="sa-modal-overlay" onClick={(e) => e.target === e.currentTarget && setEditingRate(null)}>
              <div className="sa-modal narrow">
                <div className="sa-modal-header">
                  <div><div className="sa-modal-title">Edit AMC Rate</div><div className="sa-modal-subtitle">{editingRate.item_name}</div></div>
                  <button className="sa-modal-close" onClick={() => setEditingRate(null)}>✕</button>
                </div>
                <div className="sa-modal-body">
                  <div className="sa-warn-box">⚠️ This change does NOT affect previously approved estimates.</div>
                  <div className="sa-form-group">
                    <label className="sa-label">New Rate (₹ per {editingRate.unit})</label>
                    <input type="number" className="sa-input" value={rateForm.rate} min={0} onChange={(e) => setRateForm((f) => ({ ...f, rate: e.target.value }))} />
                  </div>
                  <div className="sa-form-group" style={{ marginTop: 12 }}>
                    <label className="sa-label">Reason for Change</label>
                    <input className="sa-input" value={rateForm.reason} onChange={(e) => setRateForm((f) => ({ ...f, reason: e.target.value }))} placeholder="e.g. Market rate revision Q4 FY26" />
                  </div>
                </div>
                <div className="sa-modal-footer">
                  <button className="sa-btn sa-btn-secondary" onClick={() => setEditingRate(null)}>Cancel</button>
                  <button className="sa-btn sa-btn-primary" onClick={handleSaveRate}>Save Rate</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Departments */}
      {activeTab === 'DEPARTMENTS' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="sa-btn sa-btn-primary" onClick={() => setShowAddDept(true)} id="sa-btn-add-dept">+ Add Department</button>
          </div>
          <div className="sa-panel">
            <div className="sa-panel-header">
              <div className="sa-panel-title">🏗️ Department Registry</div>
              <div className="sa-panel-subtitle">{departments.length} departments</div>
            </div>
            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead><tr><th>Department</th><th>Township</th><th>Description</th><th>Status</th></tr></thead>
                <tbody>
                  {departments.map((d) => (
                    <tr key={d.id}>
                      <td><div className="sa-td-name">{d.name}</div></td>
                      <td><span style={{ fontSize: 13, color: 'var(--text-soft)' }}>{d.township_name || '—'}</span></td>
                      <td><span style={{ fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 240, display: 'block' }}>{d.description || '—'}</span></td>
                      <td><span className={`sa-pill ${(d.status || 'active').toLowerCase()}`}>{d.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {showAddDept && (
            <div className="sa-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddDept(false)}>
              <div className="sa-modal">
                <div className="sa-modal-header">
                  <div className="sa-modal-title">🏗️ Add Department</div>
                  <button className="sa-modal-close" onClick={() => setShowAddDept(false)}>✕</button>
                </div>
                <form onSubmit={handleAddDept}>
                  <div className="sa-modal-body">
                    <div className="sa-form-group" style={{ marginBottom: 12 }}>
                      <label className="sa-label">Township *</label>
                      <select className="sa-select" value={deptForm.township_id} onChange={(e) => setDeptForm((f) => ({ ...f, township_id: e.target.value }))}>
                        <option value="">— Select Township —</option>
                        {townships.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="sa-form-group" style={{ marginBottom: 12 }}>
                      <label className="sa-label">Department Name *</label>
                      <input className="sa-input" value={deptForm.name} onChange={(e) => setDeptForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Civil Infrastructure & Roads" />
                    </div>
                    <div className="sa-form-group">
                      <label className="sa-label">Description</label>
                      <input className="sa-input" value={deptForm.description} onChange={(e) => setDeptForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description of department scope" />
                    </div>
                  </div>
                  <div className="sa-modal-footer">
                    <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setShowAddDept(false)}>Cancel</button>
                    <button type="submit" className="sa-btn sa-btn-primary">✓ Add Department</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contractors */}
      {activeTab === 'CONTRACTORS' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="sa-btn sa-btn-primary" onClick={() => setShowAddContractor(true)} id="sa-btn-add-contractor">+ Register Contractor</button>
          </div>
          <div className="sa-panel">
            <div className="sa-panel-header">
              <div className="sa-panel-title">🔧 Contractor Registry</div>
              <div className="sa-panel-subtitle">{contractors.length} contractors</div>
            </div>
            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead><tr><th>Company</th><th>Contact</th><th>Email</th><th>Phone</th><th>GSTIN</th><th>Rating</th><th>Status</th></tr></thead>
                <tbody>
                  {contractors.map((c) => (
                    <tr key={c.id}>
                      <td><div className="sa-td-name">{c.company_name}</div></td>
                      <td><span style={{ fontSize: 13, color: 'var(--text-soft)' }}>{c.contact_person || '—'}</span></td>
                      <td><span style={{ fontSize: 13 }}>{c.email}</span></td>
                      <td><span style={{ fontSize: 13, color: 'var(--text-soft)' }}>{c.phone || '—'}</span></td>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-muted)' }}>{c.gstin || '—'}</span></td>
                      <td>{c.rating > 0 ? <span style={{ fontSize: 13, fontWeight: 700 }}>★ {c.rating}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      <td><span className={`sa-pill ${(c.status || 'active').toLowerCase()}`}>{c.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {showAddContractor && (
            <div className="sa-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddContractor(false)}>
              <div className="sa-modal wide">
                <div className="sa-modal-header">
                  <div className="sa-modal-title">🔧 Register Contractor</div>
                  <button className="sa-modal-close" onClick={() => setShowAddContractor(false)}>✕</button>
                </div>
                <form onSubmit={handleAddContractor}>
                  <div className="sa-modal-body">
                    <div className="sa-form-grid">
                      <div className="sa-form-group full">
                        <label className="sa-label">Company Name *</label>
                        <input className="sa-input" value={contractorForm.company_name} onChange={(e) => setContractorForm((f) => ({ ...f, company_name: e.target.value }))} placeholder="e.g. L&T Urban Infra Works Ltd." />
                      </div>
                      <div className="sa-form-group">
                        <label className="sa-label">Contact Person</label>
                        <input className="sa-input" value={contractorForm.contact_person} onChange={(e) => setContractorForm((f) => ({ ...f, contact_person: e.target.value }))} />
                      </div>
                      <div className="sa-form-group">
                        <label className="sa-label">Email *</label>
                        <input className="sa-input" value={contractorForm.email} onChange={(e) => setContractorForm((f) => ({ ...f, email: e.target.value }))} />
                      </div>
                      <div className="sa-form-group">
                        <label className="sa-label">Phone</label>
                        <input className="sa-input" value={contractorForm.phone} onChange={(e) => setContractorForm((f) => ({ ...f, phone: e.target.value }))} />
                      </div>
                      <div className="sa-form-group">
                        <label className="sa-label">GSTIN</label>
                        <input className="sa-input" value={contractorForm.gstin} onChange={(e) => setContractorForm((f) => ({ ...f, gstin: e.target.value }))} />
                      </div>
                      <div className="sa-form-group">
                        <label className="sa-label">Assign Township</label>
                        <select className="sa-select" value={contractorForm.township_id} onChange={(e) => setContractorForm((f) => ({ ...f, township_id: e.target.value }))}>
                          <option value="">— Platform-wide —</option>
                          {townships.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                      <div className="sa-form-group full">
                        <label className="sa-label">Address</label>
                        <input className="sa-input" value={contractorForm.address} onChange={(e) => setContractorForm((f) => ({ ...f, address: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                  <div className="sa-modal-footer">
                    <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setShowAddContractor(false)}>Cancel</button>
                    <button type="submit" className="sa-btn sa-btn-primary">✓ Register</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
