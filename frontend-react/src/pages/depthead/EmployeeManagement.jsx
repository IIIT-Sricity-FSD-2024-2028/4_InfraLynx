import { useState, useEffect } from 'react';
import { useTIMS } from '../../context/TIMSContext.jsx';
import { deptHeadApi } from '../../services/api.js';

export default function EmployeeManagement() {
  const { currentUser } = useTIMS();
  const departmentName = currentUser?.department || currentUser?.departmentName || 'Civil & Electrical Infrastructure';
  
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const staff = await deptHeadApi.getStaff();
      setEmployees(staff || []);
    } catch (err) {
      setError(err.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpEmail.trim()) return;

    try {
      setProcessing(true);
      await deptHeadApi.createStaff({
        name: newEmpName.trim(),
        email: newEmpEmail.trim(),
        phone: newEmpPhone.trim(),
        password: 'Password@123',
      });
      setShowAddModal(false);
      setNewEmpName('');
      setNewEmpEmail('');
      setNewEmpPhone('');
      await fetchEmployees();
    } catch (err) {
      alert(err.message || 'Failed to create employee');
    } finally {
      setProcessing(false);
    }
  };

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    if (!selectedEmp) return;

    try {
      setProcessing(true);
      await deptHeadApi.updateStaff(selectedEmp.id, {
        name: newEmpName.trim(),
        email: newEmpEmail.trim(),
        phone: newEmpPhone.trim(),
      });
      setShowEditModal(false);
      setSelectedEmp(null);
      await fetchEmployees();
    } catch (err) {
      alert(err.message || 'Failed to update employee');
    } finally {
      setProcessing(false);
    }
  };

  const toggleStatus = async (emp) => {
    try {
      const nextStatus = emp.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await deptHeadApi.updateStaffStatus(emp.id, nextStatus);
      await fetchEmployees();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  const openEditModal = (emp) => {
    setSelectedEmp(emp);
    setNewEmpName(emp.name || '');
    setNewEmpEmail(emp.email || '');
    setNewEmpPhone(emp.phone || '');
    setShowEditModal(true);
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
          <button onClick={fetchEmployees} className="button button-ghost" style={{ marginTop: '12px' }}>Retry</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="dept-page-title" style={{ marginBottom: 0 }}>Employee Management</h2>
          <p style={{ color: 'var(--text-soft)', marginTop: '8px' }}>Manage Desk Clerks for <strong>{departmentName}</strong>.</p>
        </div>
        <button 
          className="button button-primary"
          onClick={() => {
            setNewEmpName('');
            setNewEmpEmail('');
            setNewEmpPhone('');
            setShowAddModal(true);
          }}
        >
          + Add Employee
        </button>
      </div>

      <div className="panel-card" style={{ overflow: 'hidden' }}>
        <table className="dept-list-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Contact</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '40px', height: '40px', borderRadius: '50%', 
                      background: 'var(--primary-light)', color: 'var(--primary-darker)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                    }}>
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '500' }}>{emp.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>ID: {emp.id.split('-')[0]}...</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div>{emp.email}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>{emp.phone || 'N/A'}</div>
                </td>
                <td>
                  {emp.role.replace('_', ' ')}
                </td>
                <td>
                  <span className={`badge-eyebrow ${emp.status === 'ACTIVE' ? '' : 'badge-amber'}`}>
                    {emp.status}
                  </span>
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
                <td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-soft)' }}>
                  No employees found in this department.
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
                  onChange={(e) => setNewEmpName(e.target.value)}
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
                  onChange={(e) => setNewEmpEmail(e.target.value)}
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
                  onChange={(e) => setNewEmpPhone(e.target.value)}
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
                    setShowAddModal(false);
                    setShowEditModal(false);
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
