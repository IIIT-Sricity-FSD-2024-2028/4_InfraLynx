import { useState } from 'react';
import { cooApi } from '../../services/api.js';

export default function DepartmentHeadManagement({ departmentHeads, departments, onRefresh }) {
  const [selectedHead, setSelectedHead] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [targetDeptId, setTargetDeptId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [staffModalDept, setStaffModalDept] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Create form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDeptId, setFormDeptId] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function openCreateModal() {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormPhone('');
    setFormDeptId('');
    setShowPassword(false);
    setCreateModalOpen(true);
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      alert('Please fill in Name, Email, and Password.');
      return;
    }
    if (formPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    try {
      setSubmitting(true);
      await cooApi.createDepartmentHead({
        name: formName.trim(),
        email: formEmail.trim(),
        password: formPassword,
        phone: formPhone.trim() || undefined,
        departmentId: formDeptId || undefined,
      });
      alert(`Department Head '${formName}' created successfully! They can now log in using email '${formEmail.trim()}'.`);
      setCreateModalOpen(false);
      onRefresh();
    } catch (err) {
      alert(`Creation failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  function openAssignModal(head) {
    setSelectedHead(head);
    setTargetDeptId(head.assignedDepartment?.id || '');
    setAssignModalOpen(true);
  }

  async function handleAssignSubmit(e) {
    e.preventDefault();
    if (!targetDeptId) {
      alert('Please select a department.');
      return;
    }
    try {
      setSubmitting(true);
      await cooApi.assignDepartmentHead(targetDeptId, selectedHead.id);
      alert(`Department Head '${selectedHead.name}' successfully assigned!`);
      setAssignModalOpen(false);
      onRefresh();
    } catch (err) {
      alert(`Assignment failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnassignHead(head) {
    if (!head.assignedDepartment) return;
    if (!confirm(`Are you sure you want to unassign '${head.name}' from '${head.assignedDepartment.name}'? This will make the department vacant.`)) {
      return;
    }
    try {
      setSubmitting(true);
      await cooApi.unassignDepartmentHead(head.id);
      alert(`Department Head '${head.name}' has been unassigned and placed on standby.`);
      onRefresh();
    } catch (err) {
      alert(`Unassignment failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function openStaffModalForHead(head) {
    if (!head.assignedDepartment?.id) {
      alert('This Department Head is not currently assigned to any department.');
      return;
    }
    setStaffModalDept(head.assignedDepartment);
    setLoadingStaff(true);
    try {
      const staff = await cooApi.getDepartmentStaff(head.assignedDepartment.id);
      setStaffList(staff);
    } catch (err) {
      alert(`Failed to load staff: ${err.message}`);
    } finally {
      setLoadingStaff(false);
    }
  }

  return (
    <div>
      {/* Banner */}
      <div className="coo-banner">
        <div>
          <h2 className="coo-banner-title">Executive Department Heads Governance</h2>
          <p className="coo-banner-sub">
            Oversee certified Department Heads, reassign leadership across municipal divisions, and inspect subordinate staff teams.
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-coo-primary">
          ➕ Create Department Head
        </button>
      </div>

      {/* Department Heads Directory Grid */}
      <div className="depthead-grid">
        {departmentHeads.map((head) => (
          <div key={head.id} className="coo-panel depthead-card">
            <div className="coo-panel-header">
              <div className="depthead-header-inner">
                <div className="depthead-avatar">
                  {head.name[0]}
                </div>
                <div>
                  <h4 className="depthead-name">{head.name}</h4>
                  <div className="depthead-role-label">
                    Executive Department Head
                  </div>
                </div>
              </div>
              <span className={`status-pill ${head.status?.toLowerCase()}`}>
                {head.status || 'ACTIVE'}
              </span>
            </div>

            <div className="coo-panel-body depthead-card-body">
              <div className="depthead-info-box">
                <span className="depthead-info-label">
                  Assigned Civic Division
                </span>
                {head.assignedDepartment ? (
                  <strong className="depthead-division-name">
                    {head.assignedDepartment.name} ({head.assignedDepartment.code})
                  </strong>
                ) : (
                  <span className="depthead-standby-tag">
                    ⚠️ Standby / Unassigned
                  </span>
                )}
              </div>

              <div className="depthead-stat-grid">
                <div className="depthead-stat-cell">
                  <span className="depthead-stat-label">Staff Managed</span>
                  <strong className="depthead-stat-num">{head.staffCount} Officers</strong>
                </div>
                <div className="depthead-stat-cell">
                  <span className="depthead-stat-label">Active Tickets</span>
                  <strong className="depthead-stat-num blue">{head.activeTicketsCount} WOs</strong>
                </div>
              </div>

              <div className="depthead-contact-block">
                <div>📧 <strong>Email:</strong> {head.email}</div>
                <div>📞 <strong>Phone:</strong> {head.phone}</div>
              </div>

              <div className="depthead-card-actions">
                <button onClick={() => openAssignModal(head)} className="btn-coo-primary depthead-action-btn">
                  🔄 Transfer Dept
                </button>
                {head.assignedDepartment && (
                  <button
                    onClick={() => handleUnassignHead(head)}
                    className="btn-coo-danger depthead-action-btn"
                    title="Remove from department and make department vacant"
                  >
                    ⛔ Unassign Dept
                  </button>
                )}
                {head.assignedDepartment && (
                  <button onClick={() => openStaffModalForHead(head)} className="btn-coo-secondary depthead-staff-btn">
                    👥 Staff
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ASSIGN / CHANGE DEPARTMENT MODAL */}
      {assignModalOpen && selectedHead && (
        <div className="coo-modal-overlay" onClick={() => setAssignModalOpen(false)}>
          <div className="coo-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="coo-modal-header">
              <h3 className="coo-modal-title">
                Assign / Transfer Leadership: {selectedHead.name}
              </h3>
              <button onClick={() => setAssignModalOpen(false)} className="coo-modal-close-btn">✕</button>
            </div>

            <form onSubmit={handleAssignSubmit}>
              <div className="coo-modal-body">
                <p className="dossier-paragraph soft">
                  Transfer <strong>{selectedHead.name}</strong> to head a municipal department. This official will gain authority over all desk clerks, estimate approvals, and work orders in that department.
                </p>

                <div className="coo-form-group">
                  <label className="coo-form-label">
                    Target Department:
                  </label>
                  <select
                    value={targetDeptId}
                    onChange={(e) => setTargetDeptId(e.target.value)}
                    required
                    className="coo-select coo-input-full"
                  >
                    <option value="">-- Select Target Department --</option>
                    {departments.map((d) => {
                      const isOccupiedByOther = Boolean(d.departmentHead && d.departmentHead.id !== selectedHead.id);
                      const isCurrent = Boolean(d.departmentHead && d.departmentHead.id === selectedHead.id);
                      return (
                        <option key={d.id} value={d.id} disabled={isOccupiedByOther}>
                          {d.name} {isCurrent ? '(Currently Assigned)' : isOccupiedByOther ? `(Occupied: ${d.departmentHead.name} - must unassign first)` : '(Vacant - Ready)'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="coo-modal-footer">
                <button type="button" onClick={() => setAssignModalOpen(false)} className="btn-coo-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-coo-primary">
                  {submitting ? 'Transferring...' : 'Confirm Department Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE DEPARTMENT HEAD MODAL */}
      {createModalOpen && (
        <div className="coo-modal-overlay" onClick={() => setCreateModalOpen(false)}>
          <div className="coo-modal-box sm" onClick={(e) => e.stopPropagation()}>
            <div className="coo-modal-header">
              <h3 className="coo-modal-title">
                ➕ Create Executive Department Head
              </h3>
              <button onClick={() => setCreateModalOpen(false)} className="coo-modal-close-btn">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="coo-modal-body">
                <p className="dossier-paragraph soft">
                  Create an accredited Department Head account. Login credentials will be generated immediately so the official can log into the InfraLynx portal.
                </p>

                <div className="coo-form-group">
                  <label className="coo-form-label">
                    Official Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Er. Rajesh K. Sharma"
                    className="coo-input coo-input-full"
                  />
                </div>

                <div className="coo-form-grid-2col coo-form-group">
                  <div>
                    <label className="coo-form-label">
                      Official Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. head.elec@infralynx.com"
                      className="coo-input coo-input-full"
                    />
                  </div>
                  <div>
                    <label className="coo-form-label">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+91 99100 87654"
                      className="coo-input coo-input-full"
                    />
                  </div>
                </div>

                <div className="coo-form-group">
                  <div className="coo-form-label-row">
                    <label className="coo-form-label">
                      Initial Login Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="depthead-toggle-btn"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Minimum 6 characters (e.g. Head@2026)"
                    className="coo-input coo-input-full"
                  />
                  <span className="coo-form-help">
                    Official can immediately sign in at portal login using this password.
                  </span>
                </div>

                <div className="coo-form-group">
                  <label className="coo-form-label">
                    Assign Municipal Department (One Head per Dept)
                  </label>
                  <select
                    value={formDeptId}
                    onChange={(e) => setFormDeptId(e.target.value)}
                    className="coo-select coo-input-full"
                  >
                    <option value="">-- Standby / Unassigned (Assign Later) --</option>
                    {departments.map((d) => {
                      const isOccupied = Boolean(d.departmentHead);
                      return (
                        <option key={d.id} value={d.id} disabled={isOccupied}>
                          {d.name} {isOccupied ? `(Occupied: ${d.departmentHead.name} - must unassign first)` : '(Vacant - Ready)'}
                        </option>
                      );
                    })}
                  </select>
                  <span className="coo-form-help">
                    * If a department already has an assigned head, unassign that head first before assigning a new one.
                  </span>
                </div>
              </div>

              <div className="coo-modal-footer">
                <button type="button" onClick={() => setCreateModalOpen(false)} className="btn-coo-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-coo-primary">
                  {submitting ? 'Creating...' : 'Create & Enable Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STAFF DIRECTORY MODAL */}
      {staffModalDept && (
        <div className="coo-modal-overlay" onClick={() => setStaffModalDept(null)}>
          <div className="coo-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="coo-modal-header">
              <div>
                <span className="coo-modal-title-eyebrow">Department Subordinate Staff</span>
                <h3 className="coo-modal-title">{staffModalDept.name} Staff ({staffList.length})</h3>
              </div>
              <button onClick={() => setStaffModalDept(null)} className="coo-modal-close-btn">✕</button>
            </div>

            <div className="coo-modal-body">
              {loadingStaff ? (
                <div className="coo-empty-placeholder">
                  Loading subordinate workforce...
                </div>
              ) : staffList.length === 0 ? (
                <div className="coo-empty-placeholder">
                  No officers currently assigned to this department.
                </div>
              ) : (
                <div className="staff-roster-list">
                  {staffList.map((st) => (
                    <div key={st.id} className="staff-roster-item">
                      <div>
                        <strong>{st.name}</strong>
                        <div className="coo-cell-subtext">
                          {st.email} · {st.phone || '+91 98000 00000'}
                        </div>
                      </div>
                      <span className={`status-pill ${st.status?.toLowerCase()}`}>
                        {st.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="coo-modal-footer">
              <button onClick={() => setStaffModalDept(null)} className="btn-coo-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
