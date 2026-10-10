import { useState } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import DeptDashboard from './DeptDashboard.jsx'
import EmployeeManagement from './EmployeeManagement.jsx'
import ApprovalQueue from './ApprovalQueue.jsx'
import WorkOrderDetails from './WorkOrderDetails.jsx'
import WorkOrders from './WorkOrders.jsx'
import './styles/DeptHeadPortal.css'

/**
 * DeptHeadPortal - Shell / layout component for the Department Head module.
 * Mirrors ClerkPortal.jsx but with a purple/indigo theme and Department Head features.
 */
export default function DeptHeadPortal({ onExitToLanding }) {
  const { complaints, currentUser } = useTIMS()

  const [currentScreen, setCurrentScreen] = useState('dashboard')
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  
  // Pending approvals (status AWAITING_DEPT_HEAD)
  const pendingApprovalsCount = complaints.filter(c => c.status === 'AWAITING_DEPT_HEAD').length

  function handleNavigate(screen) {
    setCurrentScreen(screen)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSelectComplaint(complaint) {
    setSelectedComplaint(complaint)
    handleNavigate('workorder')
  }

  return (
    <div className="depthead-shell">
      <header className="depthead-header">
        <div className="depthead-header-top">
          <div className="depthead-brand-group">
            <div className="depthead-brand-link" onClick={() => handleNavigate('dashboard')}>
              <img src="/assets/CRIMS_logo.png" alt="TIMS" className="depthead-brand-logo" />
              <div>
                <span className="depthead-brand-title">TIMS</span>
                <span className="depthead-brand-sub">Township Infrastructure Management</span>
              </div>
            </div>
            <div className="depthead-role-badge">
              <span className="depthead-role-dot" />
              Dept Head
            </div>
          </div>

          <div className="depthead-user-actions">
            <div className="depthead-user-badge">
              <div className="depthead-user-name">{currentUser.name || 'Dept Head'}</div>
              <div className="depthead-user-role">{currentUser.title || 'Director'} &bull; {currentUser.department || 'Civil'}</div>
            </div>

            {onExitToLanding && (
              <button onClick={onExitToLanding} className="depthead-btn-exit">
                Exit Portal &#8599;
              </button>
            )}
          </div>
        </div>

        <div className="depthead-tabs-wrapper">
          <div className="depthead-tabs-container">
            {[
              { id: 'dashboard', label: 'Dashboard', badge: null },
              { id: 'employees', label: 'Employees', badge: null },
              { id: 'approvals', label: 'Approvals', badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null },
              { id: 'work-orders', label: 'Work Orders', badge: null },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id !== 'workorder') handleNavigate(tab.id)
                }}
                className={`depthead-tab-btn${(currentScreen === tab.id || (tab.id === 'approvals' && currentScreen === 'workorder')) ? ' active' : ''}`}
              >
                {tab.label}
                {tab.badge && <span className="depthead-tab-badge">{tab.badge}</span>}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="depthead-main-container">
        {currentScreen === 'dashboard' && (
          <DeptDashboard onNavigate={handleNavigate} onSelectComplaint={handleSelectComplaint} />
        )}
        {currentScreen === 'employees' && (
          <EmployeeManagement />
        )}
        {currentScreen === 'approvals' && (
          <ApprovalQueue onSelectComplaint={handleSelectComplaint} />
        )}
        {currentScreen === 'workorder' && (
          <WorkOrderDetails 
            complaint={selectedComplaint} 
            onBack={() => handleNavigate('approvals')}
          />
        )}
        {currentScreen === 'work-orders' && (
          <WorkOrders onSelectComplaint={handleSelectComplaint} />
        )}
      </main>

    </div>
  )
}
