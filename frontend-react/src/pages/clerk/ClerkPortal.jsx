/**
 * ClerkPortal - Master Portal Container for Desk Clerk Operations
 *
 * Architecture & Tabbed Routing:
 * - Serves as the central shell/layout for Desk Clerk operations across all 4 operational tabs:
 *   1. Dashboard: Queue overview, metrics, search, and category filtering.
 *   2. Triage & Validate: Review reported tickets, mark validated or rejected.
 *   3. Create Work Order: Assign empanelled AMC contractor, set priority, dispatch WO.
 *   4. WO Tracker: Full lifecycle tracker from reported to closed.
 *
 * Key React Concepts:
 * - Component Composition & Conditional Rendering: Switches child views based on currentScreen.
 * - State Hoisting & Shared State: Manages complaints data, selected complaint, and success notices across sibling views.
 * - Side Effects: useEffect fetches fresh complaints on initial load and screen transitions.
 * - Props Passing & Callback Invocation: Child views notify parent of updates via callback props.
 */
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import { complaintApi } from '../../services/api.js'
import ClerkDashboard from './ClerkDashboard.jsx'
import TriageValidation from './TriageValidation.jsx'
import WorkOrderCreate from './WorkOrderCreate.jsx'
import ClerkTracker from './ClerkTracker.jsx'
import './styles/ClerkPortal.css'

/**
 * Helper to determine if a complaint belongs to the clerk's department.
 * Exported so other Clerk screens import this single source of truth.
 */
export function isComplaintInClerkDepartment(complaint, user) {
  if (!user || user.role !== 'DESK_CLERK') return true
  const deptId = user.department_id
  const deptName = (user.department_name || '').toLowerCase()
  if (!deptId && !deptName) return true

  const cDeptId = complaint.department_id
  if (deptId && cDeptId && String(cDeptId) === String(deptId)) return true

  const cCat = (complaint.category || complaint.department_name || '').toLowerCase()
  if (deptName && cCat) {
    if (deptName.includes(cCat) || cCat.includes(deptName)) return true
    if (deptName.includes('electr') && cCat.includes('electr')) return true
    if (deptName.includes('water') && (cCat.includes('water') || cCat.includes('sanitat') || cCat.includes('plumb') || cCat.includes('drain'))) return true
    if (deptName.includes('civil') && (cCat.includes('civil') || cCat.includes('road'))) return true
    if (deptName.includes('horticult') && (cCat.includes('horticult') || cCat.includes('garden'))) return true
  }

  return Boolean(deptId && cDeptId && String(cDeptId) === String(deptId))
}

