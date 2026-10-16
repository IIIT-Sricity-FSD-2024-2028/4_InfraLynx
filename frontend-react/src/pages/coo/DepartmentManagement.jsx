import { useState } from 'react';
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

        <div className="coo-panel-body flush">
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
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept.id}>
                    <td>
                      <span className="dept-code-pill">
                        {dept.code}
                      </span>
                    </td>
                    <td className="dept-scope-cell">
                      <strong>{dept.name}</strong>
                      <div className="dept-scope-desc">
                        {dept.description}
                      </div>
                    </td>
                    <td>
                      {dept.departmentHead ? (
                        <div>
                          <strong>{dept.departmentHead.name}</strong>
                          <div className="coo-cell-subtext">
                            {dept.departmentHead.email}
                          </div>
                        </div>
                      ) : (
                        <span className="dept-head-vacant">
                          ⚠️ Head Vacant
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => openStaffModal(dept)}
                        className="dept-staff-btn"
                        title="Click to view staff directory"
                      >
                        {dept.employeeCount} Officers 👥
                      </button>
                    </td>
                    <td>
                      <span className={`coo-cell-stat ${dept.activeWorkOrdersCount > 0 ? 'blue' : 'soft'}`}>
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
                    <td className="align-right">
                      <div className="coo-banner-actions">
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
              <h3 className="coo-modal-title">
                Edit Department: {selectedDept.name}
              </h3>
              <button onClick={() => setModalMode(null)} className="coo-modal-close-btn">✕</button>
            </div>

            <form onSubmit={handleSubmitDepartment}>
              <div className="coo-modal-body">
                <div className="coo-form-group">
                  <label className="coo-form-label">
                    Department Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Civil Infrastructure & Roads"
                    className="coo-input coo-input-full"
                  />
                </div>

                <div className="coo-form-grid-2col coo-form-group">
                  <div>
                    <label className="coo-form-label">
                      Department Code (e.g. CIVL)
                    </label>
                    <input
                      type="text"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      placeholder="e.g. ELEC, CIVL, WTR"
                      className="coo-input coo-input-full"
                    />
                  </div>
                  <div>
                    <label className="coo-form-label">
                      Annual Budget Cap (INR)
                    </label>
                    <input
                      type="number"
                      value={formBudget}
                      onChange={(e) => setFormBudget(e.target.value)}
                      className="coo-input coo-input-full"
                    />
                  </div>
                </div>

                <div className="coo-form-group">
                  <label className="coo-form-label">
                    Operational Scope & Description
                  </label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Detailed civic infrastructure responsibilities, asset categories, and emergency coverage..."
                    className="coo-textarea"
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
                <span className="coo-modal-title-eyebrow">Department Roster</span>
                <h3 className="coo-modal-title">{selectedDept.name} Staff ({staffList.length})</h3>
              </div>
              <button onClick={() => setModalMode(null)} className="coo-modal-close-btn">✕</button>
            </div>

            <div className="coo-modal-body">
              {loadingStaff ? (
                <div className="coo-empty-placeholder">
                  Loading staff directory...
                </div>
              ) : staffList.length === 0 ? (
                <div className="coo-empty-placeholder">
                  No officers currently assigned to this department.
                </div>
              ) : (
                <div className="staff-roster-list">
                  {staffList.map((st) => (
                    <div key={st.id} className="staff-roster-item">
                      <div className="staff-roster-info">
                        <div className="staff-roster-avatar">
                          {st.name[0]}
                        </div>
                        <div>
                          <strong>{st.name}</strong>
                          <div className="coo-cell-subtext">
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
