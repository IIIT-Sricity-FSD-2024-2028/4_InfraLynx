import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTIMS } from '../../context/TIMSContext.jsx';
import {
  fetchStaff,
  createStaff,
  updateStaff,
  updateStaffStatus,
  setDeptEmployeesUiField,
  openDeptAddEmpModal,
  openDeptEditEmpModal,
  selectDeptStaff,
  selectDeptStaffStatus,
  selectDeptStaffProcessing,
  selectDeptEmployeesUi,
} from '../../store/depthead/deptHeadSlice.js';

export default function EmployeeManagement() {
  const { currentUser } = useTIMS();
  const departmentName = currentUser?.department || currentUser?.departmentName || 'Civil & Electrical Infrastructure';
  
  const dispatch = useDispatch();
  const employees = useSelector(selectDeptStaff);
  const staffStatus = useSelector(selectDeptStaffStatus);
  const reduxProcessing = useSelector(selectDeptStaffProcessing);
  const {
    localProcessing,
    showAddModal,
    showEditModal,
    selectedEmp,
    newEmpName,
    newEmpEmail,
    newEmpPhone,
  } = useSelector(selectDeptEmployeesUi);

  const setEmpUi = (field, value) => dispatch(setDeptEmployeesUiField({ field, value }));

  const processing = reduxProcessing || localProcessing;
  const loading = staffStatus === 'loading' && employees.length === 0;
  const error = staffStatus === 'failed' ? 'Failed to load employees' : null;

  useEffect(() => {
    if (staffStatus === 'idle') {
      dispatch(fetchStaff());
    }
  }, [dispatch, staffStatus]);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpEmail.trim()) return;

    try {
      setEmpUi('localProcessing', true);
      await dispatch(createStaff({
        name: newEmpName.trim(),
        email: newEmpEmail.trim(),
        phone: newEmpPhone.trim(),
        password: 'Password@123',
      })).unwrap();
      setEmpUi('showAddModal', false);
      setEmpUi('newEmpName', '');
      setEmpUi('newEmpEmail', '');
      setEmpUi('newEmpPhone', '');
    } catch (err) {
      alert(err || 'Failed to create employee');
    } finally {
      setEmpUi('localProcessing', false);
    }
  };

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    if (!selectedEmp) return;

    try {
      setEmpUi('localProcessing', true);
      await dispatch(updateStaff({
        id: selectedEmp.id,
        payload: {
          name: newEmpName.trim(),
          email: newEmpEmail.trim(),
          phone: newEmpPhone.trim(),
        },
      })).unwrap();
      setEmpUi('showEditModal', false);
      setEmpUi('selectedEmp', null);
    } catch (err) {
      alert(err || 'Failed to update employee');
    } finally {
      setEmpUi('localProcessing', false);
    }
  };

  const toggleStatus = async (emp) => {
    try {
      const nextStatus = emp.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await dispatch(updateStaffStatus({ id: emp.id, status: nextStatus })).unwrap();
    } catch (err) {
      alert(err || 'Failed to update status');
    }
  };

  const openEditModal = (emp) => {
    dispatch(openDeptEditEmpModal(emp));
  };

  if (loading && employees.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-soft)' }}>
        <p>Loading employee data...</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '16px', marginBottom: '24px' }}>
          <p style={{ color: '#b91c1c', fontWeight: 'bold' }}>Error</p>
          <p style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>{error}</p>
          <button onClick={() => dispatch(fetchStaff({ force: true }))} className="button button-ghost" style={{ marginTop: '12px' }}>Retry</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="dept-page-title" style={{ marginBottom: 0 }}>Employee Management</h2>
          <p style={{ color: 'var(--text-soft)', marginTop: '8px' }}>Manage Desk Clerks for <strong>{departmentName}</strong>.</p>
        </div>
        <button 
          className="button button-primary"
          onClick={() => dispatch(openDeptAddEmpModal())}
        >
          + Add Employee
        </button>
      </div>

      <div className="panel-card" style={{ overflow: 'hidden' }}>
        <table className="dept-list-table">
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Employee ID</th>
              <th>Designation</th>
              <th>Department</th>
              <th>Account Status</th>
              <th>Contact Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '36px', height: '36px', borderRadius: '50%', 
                      background: 'var(--primary-light)', color: 'var(--primary-darker)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px'
                    }}>
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#0f172a' }}>{emp.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-soft)' }}>@{emp.username || emp.email.split('@')[0]}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', background: '#f1f5f9', padding: '3px 6px', borderRadius: '4px', color: '#334155' }}>
                    {emp.id.split('-')[0]}
                  </span>
                </td>
                <td>
                  <span style={{ fontWeight: '500', color: '#1e293b', fontSize: '13px' }}>
                    {emp.designation || 'Operations Desk Clerk'}
                  </span>
                </td>
                <td>
                  <span style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '12px', fontWeight: '600', padding: '3px 8px', borderRadius: '6px' }}>
                    {emp.departmentName || emp.department || 'Civil Infrastructure & Roads'}
                  </span>
                </td>
                <td>
                  <span className={`badge-eyebrow ${emp.status === 'ACTIVE' ? '' : 'badge-amber'}`} style={{ fontWeight: '700' }}>
                    {emp.status || 'ACTIVE'}
                  </span>
                </td>
                <td>
                  <div style={{ fontSize: '13px', color: '#334155' }}>{emp.email}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-soft)' }}>{emp.phone || 'N/A'}</div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="button button-secondary" 
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => openEditModal(emp)}
                    >
                      Edit
                    </button>
                    <button 
                      className="button button-secondary" 
                      style={{ padding: '6px 12px', fontSize: '12px', color: emp.status === 'ACTIVE' ? '#d97706' : '#10b981', borderColor: emp.status === 'ACTIVE' ? '#d97706' : '#10b981' }}
                      onClick={() => toggleStatus(emp)}
                    >
                      {emp.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan="7" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-soft)' }}>
                  No employees found in {departmentName}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(showAddModal || showEditModal) && (
        <div className="modal-overlay">
          <div className="panel-card modal-content" style={{ width: '450px', padding: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>{showEditModal ? 'Edit Employee' : 'Add Department Employee'}</h3>
            
            <form onSubmit={showEditModal ? handleEditEmployee : handleAddEmployee}>
              {!showEditModal && (
                <div style={{ padding: '12px', background: 'var(--surface-muted)', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
                  <p>New employee will automatically be assigned the <strong>DESK CLERK</strong> role in <strong>{departmentName}</strong>.</p>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Full Name</label>
                <input 
                  type="text" 
                  value={newEmpName}
                  onChange={(e) => setEmpUi('newEmpName', e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-strong)' }}
                  placeholder="e.g. Jane Doe"
                  required
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Email Address</label>
                <input 
                  type="email" 
                  value={newEmpEmail}
                  onChange={(e) => setEmpUi('newEmpEmail', e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-strong)' }}
                  placeholder="e.g. jane.doe@example.com"
                  required
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Phone Number (Optional)</label>
                <input 
                  type="text" 
                  value={newEmpPhone}
                  onChange={(e) => setEmpUi('newEmpPhone', e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-strong)' }}
                  placeholder="e.g. +91 9876543210"
                />
              </div>

              {!showEditModal && (
                <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginBottom: '24px' }}>
                  Default password <code>Password@123</code> will be used.
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button 
                  type="button" 
                  className="button button-ghost"
                  onClick={() => {
                    setEmpUi('showAddModal', false);
                    setEmpUi('showEditModal', false);
                  }}
                  disabled={processing}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="button button-primary"
                  disabled={processing}
                >
                  {showEditModal ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
