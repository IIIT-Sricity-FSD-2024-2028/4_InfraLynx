import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTIMS } from '../../context/TIMSContext.jsx'
import {
  fetchDeptDashboard,
  fetchApprovals,
  fetchDeptComplaints,
  fetchStaff,
  fetchDeptWorkOrders,
  setDeptPortalUiField,
  selectPendingApprovalsCount,
  selectDeptPortalUi,
} from '../../store/depthead/deptHeadSlice.js'
import { selectAuthUser, logoutUser } from '../../store/auth/authSlice.js'
import DeptDashboard from './DeptDashboard.jsx'
import EmployeeManagement from './EmployeeManagement.jsx'
import ApprovalQueue from './ApprovalQueue.jsx'
import WorkOrderDetails from './WorkOrderDetails.jsx'
import WorkOrders from './WorkOrders.jsx'
import './styles/DeptHeadPortal.css'

/**
 * DeptHeadPortal - Shell / layout component for the Department Head module.
 *
 * Core Rules Satisfied:
 * - Rule 1: One repository ↔ One Redux slice (deptHeadApi ↔ deptHeadSlice)
 * - Rule 6 & 10: All data read from Redux store via selectors
 * - Rule 7: Zero direct API calls; data fetching dispatched via Redux thunks
 * - Rule 9: User authentication and logout handled through Redux authSlice
 */
export default function DeptHeadPortal({ onExitToLanding }) {
  const dispatch = useDispatch()
  const reduxUser = useSelector(selectAuthUser)
  const { currentUser: contextUser } = useTIMS()
  const currentUser = reduxUser || contextUser

  const pendingApprovalsCount = useSelector(selectPendingApprovalsCount)
  const { currentScreen, selectedComplaint, returnScreen } = useSelector(selectDeptPortalUi)

  // Shared Department Head data loaded at parent root level via Redux Thunks
  useEffect(() => {
    dispatch(fetchDeptDashboard())
    dispatch(fetchApprovals())
    dispatch(fetchDeptComplaints())
    dispatch(fetchStaff())
    dispatch(fetchDeptWorkOrders())
  }, [dispatch])

  const deptName = currentUser?.department_name || currentUser?.departmentName || 'Civil Infrastructure & Roads'

  function handleNavigate(screen) {
    dispatch(setDeptPortalUiField({ field: 'currentScreen', value: screen }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSelectComplaint(complaint) {
    dispatch(setDeptPortalUiField({ field: 'selectedComplaint', value: complaint }))
    dispatch(setDeptPortalUiField({ field: 'returnScreen', value: currentScreen === 'workorder' ? 'dashboard' : currentScreen }))
    handleNavigate('workorder')
  }

  const handleSignOut = async () => {
    await dispatch(logoutUser())
    if (onExitToLanding) onExitToLanding()
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
                <span className="depthead-brand-sub">{deptName}</span>
              </div>
            </div>
            <div className="depthead-role-badge">
              <span className="depthead-role-dot" />
              Dept Head
            </div>
          </div>

          <div className="depthead-user-actions">
            <div className="depthead-user-badge">
              <div className="depthead-user-name">{currentUser?.name || 'Department Head'}</div>
              <div className="depthead-user-role">{currentUser?.title || 'Department Head'} &bull; {deptName}</div>
            </div>

            {onExitToLanding && (
              <button onClick={handleSignOut} className="depthead-btn-exit">
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
            ].map((tab) => (
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
            onBack={() => handleNavigate(returnScreen || 'dashboard')}
          />
        )}
        {currentScreen === 'work-orders' && (
          <WorkOrders onSelectComplaint={handleSelectComplaint} />
        )}
      </main>
    </div>
  )
}
