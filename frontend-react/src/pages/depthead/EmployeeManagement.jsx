import { useState, useEffect } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import { deptHeadApi } from '../../services/api.js'

export default function EmployeeManagement() {
  const { currentUser, backendStatus } = useTIMS()
  const departmentName = currentUser.department || currentUser.departmentName || 'Civil & Electrical Infrastructure'
  
  const [employees, setEmployees] = useState([
    { id: '10000000-0000-0000-0000-000000000002', name: 'Pooja Verma', email: 'clerk@infralynx.com', role: 'Desk Clerk', status: 'Active' },
    { id: '10000000-0000-0000-0000-000000000007', name: 'Anjali Gupta', email: 'anjali.gupta@infralynx.com', role: 'Desk Clerk', status: 'Active' },
    { id: '10000000-0000-0000-0000-000000000008', name: 'Suresh Yadav', email: 'suresh.yadav@infralynx.com', role: 'Desk Clerk', status: 'Suspended' }
  ])

  const [showAddModal, setShowAddModal] = useState(false)
  const [newEmpName, setNewEmpName] = useState('')
  const [newEmpEmail, setNewEmpEmail] = useState('')

  useEffect(() => {
    if (backendStatus?.connected) {
      deptHeadApi
        .getStaff()
        .then((staff) => {
          if (Array.isArray(staff) && staff.length > 0) {
            setEmployees(
              staff.map((s) => ({
                id: s.id,
                name: s.name,
                email: s.email,
                role: 'Desk Clerk',
                status: s.status === 'ACTIVE' ? 'Active' : 'Suspended',
              }))
            )
          }
        })
        .catch(() => {})
    }
  }, [backendStatus?.connected])

  async function handleAddEmployee(e) {
    e.preventDefault()
    if (!newEmpName.trim()) return

    const emailToUse = newEmpEmail.trim() || `${newEmpName.toLowerCase().replace(/\s+/g, '.')}@infralynx.com`

    try {
      if (backendStatus?.connected) {
        const created = await deptHeadApi.createStaff({
          name: newEmpName.trim(),
          email: emailToUse,
          password: 'Password@123',
        })
        if (created?.data) {
          setEmployees((prev) => [
            {
              id: created.data.id || `EMP-${Math.floor(100 + Math.random() * 900)}`,
              name: created.data.name,
              email: created.data.email,
              role: 'Desk Clerk',
              status: 'Active',
            },
            ...prev,
          ])
        }
      } else {
        const newEmp = {
          id: `EMP-${Math.floor(100 + Math.random() * 900)}`,
          name: newEmpName,
          email: emailToUse,
          role: 'Desk Clerk',
          status: 'Active',
        }
        setEmployees([newEmp, ...employees])
      }
    } catch (err) {
      console.warn('Could not save staff to live API, saved locally:', err.message)
      const newEmp = {
        id: `EMP-${Math.floor(100 + Math.random() * 900)}`,
        name: newEmpName,
        email: emailToUse,
        role: 'Desk Clerk',
        status: 'Active',
      }
      setEmployees([newEmp, ...employees])
    }

    setNewEmpName('')
    setNewEmpEmail('')
    setShowAddModal(false)
  }

  function toggleStatus(id) {
    setEmployees((emps) =>
      emps.map((emp) => {
        if (emp.id !== id) return emp
        const nextStatus = emp.status === 'Active' ? 'Suspended' : 'Active'
        if (backendStatus?.connected) {
          deptHeadApi.updateStaffStatus(id, nextStatus.toUpperCase()).catch(() => {})
        }
        return { ...emp, status: nextStatus }
      })
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="dept-page-title" style={{ marginBottom: 0 }}>Employee Management ({departmentName})</h2>
        <button className="button button-primary" onClick={() => setShowAddModal(true)}>
          + Add Employee
        </button>
      </div>

      <div className="panel-card" style={{ overflow: 'hidden' }}>
        <table className="dept-list-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id}>
                <td><strong>{emp.id}</strong></td>
                <td>{emp.name}</td>
                <td>{emp.role}</td>
                <td>
                  <span className={`badge-eyebrow ${emp.status === 'Suspended' ? 'badge-amber' : ''}`}>
                    {emp.status}
                  </span>
                </td>
                <td>
                  <button 
                    className="button button-secondary" 
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => toggleStatus(emp.id)}
                  >
                    {emp.status === 'Active' ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No employees found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="panel-card modal-content" style={{ width: '400px', padding: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Add Department Employee</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-soft)', marginBottom: '20px' }}>
              New employee will automatically be assigned the <strong>Desk Clerk</strong> role in the <strong>{departmentName}</strong> department.
            </p>
            <form onSubmit={handleAddEmployee}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Full Name</label>
                <input 
                  type="text" 
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-strong)' }}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
              
              <div style={{ padding: '12px', background: 'var(--surface-muted)', borderRadius: '8px', marginBottom: '24px', fontSize: '13px' }}>
                <div><strong>Role:</strong> Desk Clerk</div>
                <div><strong>Department:</strong> {departmentName}</div>
                <div style={{ marginTop: '8px', color: 'var(--primary-darker)' }}>Credentials will be generated automatically.</div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="button button-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="button button-primary">Generate Credentials & Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
