import React, { useState } from 'react';
import { cooApi } from '../../services/api.js';

export default function DepartmentHeadManagement({ departmentHeads, departments, onRefresh }) {
  const [selectedHead, setSelectedHead] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetDeptId, setTargetDeptId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [staffModalDept, setStaffModalDept] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

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
      </div>

      {/* Department Heads Directory Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {departmentHeads.map((head) => (
          <div key={head.id} className="coo-panel" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="coo-panel-header" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 800,
                  }}
                >
                  {head.name[0]}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text)' }}>{head.name}</h4>
                  <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
                    Executive Department Head
                  </div>
                </div>
              </div>
              <span className={`status-pill ${head.status?.toLowerCase()}`}>
                {head.status || 'ACTIVE'}
              </span>
            </div>

            <div className="coo-panel-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'var(--surface)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-soft)', display: 'block' }}>
                  Assigned Civic Division
                </span>
                {head.assignedDepartment ? (
                  <strong style={{ fontSize: '14px', color: 'var(--primary-darker)', display: 'block', marginTop: '2px' }}>
                    {head.assignedDepartment.name} ({head.assignedDepartment.code})
                  </strong>
                ) : (
                  <span style={{ color: 'var(--accent-amber)', fontSize: '13px', fontWeight: 700, display: 'block', marginTop: '2px' }}>
                    ⚠️ Standby / Unassigned
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-soft)', display: 'block' }}>Staff Managed</span>
                  <strong style={{ fontSize: '16px' }}>{head.staffCount} Officers</strong>
                </div>
                <div style={{ padding: '10px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-soft)', display: 'block' }}>Active Tickets</span>
                  <strong style={{ fontSize: '16px', color: 'var(--accent-blue)' }}>{head.activeTicketsCount} WOs</strong>
                </div>
              </div>

              <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', lineHeight: '1.4' }}>
                <div>📧 <strong>Email:</strong> {head.email}</div>
                <div>📞 <strong>Phone:</strong> {head.phone}</div>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--line)', display: 'flex', gap: '8px' }}>
                <button onClick={() => openAssignModal(head)} className="btn-coo-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  🔄 Change Department
                </button>
                {head.assignedDepartment && (
                  <button onClick={() => openStaffModalForHead(head)} className="btn-coo-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                    👥 View Staff
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
              <h3 style={{ margin: 0, fontSize: '16px' }}>
                Assign / Transfer Leadership: {selectedHead.name}
              </h3>
              <button onClick={() => setAssignModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleAssignSubmit}>
              <div className="coo-modal-body">
                <p style={{ fontSize: '13.5px', color: 'var(--text-soft)', marginTop: 0 }}>
                  Transfer <strong>{selectedHead.name}</strong> to head a municipal department. This official will gain authority over all desk clerks, estimate approvals, and work orders in that department.
                </p>

                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                    Target Department:
                  </label>
                  <select
                    value={targetDeptId}
                    onChange={(e) => setTargetDeptId(e.target.value)}
                    required
                    className="coo-select"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px' }}
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.departmentHead ? `(Currently: ${d.departmentHead.name})` : '(Vacant)'}
                      </option>
                    ))}
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

      {/* STAFF DIRECTORY MODAL */}
      {staffModalDept && (
        <div className="coo-modal-overlay" onClick={() => setStaffModalDept(null)}>
          <div className="coo-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="coo-modal-header">
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-soft)', textTransform: 'uppercase', fontWeight: 800 }}>Department Subordinate Staff</span>
                <h3 style={{ margin: 0, fontSize: '16px' }}>{staffModalDept.name} Staff ({staffList.length})</h3>
              </div>
              <button onClick={() => setStaffModalDept(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div className="coo-modal-body">
              {loadingStaff ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-soft)' }}>
                  Loading subordinate workforce...
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
                      <div>
                        <strong>{st.name}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
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
