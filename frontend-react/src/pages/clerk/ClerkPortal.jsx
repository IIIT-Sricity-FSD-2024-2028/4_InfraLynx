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
 * Redux Integration:
 * - fetchComplaints thunk is dispatched here on mount and on every screen change.
 * - All complaints data is read from Redux store via useSelector (never fetched directly).
 * - Child components receive only callbacks and selectedComplaint — complaint list comes from Redux.
 * - patchComplaint action is dispatched to update a single complaint in Redux after triage/WO actions.
 */
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useDispatch, useSelector }                  from 'react-redux'
import { useTIMS }                                   from '../../context/TIMSContext.jsx'
import {
  fetchComplaints,
  patchComplaint,
  selectAllClerkComplaints,
  selectClerkComplaintsStatus,
} from '../../store/clerk/complaintsSlice.js'
import {
  fetchWorkOrders,
} from '../../store/clerk/workOrdersSlice.js'
import {
  selectAuthUser,
  logoutUser,
} from '../../store/auth/authSlice.js'
import ClerkDashboard    from './ClerkDashboard.jsx'
import TriageValidation  from './TriageValidation.jsx'
import WorkOrderCreate   from './WorkOrderCreate.jsx'
import ClerkTracker      from './ClerkTracker.jsx'
import './styles/ClerkPortal.css'

/**
 * Helper to determine if a complaint belongs to the clerk's department.
 * Exported so other Clerk screens import this single source of truth.
 */
export function isComplaintInClerkDepartment(complaint, user) {
  if (!user || user.role !== 'DESK_CLERK') return true
  const deptId   = user.department_id
  const deptName = (user.department_name || '').toLowerCase()
  if (!deptId && !deptName) return true

  const cDeptId = complaint.department_id
  if (deptId && cDeptId && String(cDeptId) === String(deptId)) return true

  const cCat = (complaint.category || complaint.department_name || '').toLowerCase()
  if (deptName && cCat) {
    if (deptName.includes(cCat) || cCat.includes(deptName)) return true
    if (deptName.includes('electr')    && cCat.includes('electr'))  return true
    if (deptName.includes('water')     && (cCat.includes('water') || cCat.includes('sanitat') || cCat.includes('plumb') || cCat.includes('drain'))) return true
    if (deptName.includes('civil')     && (cCat.includes('civil') || cCat.includes('road')))  return true
    if (deptName.includes('horticult') && (cCat.includes('horticult') || cCat.includes('garden'))) return true
  }

  return Boolean(deptId && cDeptId && String(cDeptId) === String(deptId))
}

