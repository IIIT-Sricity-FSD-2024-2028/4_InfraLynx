import React, { useState } from 'react';
import { cooApi } from '../../services/api.js';

export default function DepartmentManagement({ departments, departmentHeads, onRefresh }) {
  const [modalMode, setModalMode] = useState(null); // 'ADD' | 'EDIT' | 'ASSIGN_HEAD' | 'VIEW_STAFF'
  const [selectedDept, setSelectedDept] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formBudget, setFormBudget] = useState(1500000);
  const [selectedHeadId, setSelectedHeadId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function openAddModal() {
    setFormName('');
    setFormDescription('');
    setFormCode('');
    setFormBudget(1500000);
    setSelectedHeadId('');
    setModalMode('ADD');
  }

  function openEditModal(dept) {
    setSelectedDept(dept);
    setFormName(dept.name);
    setFormDescription(dept.description || '');
    setFormCode(dept.code || '');
    setFormBudget(dept.budget || 1500000);
    setModalMode('EDIT');
  }

  function openAssignHeadModal(dept) {
    setSelectedDept(dept);
    setSelectedHeadId(dept.departmentHead?.id || '');
    setModalMode('ASSIGN_HEAD');
  }

  async function openStaffModal(dept) {
    setSelectedDept(dept);
    setModalMode('VIEW_STAFF');
    setLoadingStaff(true);
    try {
      const staff = await cooApi.getDepartmentStaff(dept.id);
      setStaffList(staff);
    } catch (err) {
      alert(`Failed to load staff: ${err.message}`);
    } finally {
      setLoadingStaff(false);
    }
  }

  async function handleToggleStatus(dept) {
    const nextStatus = dept.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!confirm(`Are you sure you want to mark '${dept.name}' as ${nextStatus}?`)) return;

    try {
      await cooApi.updateDepartmentStatus(dept.id, nextStatus);
      onRefresh();
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  }

  async function handleSubmitDepartment(e) {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      setSubmitting(true);
      if (modalMode === 'ADD') {
        await cooApi.createDepartment({
          name: formName.trim(),
          description: formDescription.trim(),
          code: formCode.trim() || undefined,
          budget: Number(formBudget),
          departmentHeadId: selectedHeadId || undefined,
        });
        alert(`Department '${formName}' created successfully!`);
      } else if (modalMode === 'EDIT') {
        await cooApi.updateDepartment(selectedDept.id, {
          name: formName.trim(),
          description: formDescription.trim(),
          code: formCode.trim(),
          budget: Number(formBudget),
        });
        alert(`Department '${formName}' updated successfully!`);
      }
      setModalMode(null);
      onRefresh();
    } catch (err) {
      alert(`Operation failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssignHeadSubmit(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      await cooApi.assignDepartmentHead(selectedDept.id, selectedHeadId || null);
      alert(`Department Head assignment saved for '${selectedDept.name}'!`);
      setModalMode(null);
      onRefresh();
    } catch (err) {
      alert(`Assignment failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Top Action Bar */}
      <div className="coo-banner">
        <div>
          <h2 className="coo-banner-title">Municipal Department Governance</h2>
          <p className="coo-banner-sub">
            Establish new civic infrastructure departments, configure budget caps, assign executive heads, and monitor workforce capacity.
          </p>
        </div>
        <button onClick={openAddModal} className="btn-coo-primary">
          ➕ Establish New Department
        </button>
      </div>

      {/* Departments Table Panel */}
      <div className="coo-panel">
        <div className="coo-panel-header">
          <div>
            <h3 className="coo-panel-title">Active Municipal Departments ({departments.length})</h3>
            <p className="coo-panel-subtitle">Comprehensive township service verticals and workforce strength</p>
          </div>
        </div>

        <div className="coo-panel-body" style={{ padding: 0 }}>
          <div className="coo-table-wrapper">
            <table className="coo-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Department Name & Scope</th>
                  <th>Department Head</th>
                  <th>Employee Count</th>
                  <th>Active WOs</th>
                  <th>Annual Budget</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '12px', background: 'var(--surface-muted)', padding: '3px 7px', borderRadius: '4px' }}>
                        {dept.code}
                      </span>
                    </td>
                    <td style={{ maxWidth: '300px' }}>
                      <strong>{dept.name}</strong>
                      <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '2px', lineHeight: '1.4' }}>
                        {dept.description}
                      </div>
                    </td>
                    <td>
                      {dept.departmentHead ? (
                        <div>
                          <strong>{dept.departmentHead.name}</strong>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-soft)' }}>
                            {dept.departmentHead.email}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--accent-amber)', fontSize: '12px', fontWeight: 700 }}>
                          ⚠️ Head Vacant
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => openStaffModal(dept)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary-dark)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                        title="Click to view staff directory"
                      >
                        {dept.employeeCount} Officers 👥
                      </button>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: dept.activeWorkOrdersCount > 0 ? 'var(--accent-blue)' : 'var(--text-soft)' }}>
                        {dept.activeWorkOrdersCount}
                      </span>
                    </td>
                    <td>
                      <strong>₹{((dept.budget || 1500000) / 100000).toFixed(1)} Lakhs</strong>
                    </td>
                    <td>
                      <span className={`status-pill ${dept.status?.toLowerCase()}`}>
                        {dept.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button onClick={() => openEditModal(dept)} className="btn-coo-secondary" title="Edit Department Parameters">
                          ✏️ Edit
                        </button>
                        <button onClick={() => openAssignHeadModal(dept)} className="btn-coo-secondary" title="Assign or Change Department Head">
                          👤 Head
                        </button>
                        <button
                          onClick={() => handleToggleStatus(dept)}
                          className={dept.status === 'ACTIVE' ? 'btn-coo-danger' : 'btn-coo-secondary'}
                        >
                          {dept.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: ADD / EDIT DEPARTMENT */}
      {(modalMode === 'ADD' || modalMode === 'EDIT') && (
        <div className="coo-modal-overlay" onClick={() => setModalMode(null)}>
          <div className="coo-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="coo-modal-header">
              <h3 style={{ margin: 0, fontSize: '16px' }}>
                {modalMode === 'ADD' ? 'Establish New Municipal Department' : `Edit Department: ${selectedDept?.name}`}
              </h3>
              <button onClick={() => setModalMode(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSubmitDepartment}>
              <div className="coo-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                    Department Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Smart Energy & Solar Microgrid"
                    className="coo-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                      Department Code (e.g. SESG)
                    </label>
                    <input
                      type="text"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      placeholder="e.g. ELEC, CIVL, WTR"
                      className="coo-input"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                      Annual Budget Cap (INR)
                    </label>
                    <input
                      type="number"
                      value={formBudget}
                      onChange={(e) => setFormBudget(e.target.value)}
                      className="coo-input"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                    Operational Scope & Description
                  </label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Detailed civic infrastructure responsibilities, asset categories, and emergency coverage..."
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line-strong)', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                {modalMode === 'ADD' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                      Assign Initial Department Head (Optional)
                    </label>
                    <select
                      value={selectedHeadId}
                      onChange={(e) => setSelectedHeadId(e.target.value)}
                      className="coo-select"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value="">-- Leave Unassigned (Assign Later) --</option>
                      {departmentHeads.map((head) => (
                        <option key={head.id} value={head.id}>
                          {head.name} ({head.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="coo-modal-footer">
                <button type="button" onClick={() => setModalMode(null)} className="btn-coo-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-coo-primary">
                  {submitting ? 'Saving...' : modalMode === 'ADD' ? 'Create Department' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN DEPARTMENT HEAD */}
      {modalMode === 'ASSIGN_HEAD' && selectedDept && (
        <div className="coo-modal-overlay" onClick={() => setModalMode(null)}>
          <div className="coo-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="coo-modal-header">
              <h3 style={{ margin: 0, fontSize: '16px' }}>
                Assign Department Head: {selectedDept.name}
              </h3>
              <button onClick={() => setModalMode(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleAssignHeadSubmit}>
              <div className="coo-modal-body">
                <p style={{ fontSize: '13.5px', color: 'var(--text-soft)', marginTop: 0 }}>
                  Select an accredited executive official to head operations, approve contractor estimates, and govern staff for this department.
                </p>

                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                    Select Department Head:
                  </label>
                  <select
                    value={selectedHeadId}
                    onChange={(e) => setSelectedHeadId(e.target.value)}
                    className="coo-select"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px' }}
                  >
                    <option value="">-- No Department Head (Vacant) --</option>
                    {departmentHeads.map((head) => (
                      <option key={head.id} value={head.id}>
                        {head.name} · {head.email} {head.assignedDepartment ? `(Currently: ${head.assignedDepartment.name})` : '(Available)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="coo-modal-footer">
                <button type="button" onClick={() => setModalMode(null)} className="btn-coo-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-coo-primary">
                  {submitting ? 'Saving...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW DEPARTMENT STAFF */}
      {modalMode === 'VIEW_STAFF' && selectedDept && (
        <div className="coo-modal-overlay" onClick={() => setModalMode(null)}>
          <div className="coo-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="coo-modal-header">
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-soft)', textTransform: 'uppercase', fontWeight: 800 }}>Department Roster</span>
                <h3 style={{ margin: 0, fontSize: '16px' }}>{selectedDept.name} Staff ({staffList.length})</h3>
              </div>
              <button onClick={() => setModalMode(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div className="coo-modal-body">
              {loadingStaff ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-soft)' }}>
                  Loading staff directory...
                </div>
              ) : staffList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-soft)' }}>
                  No officers currently assigned to this department.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {staffList.map((st) => (
                    <div
                      key={st.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: 'var(--surface)',
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-subtle)', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                          {st.name[0]}
                        </div>
                        <div>
                          <strong>{st.name}</strong>
                          <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
                            {st.email} · {st.phone || '+91 98000 00000'}
                          </div>
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
              <button onClick={() => setModalMode(null)} className="btn-coo-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
