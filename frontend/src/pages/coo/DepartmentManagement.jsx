import { useDispatch, useSelector } from 'react-redux';
import {
  updateCooDepartment,
  fetchCooDeptStaff,
  setCooDeptModalMode,
  setCooSelectedDept,
  setCooLoadingStaff,
  setDeptFormField,
  resetDeptForm,
  selectCooDeptStaff,
  selectCooActionStatus,
  selectCooDeptModalMode,
  selectCooSelectedDept,
  selectCooLoadingStaff,
  selectCooDeptForm,
} from '../../store/coo/cooSlice.js';

export default function DepartmentManagement({ departments }) {
  const dispatch = useDispatch();
  const staffList    = useSelector(selectCooDeptStaff);
  const actionStatus = useSelector(selectCooActionStatus);
  const modalMode    = useSelector(selectCooDeptModalMode);
  const selectedDept = useSelector(selectCooSelectedDept);
  const loadingStaff = useSelector(selectCooLoadingStaff);
  const form         = useSelector(selectCooDeptForm);

  const submitting = actionStatus === 'loading';

  function openEditModal(dept) {
    dispatch(setCooSelectedDept(dept));
    dispatch(resetDeptForm(dept));
    dispatch(setCooDeptModalMode('EDIT'));
  }

  async function openStaffModal(dept) {
    dispatch(setCooSelectedDept(dept));
    dispatch(setCooDeptModalMode('VIEW_STAFF'));
    dispatch(setCooLoadingStaff(true));
    await dispatch(fetchCooDeptStaff(dept.id));
    dispatch(setCooLoadingStaff(false));
  }

  async function handleSubmitDepartment(e) {
    e.preventDefault();
    if (!form.name.trim() || !selectedDept) return;

    const result = await dispatch(updateCooDepartment({
      id: selectedDept.id,
      payload: {
        name: form.name.trim(),
        description: form.description.trim(),
        code: form.code.trim(),
        budget: Number(form.budget),
      },
    }));
    if (!result.error) {
      alert(`Department '${form.name}' updated successfully!`);
      dispatch(setCooDeptModalMode(null));
    } else {
      alert(`Operation failed: ${result.payload}`);
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
                  <th>Department Name &amp; Scope</th>
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
                    <td><span className="dept-code-pill">{dept.code}</span></td>
                    <td className="dept-scope-cell">
                      <strong>{dept.name}</strong>
                      <div className="dept-scope-desc">{dept.description}</div>
                    </td>
                    <td>
                      {dept.departmentHead ? (
                        <div>
                          <strong>{dept.departmentHead.name}</strong>
                          <div className="coo-cell-subtext">{dept.departmentHead.email}</div>
                        </div>
                      ) : (
                        <span className="dept-head-vacant">⚠️ Head Vacant</span>
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
        <div className="coo-modal-overlay" onClick={() => dispatch(setCooDeptModalMode(null))}>
          <div className="coo-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="coo-modal-header">
              <h3 className="coo-modal-title">Edit Department: {selectedDept.name}</h3>
              <button onClick={() => dispatch(setCooDeptModalMode(null))} className="coo-modal-close-btn">✕</button>
            </div>

            <form onSubmit={handleSubmitDepartment}>
              <div className="coo-modal-body">
                <div className="coo-form-group">
                  <label className="coo-form-label">Department Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => dispatch(setDeptFormField({ key: 'name', value: e.target.value }))}
                    placeholder="e.g. Civil Infrastructure & Roads"
                    className="coo-input coo-input-full"
                  />
                </div>

                <div className="coo-form-grid-2col coo-form-group">
                  <div>
                    <label className="coo-form-label">Department Code (e.g. CIVL)</label>
                    <input
                      type="text"
                      value={form.code}
                      onChange={(e) => dispatch(setDeptFormField({ key: 'code', value: e.target.value }))}
                      placeholder="e.g. ELEC, CIVL, WTR"
                      className="coo-input coo-input-full"
                    />
                  </div>
                  <div>
                    <label className="coo-form-label">Annual Budget Cap (INR)</label>
                    <input
                      type="number"
                      value={form.budget}
                      onChange={(e) => dispatch(setDeptFormField({ key: 'budget', value: e.target.value }))}
                      className="coo-input coo-input-full"
                    />
                  </div>
                </div>

                <div className="coo-form-group">
                  <label className="coo-form-label">Operational Scope &amp; Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => dispatch(setDeptFormField({ key: 'description', value: e.target.value }))}
                    placeholder="Detailed civic infrastructure responsibilities, asset categories, and emergency coverage..."
                    className="coo-textarea"
                  />
                </div>
              </div>

              <div className="coo-modal-footer">
                <button type="button" onClick={() => dispatch(setCooDeptModalMode(null))} className="btn-coo-secondary">
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
        <div className="coo-modal-overlay" onClick={() => dispatch(setCooDeptModalMode(null))}>
          <div className="coo-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="coo-modal-header">
              <div>
                <span className="coo-modal-title-eyebrow">Department Roster</span>
                <h3 className="coo-modal-title">{selectedDept.name} Staff ({staffList.length})</h3>
              </div>
              <button onClick={() => dispatch(setCooDeptModalMode(null))} className="coo-modal-close-btn">✕</button>
            </div>

            <div className="coo-modal-body">
              {loadingStaff ? (
                <div className="coo-empty-placeholder">Loading staff directory...</div>
              ) : staffList.length === 0 ? (
                <div className="coo-empty-placeholder">No officers currently assigned to this department.</div>
              ) : (
                <div className="staff-roster-list">
                  {staffList.map((st) => (
                    <div key={st.id} className="staff-roster-item">
                      <div className="staff-roster-info">
                        <div className="staff-roster-avatar">{st.name[0]}</div>
                        <div>
                          <strong>{st.name}</strong>
                          <div className="coo-cell-subtext">
                            {st.email} · {st.phone || '+91 98000 00000'}
                          </div>
                        </div>
                      </div>
                      <span className={`status-pill ${st.status?.toLowerCase()}`}>{st.role}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="coo-modal-footer">
              <button onClick={() => dispatch(setCooDeptModalMode(null))} className="btn-coo-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
