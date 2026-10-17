import { useState, useEffect, useCallback } from 'react'

const ROLE_OPTIONS = ['RWA', 'DESK_CLERK', 'FIELD_CONTRACTOR', 'DEPARTMENT_HEAD', 'FINANCE_CLERK', 'TOWNSHIP_COO', 'SUPER_ADMIN']
const ROLE_LABELS = {
  RWA: 'RWA Rep', DESK_CLERK: 'Desk Clerk', FIELD_CONTRACTOR: 'Field Contractor',
  DEPARTMENT_HEAD: 'Dept Head', FINANCE_CLERK: 'Finance Clerk', TOWNSHIP_COO: 'Township COO', SUPER_ADMIN: 'Super Admin',
}

function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Create User Modal ────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onSave, townships, departments, contractors }) {
  const [form, setForm] = useState({
    name: '', email: '', username: '', password: '', role: 'DESK_CLERK',
    township_id: '', department_id: '', contractor_id: '', sector: '', phone: '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Name required'
    if (!form.email.trim()) e.email = 'Email required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    if (!form.username.trim()) e.username = 'Username required'
    if (!form.password || form.password.length < 8) e.password = 'Min 8 characters'
    if (form.role !== 'SUPER_ADMIN' && !form.township_id) e.township_id = 'Select a township for tenant accounts'
    if (form.role === 'DEPARTMENT_HEAD' && !form.department_id) e.department_id = 'Select a department for the Department Head'
    if (form.role === 'FIELD_CONTRACTOR' && !form.contractor_id) e.contractor_id = 'Select the contractor account'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  const filteredDepts = departments.filter((d) => !form.township_id || d.township_id === form.township_id)
  const filteredContractors = contractors.filter((c) => !form.township_id || c.township_id === form.township_id)

  return (
    <div className="sa-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sa-modal wide">
        <div className="sa-modal-header">
          <div>
            <div className="sa-modal-title">👤 Create User Account</div>
            <div className="sa-modal-subtitle">Add a new authorized user to the platform</div>
          </div>
          <button className="sa-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="sa-modal-body">
            <div className="sa-warn-box">
              ⚠️ Passwords are hashed before storage. The user should change their temporary password on first login.
            </div>
            <div className="sa-form-grid">
              <div className="sa-form-group">
                <label className="sa-label">Full Name *</label>
                <input id="sa-new-user-name" className="sa-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Dr. Ananya Sharma" />
                {errors.name && <div className="sa-form-error">{errors.name}</div>}
              </div>
              <div className="sa-form-group">
                <label className="sa-label">Email *</label>
                <input className="sa-input" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="user@township.in" />
                {errors.email && <div className="sa-form-error">{errors.email}</div>}
              </div>
              <div className="sa-form-group">
                <label className="sa-label">Username *</label>
                <input className="sa-input" value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="user_handle" />
                {errors.username && <div className="sa-form-error">{errors.username}</div>}
              </div>
              <div className="sa-form-group">
                <label className="sa-label">Temporary Password *</label>
                <input type="password" className="sa-input" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Min 8 characters" />
                {errors.password && <div className="sa-form-error">{errors.password}</div>}
              </div>
              <div className="sa-form-group">
                <label className="sa-label">Role *</label>
                <select className="sa-select" value={form.role} onChange={(e) => {
                  const role = e.target.value
                  setForm((f) => ({
                    ...f,
                    role,
                    ...(role === 'SUPER_ADMIN' ? { township_id: '', department_id: '', contractor_id: '' } : {}),
                    ...(role !== 'FIELD_CONTRACTOR' ? { contractor_id: '' } : {}),
                    ...(!['DEPARTMENT_HEAD', 'DESK_CLERK', 'FINANCE_CLERK'].includes(role) ? { department_id: '' } : {}),
                  }))
                }}>
                  {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div className="sa-form-group">
                <label className="sa-label">Assign Township</label>
                <select className="sa-select" value={form.township_id} disabled={form.role === 'SUPER_ADMIN'} onChange={(e) => setForm((f) => ({ ...f, township_id: e.target.value, department_id: '', contractor_id: '' }))}>
                  <option value="">— No Township (Platform Level) —</option>
                  {townships.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {errors.township_id && <div className="sa-form-error">{errors.township_id}</div>}
              </div>
              {form.role === 'FIELD_CONTRACTOR' && (
                <div className="sa-form-group">
                  <label className="sa-label">Contractor Account *</label>
                  <select className="sa-select" value={form.contractor_id} onChange={(e) => set('contractor_id', e.target.value)}>
                    <option value="">— Select contractor —</option>
                    {filteredContractors.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                  {errors.contractor_id && <div className="sa-form-error">{errors.contractor_id}</div>}
                </div>
              )}
              {['DEPARTMENT_HEAD', 'DESK_CLERK', 'FINANCE_CLERK'].includes(form.role) && (
                <div className="sa-form-group">
                  <label className="sa-label">Department</label>
                  <select className="sa-select" value={form.department_id} onChange={(e) => set('department_id', e.target.value)}>
                    <option value="">— None —</option>
                    {filteredDepts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  {errors.department_id && <div className="sa-form-error">{errors.department_id}</div>}
                </div>
              )}
              <div className="sa-form-group">
                <label className="sa-label">Sector / Block</label>
                <input className="sa-input" value={form.sector} onChange={(e) => set('sector', e.target.value)} placeholder="e.g. Sector 54" />
              </div>
              <div className="sa-form-group">
                <label className="sa-label">Phone</label>
                <input className="sa-input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98000 00000" />
              </div>
            </div>
          </div>
          <div className="sa-modal-footer">
            <button type="button" className="sa-btn sa-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" id="sa-btn-save-user" className="sa-btn sa-btn-primary" disabled={saving}>
              {saving ? 'Creating…' : '✓ Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── User Detail Modal ────────────────────────────────────────────────────────
function UserDetailModal({ user, onClose, onStatusChange, onResetPassword, onUpdateRole, townships, departments, contractors }) {
  const [tab, setTab] = useState('info')
  const [newStatus, setNewStatus] = useState(user.status)
  const [statusReason, setStatusReason] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [newRole, setNewRole] = useState(user.role)
  const [newTownship, setNewTownship] = useState(user.township_id || '')
  const [newDept, setNewDept] = useState(user.department_id || '')
  const [newContractor, setNewContractor] = useState(user.contractor_id || '')
  const [saving, setSaving] = useState(false)

  const filteredDepts = departments.filter((d) => !newTownship || d.township_id === newTownship)
  const filteredContractors = contractors.filter((c) => !newTownship || c.township_id === newTownship)

  async function handleStatusSave() {
    if (newStatus === 'SUSPENDED' && !statusReason.trim()) { alert('Reason required for suspension.'); return }
    setSaving(true)
    try { await onStatusChange(user.id, newStatus, statusReason) } finally { setSaving(false) }
  }

  async function handlePasswordReset() {
    if (newPassword.length < 8) { alert('Password must be at least 8 characters.'); return }
    if (newPassword !== confirmPw) { alert('Passwords do not match.'); return }
    setSaving(true)
    try { await onResetPassword(user.id, newPassword) } finally { setSaving(false); setNewPassword(''); setConfirmPw('') }
  }

  async function handleRoleSave() {
    setSaving(true)
    try { await onUpdateRole(user.id, { role: newRole, township_id: newTownship || null, department_id: newDept || null, contractor_id: newRole === 'FIELD_CONTRACTOR' ? newContractor || null : null }) } finally { setSaving(false) }
  }

  return (
    <div className="sa-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sa-modal wide">
        <div className="sa-modal-header">
          <div>
            <div className="sa-modal-title">{user.name}</div>
            <div className="sa-modal-subtitle" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
              <span className={`sa-pill ${(user.status || 'active').toLowerCase()}`}>{user.status}</span>
              <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{ROLE_LABELS[user.role] || user.role}</span>
            </div>
          </div>
          <button className="sa-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="sa-modal-tabs">
          {['info', 'role', 'status', 'password'].map((t) => (
            <button key={t} className={`sa-modal-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t === 'password' ? 'Reset Password' : t}
            </button>
          ))}
        </div>

        <div className="sa-modal-body">
          {tab === 'info' && (
            <div className="sa-detail-grid">
              <div><div className="sa-detail-label">Email</div><div className="sa-detail-value">{user.email}</div></div>
              <div><div className="sa-detail-label">Username</div><div className="sa-detail-value" style={{ fontFamily: 'var(--font-mono)' }}>{user.username}</div></div>
              <div><div className="sa-detail-label">Role</div><div className="sa-detail-value">{ROLE_LABELS[user.role] || user.role}</div></div>
              <div><div className="sa-detail-label">Township</div><div className="sa-detail-value">{user.township_name || <span style={{ color: 'var(--sa-accent)', fontWeight: 700 }}>Platform Level</span>}</div></div>
              <div><div className="sa-detail-label">Department</div><div className="sa-detail-value">{user.department_name || '—'}</div></div>
              <div><div className="sa-detail-label">Contractor</div><div className="sa-detail-value">{user.contractor_name || '—'}</div></div>
              <div><div className="sa-detail-label">Sector</div><div className="sa-detail-value">{user.sector || '—'}</div></div>
              <div><div className="sa-detail-label">Phone</div><div className="sa-detail-value">{user.phone || '—'}</div></div>
              <div><div className="sa-detail-label">Last Login</div><div className="sa-detail-value">{user.last_login_at ? new Date(user.last_login_at).toLocaleDateString('en-IN') : '—'}</div></div>
            </div>
          )}

          {tab === 'role' && (
            <div>
              <div className="sa-info-box">
                ℹ️ Changing a user's role may affect which features they can access. Only assign roles appropriate for the user's position.
              </div>
              <div className="sa-form-grid">
                <div className="sa-form-group">
                  <label className="sa-label">Role</label>
                  <select className="sa-select" value={newRole} onChange={(e) => {
                    const role = e.target.value
                    setNewRole(role)
                    if (role !== 'FIELD_CONTRACTOR') setNewContractor('')
                    if (role === 'SUPER_ADMIN') { setNewTownship(''); setNewDept('') }
                    if (!['DEPARTMENT_HEAD', 'DESK_CLERK', 'FINANCE_CLERK'].includes(role)) setNewDept('')
                  }}>
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
                <div className="sa-form-group">
                  <label className="sa-label">Township</label>
                  <select className="sa-select" value={newTownship} disabled={newRole === 'SUPER_ADMIN'} onChange={(e) => { setNewTownship(e.target.value); setNewDept(''); setNewContractor('') }}>
                    <option value="">— Platform Level —</option>
                    {townships.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                {newRole === 'FIELD_CONTRACTOR' && (
                  <div className="sa-form-group">
                    <label className="sa-label">Contractor Account</label>
                    <select className="sa-select" value={newContractor} onChange={(e) => setNewContractor(e.target.value)}>
                      <option value="">— Select contractor —</option>
                      {filteredContractors.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                )}
                {['DEPARTMENT_HEAD', 'DESK_CLERK', 'FINANCE_CLERK'].includes(newRole) && (
                  <div className="sa-form-group">
                    <label className="sa-label">Department</label>
                    <select className="sa-select" value={newDept} onChange={(e) => setNewDept(e.target.value)}>
                      <option value="">— None —</option>
                      {filteredDepts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="sa-btn sa-btn-primary" onClick={handleRoleSave} disabled={saving}>
                  {saving ? 'Saving…' : '✓ Update Role & Assignment'}
                </button>
              </div>
            </div>
          )}

          {tab === 'status' && (
            <div>
              <div className="sa-form-grid cols-1">
                <div className="sa-form-group">
                  <label className="sa-label">Account Status</label>
                  <select className="sa-select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
                <div className="sa-form-group">
                  <label className="sa-label">Reason {newStatus !== user.status && newStatus === 'SUSPENDED' ? '(required)' : '(optional)'}</label>
                  <input className="sa-input" value={statusReason} onChange={(e) => setStatusReason(e.target.value)} placeholder="Reason for status change" />
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className={`sa-btn ${newStatus === 'SUSPENDED' ? 'sa-btn-danger' : 'sa-btn-primary'}`}
                  onClick={handleStatusSave}
                  disabled={saving || newStatus === user.status}
                >
                  {saving ? 'Saving…' : `Set to ${newStatus}`}
                </button>
              </div>
            </div>
          )}

          {tab === 'password' && (
            <div>
              <div className="sa-warn-box">
                ⚠️ This resets the user's password immediately. The new password is required for their next login. Passwords are stored as bcrypt hashes.
              </div>
              <div className="sa-form-grid cols-1">
                <div className="sa-form-group">
                  <label className="sa-label">New Password (min 8 characters)</label>
                  <input type="password" className="sa-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
                </div>
                <div className="sa-form-group">
                  <label className="sa-label">Confirm Password</label>
                  <input type="password" className="sa-input" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Repeat password" />
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="sa-btn sa-btn-danger" onClick={handlePasswordReset} disabled={saving || !newPassword} id="sa-btn-reset-pw">
                  {saving ? 'Resetting…' : '🔑 Reset Password'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function UsersAccess({ api, showToast }) {
  const [users, setUsers] = useState([])
  const [townships, setTownships] = useState([])
  const [departments, setDepartments] = useState([])
  const [contractors, setContractors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterTownship, setFilterTownship] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [u, t, d, c] = await Promise.all([api.getUsers(), api.getTenants(), api.getDepartments(), api.getContractors()])
      setUsers(Array.isArray(u) ? u : [])
      setTownships(Array.isArray(t) ? t : [])
      setDepartments(Array.isArray(d) ? d : [])
      setContractors(Array.isArray(c) ? c : [])
    } catch (e) {
      showToast(e.message, 'error')
    } finally { setLoading(false) }
  }, [api, showToast])

  useEffect(() => { loadAll() }, [loadAll])

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      (!q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q)) &&
      (!filterRole || u.role === filterRole) &&
      (!filterTownship || u.township_id === filterTownship) &&
      (!filterStatus || u.status === filterStatus)
    )
  })

  async function handleCreateUser(form) {
    try { await api.createUser(form); showToast('User account created.', 'success'); setShowCreate(false); loadAll() }
    catch (e) { showToast(e.message, 'error') }
  }

  async function handleStatusChange(id, status, reason) {
    try { await api.updateUserStatus(id, status, reason); showToast(`Account ${status.toLowerCase()}.`, 'success'); setSelectedUser(null); loadAll() }
    catch (e) { showToast(e.message, 'error') }
  }

  async function handleResetPassword(id, new_password) {
    try { await api.resetUserPassword(id, new_password); showToast('Password reset successfully.', 'success'); setSelectedUser(null) }
    catch (e) { showToast(e.message, 'error') }
  }

  async function handleUpdateRole(id, payload) {
    try { await api.updateUser(id, payload); showToast('Role & assignment updated.', 'success'); setSelectedUser(null); loadAll() }
    catch (e) { showToast(e.message, 'error') }
  }

  return (
    <div>
      <div className="sa-page-header">
        <div>
          <div className="sa-page-title">Users & Access</div>
          <div className="sa-page-desc">Global user directory across all tenants</div>
        </div>
        <button className="sa-btn sa-btn-primary" onClick={() => setShowCreate(true)} id="sa-btn-create-user">
          + Create User
        </button>
      </div>

      <div className="sa-filter-bar">
        <div className="sa-search-wrap">
          <span className="sa-search-icon">🔍</span>
          <input id="sa-user-search" className="sa-search-input" placeholder="Search name, email, username…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="sa-select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select className="sa-select" value={filterTownship} onChange={(e) => setFilterTownship(e.target.value)}>
          <option value="">All Townships</option>
          {townships.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="sa-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {loading ? (
        <div className="sa-loading"><div className="sa-spinner" /> Loading users…</div>
      ) : filtered.length === 0 ? (
        <div className="sa-empty"><div className="sa-empty-icon">👥</div><div className="sa-empty-title">No users found</div></div>
      ) : (
        <div className="sa-panel">
          <div className="sa-panel-header">
            <div className="sa-panel-title">User Directory</div>
            <div className="sa-panel-subtitle">{filtered.length} account{filtered.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email / Username</th>
                  <th>Role</th>
                  <th>Township</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td><div className="sa-td-name">{u.name}</div></td>
                    <td>
                      <div style={{ fontSize: 13.5, color: 'var(--text)' }}>{u.email}</div>
                      <div className="sa-td-sub">{u.username}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: u.role === 'SUPER_ADMIN' ? 'var(--sa-accent)' : 'var(--accent-blue)' }}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td><span style={{ fontSize: 13, color: 'var(--text-soft)' }}>{u.township_name || <span style={{ color: 'var(--primary-dark)', fontWeight: 700 }}>Platform</span>}</span></td>
                    <td><span className={`sa-pill ${(u.status || 'active').toLowerCase()}`}>{u.status}</span></td>
                    <td><span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('en-IN') : '—'}</span></td>
                    <td><button className="sa-btn sa-btn-ghost sa-btn-sm" onClick={() => setSelectedUser(u)}>Manage →</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateUserModal onClose={() => setShowCreate(false)} onSave={handleCreateUser} townships={townships} departments={departments} contractors={contractors} />
      )}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onStatusChange={handleStatusChange}
          onResetPassword={handleResetPassword}
          onUpdateRole={handleUpdateRole}
          townships={townships}
          departments={departments}
          contractors={contractors}
        />
      )}
    </div>
  )
}
