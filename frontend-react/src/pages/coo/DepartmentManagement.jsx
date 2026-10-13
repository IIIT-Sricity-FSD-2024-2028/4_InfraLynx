import React, { useState } from 'react';
import { cooApi } from '../../services/api.js';

export default function DepartmentManagement({ departments, departmentHeads, onRefresh }) {
  const [modalMode, setModalMode] = useState(null); // 'EDIT' | 'VIEW_STAFF'
  const [selectedDept, setSelectedDept] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formBudget, setFormBudget] = useState(1500000);
  const [submitting, setSubmitting] = useState(false);

  function openEditModal(dept) {
    setSelectedDept(dept);
    setFormName(dept.name);
    setFormDescription(dept.description || '');
    setFormCode(dept.code || '');
    setFormBudget(dept.budget || 1500000);
    setModalMode('EDIT');
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

  async function handleSubmitDepartment(e) {
    e.preventDefault();
    if (!formName.trim() || !selectedDept) return;

    try {
      setSubmitting(true);
      await cooApi.updateDepartment(selectedDept.id, {
        name: formName.trim(),
        description: formDescription.trim(),
        code: formCode.trim(),
        budget: Number(formBudget),
      });
      alert(`Department '${formName}' updated successfully!`);
      setModalMode(null);
      onRefresh();
    } catch (err) {
      alert(`Operation failed: ${err.message}`);
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
            Configure budget caps, department parameters, and monitor workforce capacity across township municipal departments.
          </p>
        </div>
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: EDIT DEPARTMENT */}
      {modalMode === 'EDIT' && selectedDept && (
        <div className="coo-modal-overlay" onClick={() => setModalMode(null)}>
          <div className="coo-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="coo-modal-header">
              <h3 style={{ margin: 0, fontSize: '16px' }}>
                Edit Department: {selectedDept.name}
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
                    placeholder="e.g. Civil Infrastructure & Roads"
                    className="coo-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                      Department Code (e.g. CIVL)
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
              </div>

              <div className="coo-modal-footer">
                <button type="button" onClick={() => setModalMode(null)} className="btn-coo-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-coo-primary">
                  {submitting ? 'Saving...' : 'Save Changes'}
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