export default function ClerkPortal({ 
  onExitToLanding, // Callback to return user to public landing page on sign out
}) {
  // --- 1. Global Session State & Portal Navigation ---
  const { currentUser } = useTIMS()                                 // Logged-in Clerk profile (role, department, id, name)
  const [complaints, setComplaints]               = useState([])    // Master complaints array loaded from PostgreSQL backend API
  const [currentScreen, setCurrentScreen]         = useState('dashboard') // Tab router state: 'dashboard' | 'triage' | 'workorder' | 'tracker'
  const [selectedComplaint, setSelectedComplaint] = useState(null)  // Currently active complaint selected for triage or work order creation
  const [successNotice, setSuccessNotice]         = useState(null)  // Temporary green notification toast object { id, message }

    // --- 2. Data Fetching & Sync (Side Effects) ---
  // Fetches latest complaints from backend API
  const loadComplaints = useCallback(async () => {
    try {
      const data = await complaintApi.getComplaints()
      if (Array.isArray(data)) setComplaints(data)
    } catch (err) {
      console.warn('[ClerkPortal] Error loading complaints:', err.message)
    }
  }, [])

  useEffect(() => { loadComplaints() }, [loadComplaints, currentScreen])

    // --- 3. Filtered State & Badge Counts (Memoized) ---
  // Restricts visible complaints strictly to the clerk assigned civic department
  const departmentComplaints = useMemo(() => (
    complaints.filter(c => isComplaintInClerkDepartment(c, currentUser))
  ), [complaints, currentUser])

  const pendingTriageCount = useMemo(() => (
    departmentComplaints.filter(c => c.status === 'REPORTED' || c.status === 'UNDER_REVIEW').length
  ), [departmentComplaints])

  const awaitingDeptHeadCount = useMemo(() => (
    departmentComplaints.filter(c => c.status === 'AWAITING_DEPT_HEAD').length
  ), [departmentComplaints])

    // --- 4. Navigation & Action Handlers ---
  // Smooth screen transitions
  const handleNavigate = useCallback((screen) => {
    setCurrentScreen(screen)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleComplaintUpdated = useCallback((updated) => {
    if (!updated) return
    const targetId = updated.id || updated.complaintCode || updated.complaint_code
    const match = (c) => c.id === targetId || c.complaint_code === targetId || c.complaintCode === targetId
    setComplaints(prev => prev.map(c => match(c) ? { ...c, ...updated } : c))
    setSelectedComplaint(prev => prev && match(prev) ? { ...prev, ...updated } : prev)
    loadComplaints()
  }, [loadComplaints])

  const handleWorkOrderCreated = useCallback((complaint) => {
    setSelectedComplaint(complaint)
    const woId = complaint.work_order_number || complaint.id
    const contractor = complaint.assigned_contractor?.name || 'contractor'
    setSuccessNotice({
      id: complaint.id,
      message: `Work Order ${woId} assigned & dispatched to ${contractor} for "${complaint.title}" (${complaint.id}).`,
    })
    loadComplaints()
    handleNavigate('dashboard')
  }, [loadComplaints, handleNavigate])

  const deptDisplay = currentUser?.department_name || 'Operations'
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', badge: pendingTriageCount > 0 ? pendingTriageCount : null },
    { id: 'triage', label: 'Triage & Validate' },
    { id: 'workorder', label: 'Create Work Order' },
    { id: 'tracker', label: 'WO Tracker', badge: awaitingDeptHeadCount > 0 ? awaitingDeptHeadCount : null },
  ]

  return (
    <div className="clerk-shell">
      <header className="clerk-header">
        <div className="clerk-header-top">
          <div className="clerk-brand-group">
            <div className="clerk-brand-link" onClick={() => handleNavigate('dashboard')}>
              <img src="/assets/CRIMS_logo.png" alt="TIMS" className="clerk-brand-logo" />
              <div>
                <span className="clerk-brand-title">TIMS</span>
                <span className="clerk-brand-sub">Township Infrastructure Management</span>
              </div>
            </div>
            <div className="clerk-role-badge">
              <span className="clerk-role-dot" />
              Desk Clerk &bull; {deptDisplay}
            </div>
          </div>

          <div className="clerk-user-actions">
            <div className="clerk-user-badge">
              <div className="clerk-user-name">{currentUser?.name}</div>
              <div className="clerk-user-role">{deptDisplay} Desk</div>
            </div>
            {onExitToLanding && (
              <button onClick={onExitToLanding} className="clerk-btn-exit">Exit Portal &#8599;</button>
            )}
          </div>
        </div>

        <div className="clerk-tabs-wrapper">
          <div className="clerk-tabs-container">
            {tabs.map(({ id, label, badge }) => (
              <button
                key={id}
                onClick={() => handleNavigate(id)}
                className={`clerk-tab-btn${currentScreen === id ? ' active' : ''}`}
              >
                {label}
                {badge && <span className="clerk-tab-badge">{badge}</span>}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="clerk-main-container">
        {currentScreen === 'dashboard' && (
          <ClerkDashboard
            complaints={departmentComplaints}
            onNavigate={handleNavigate}
            onSelectComplaint={setSelectedComplaint}
            successNotice={successNotice}
            onDismissNotice={() => setSuccessNotice(null)}
          />
        )}
        {currentScreen === 'triage' && (
          <TriageValidation
            complaints={departmentComplaints}
            selectedComplaint={selectedComplaint}
            onNavigate={handleNavigate}
            onSelectComplaint={setSelectedComplaint}
            onComplaintUpdated={handleComplaintUpdated}
          />
        )}
        {currentScreen === 'workorder' && (
          <WorkOrderCreate
            selectedComplaint={selectedComplaint}
            onNavigate={handleNavigate}
            onWorkOrderCreated={handleWorkOrderCreated}
          />
        )}
        {currentScreen === 'tracker' && (
          <ClerkTracker
            complaints={departmentComplaints}
            selectedComplaint={selectedComplaint}
            onNavigate={handleNavigate}
            onSelectComplaint={setSelectedComplaint}
          />
        )}
      </main>
    </div>
  )
}