export default function ClerkPortal({
  onExitToLanding, // Callback to return user to public landing page on sign out
}) {
  // ── 1. Redux Dispatch & Selectors ──────────────────────────────────────────
  const dispatch = useDispatch()

  // All complaints data comes from Redux store (not local state or direct fetch)
  const allComplaints     = useSelector(selectAllClerkComplaints)
  const complaintsStatus  = useSelector(selectClerkComplaintsStatus)

  // ── 2. Redux Authentication State (Rule 9: auth handled through Redux) ─────
  const reduxUser = useSelector(selectAuthUser)
  const { currentUser: contextUser } = useTIMS()
  const currentUser = reduxUser || contextUser

  // ── 3. Local UI State (screen routing, selected complaint, toast) ───────────
  const [currentScreen,     setCurrentScreen]     = useState('dashboard')
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [successNotice,     setSuccessNotice]     = useState(null)

  // ── 4. Data Loading via Redux Thunk ────────────────────────────────────────
  // Dispatch fetchComplaints & fetchWorkOrders on mount and on tab transitions.
  // Repository is called first (DB updated/queried) -> Redux store updated from response.
  useEffect(() => {
    dispatch(fetchComplaints())
    dispatch(fetchWorkOrders())
  }, [dispatch, currentScreen])

  // ── 5. Department Filtering (Memoized Derived State) ───────────────────────
  // Data is READ from Redux store (allComplaints), then filtered for this clerk's dept
  const departmentComplaints = useMemo(() =>
    allComplaints.filter(c => isComplaintInClerkDepartment(c, currentUser)),
    [allComplaints, currentUser]
  )

  const pendingTriageCount = useMemo(() =>
    departmentComplaints.filter(c => c.status === 'REPORTED' || c.status === 'UNDER_REVIEW').length,
    [departmentComplaints]
  )

  const awaitingDeptHeadCount = useMemo(() =>
    departmentComplaints.filter(c => c.status === 'AWAITING_DEPT_HEAD').length,
    [departmentComplaints]
  )

  // ── 6. Navigation & Callback Handlers ──────────────────────────────────────

  const handleNavigate = useCallback((screen) => {
    setCurrentScreen(screen)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  /**
   * Called by TriageValidation when a complaint status changes (validate/reject).
   * Dispatches patchComplaint to update that single item in Redux store,
   * then re-fetches all complaints to stay in sync with the DB.
   */
  const handleComplaintUpdated = useCallback((updated) => {
    if (!updated) return
    const id = updated.id || updated.complaintCode || updated.complaint_code
    // Update Redux store with the new data from DB response
    dispatch(patchComplaint({ id, changes: updated }))
    // Update selectedComplaint to reflect the new state
    setSelectedComplaint(prev =>
      prev && (prev.id === id || prev.complaint_code === id)
        ? { ...prev, ...updated }
        : prev
    )
    // Re-fetch to ensure full sync with DB
    dispatch(fetchComplaints())
  }, [dispatch])

  /**
   * Called by WorkOrderCreate after a work order is successfully dispatched.
   * Patches the complaint status in Redux, shows a success toast, returns to dashboard.
   */
  const handleWorkOrderCreated = useCallback((complaint) => {
    setSelectedComplaint(complaint)
    const woId = complaint.work_order_number || complaint.id
    const contractor = complaint.assigned_contractor?.name || 'contractor'
    setSuccessNotice({
      id: complaint.id,
      message: `Work Order ${woId} assigned & dispatched to ${contractor} for "${complaint.title}" (${complaint.id}).`,
    })
    // Update Redux state with the new complaint status from DB response
    dispatch(patchComplaint({ id: complaint.id, changes: complaint }))
    dispatch(fetchComplaints())
    handleNavigate('dashboard')
  }, [dispatch, handleNavigate])

  /**
   * Rule 9: Sign out handled through Redux logoutUser thunk.
   * Calls authApi.logout() -> clears backend session -> clears Redux store -> returns to landing.
   */
  const handleSignOut = useCallback(async () => {
    await dispatch(logoutUser())
    if (onExitToLanding) {
      onExitToLanding()
    }
  }, [dispatch, onExitToLanding])

  const deptDisplay = currentUser?.department_name || 'Operations'
  const tabs = [
    { id: 'dashboard', label: 'Dashboard',         badge: pendingTriageCount    > 0 ? pendingTriageCount    : null },
    { id: 'triage',    label: 'Triage & Validate' },
    { id: 'workorder', label: 'Create Work Order' },
    { id: 'tracker',   label: 'WO Tracker',        badge: awaitingDeptHeadCount > 0 ? awaitingDeptHeadCount : null },
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
            {/* Show loading indicator while complaints are being fetched */}
            {complaintsStatus === 'loading' && (
              <span style={{ fontSize: 12, color: '#6b7280' }}>Syncing...</span>
            )}
            {onExitToLanding && (
              <button onClick={onExitToLanding} className="clerk-btn-exit" style={{ marginRight: 6 }}>Exit Portal &#8599;</button>
            )}
            <button onClick={handleSignOut} className="clerk-btn-exit" title="Sign out through Redux">Sign Out &#8599;</button>
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
          // complaints prop: filtered slice of Redux store for this clerk's dept
          <ClerkDashboard
            complaints={departmentComplaints}
            onNavigate={handleNavigate}
            onSelectComplaint={setSelectedComplaint}
            successNotice={successNotice}
            onDismissNotice={() => setSuccessNotice(null)}
          />
        )}
        {currentScreen === 'triage' && (
          // onComplaintUpdated: dispatches Redux action when status changes
          <TriageValidation
            complaints={departmentComplaints}
            selectedComplaint={selectedComplaint}
            onNavigate={handleNavigate}
            onSelectComplaint={setSelectedComplaint}
            onComplaintUpdated={handleComplaintUpdated}
          />
        )}
        {currentScreen === 'workorder' && (
          // onWorkOrderCreated: dispatches Redux action after WO dispatch
          <WorkOrderCreate
            selectedComplaint={selectedComplaint}
            onNavigate={handleNavigate}
            onWorkOrderCreated={handleWorkOrderCreated}
          />
        )}
        {currentScreen === 'tracker' && (
          // complaints: read from Redux store (passed as prop for dept filtering)
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
