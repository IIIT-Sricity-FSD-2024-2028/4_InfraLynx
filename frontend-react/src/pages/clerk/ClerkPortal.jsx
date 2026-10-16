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
 */
function isComplaintInClerkDepartment(complaint, user) {
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

  if (deptId && cDeptId) return String(cDeptId) === String(deptId)
  return false
}

export default function ClerkPortal({ onExitToLanding }) {
  const { currentUser } = useTIMS()

  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentScreen, setCurrentScreen]         = useState('dashboard')
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [successNotice, setSuccessNotice]         = useState(null)

  // Fetch live complaints directly from PostgreSQL backend
  const loadComplaints = useCallback(async () => {
    try {
      setLoading(true)
      const data = await complaintApi.getComplaints()
      if (Array.isArray(data)) {
        setComplaints(data)
      }
    } catch (err) {
      console.warn('[ClerkPortal] Error loading complaints:', err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadComplaints()
  }, [loadComplaints, currentScreen])

  // Filter complaints strictly by the Clerk's department
  const departmentComplaints = useMemo(() => {
    return complaints.filter(c => isComplaintInClerkDepartment(c, currentUser))
  }, [complaints, currentUser])

  // Badge counts for tabs
  const pendingTriageCount    = departmentComplaints.filter(c => c.status === 'REPORTED' || c.status === 'UNDER_REVIEW').length
  const awaitingDeptHeadCount = departmentComplaints.filter(c => c.status === 'AWAITING_DEPT_HEAD').length

  function handleNavigate(screen) {
    setCurrentScreen(screen)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSelectComplaint(complaint) {
    setSelectedComplaint(complaint)
  }

  const handleComplaintUpdated = useCallback((updatedComplaint) => {
    if (!updatedComplaint) return
    const targetId = updatedComplaint.id || updatedComplaint.complaintCode || updatedComplaint.complaint_code
    setComplaints((prev) =>
      prev.map((c) =>
        (c.id === targetId || c.complaint_code === targetId || c.complaintCode === targetId)
          ? { ...c, ...updatedComplaint }
          : c
      )
    )
    setSelectedComplaint((prev) =>
      (prev && (prev.id === targetId || prev.complaint_code === targetId || prev.complaintCode === targetId))
        ? { ...prev, ...updatedComplaint }
        : prev
    )
    loadComplaints()
  }, [loadComplaints])

  // Called by WorkOrderCreate once WO is dispatched
  function handleWorkOrderCreated(complaint) {
    setSelectedComplaint(complaint)
    const woId       = complaint.work_order_number || complaint.id
    const contractor = complaint.assigned_contractor ? complaint.assigned_contractor.name : 'contractor'
    setSuccessNotice({
      id: complaint.id,
      message: `Work Order ${woId} assigned & dispatched to ${contractor} for "${complaint.title}" (${complaint.id}).`,
    })
    loadComplaints()
    handleNavigate('dashboard')
  }

  const deptDisplay = currentUser?.department_name || 'Operations'

  return (
    <div className="clerk-shell">

      {/* ── Sticky header ── */}
      <header className="clerk-header">
        <div className="clerk-header-top">

          {/* Brand logo + amber role badge */}
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

          {/* User info + action buttons */}
          <div className="clerk-user-actions">
            <div className="clerk-user-badge">
              <div className="clerk-user-name">{currentUser?.name}</div>
              <div className="clerk-user-role">{deptDisplay} Desk</div>
            </div>
            {onExitToLanding && (
              <button onClick={onExitToLanding} className="clerk-btn-exit">
                Exit Portal &#8599;
              </button>
            )}
          </div>
        </div>

        {/* ── Tab navigation bar ── */}
        <div className="clerk-tabs-wrapper">
          <div className="clerk-tabs-container">
            {[
              { id: 'dashboard', label: 'Dashboard',          badge: pendingTriageCount > 0 ? pendingTriageCount : null },
              { id: 'triage',    label: 'Triage & Validate',  badge: null },
              { id: 'workorder', label: 'Create Work Order',  badge: null },
              { id: 'tracker',   label: 'WO Tracker',         badge: awaitingDeptHeadCount > 0 ? awaitingDeptHeadCount : null },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleNavigate(tab.id)}
                className={`clerk-tab-btn${currentScreen === tab.id ? ' active' : ''}`}
              >
                {tab.label}
                {tab.badge && <span className="clerk-tab-badge">{tab.badge}</span>}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Active screen ── */}
      <main className="clerk-main-container">
        {currentScreen === 'dashboard' && (
          <ClerkDashboard
            complaints={departmentComplaints}
            onNavigate={handleNavigate}
            onSelectComplaint={handleSelectComplaint}
            successNotice={successNotice}
            onDismissNotice={() => setSuccessNotice(null)}
          />
        )}
        {currentScreen === 'triage' && (
          <TriageValidation
            complaints={departmentComplaints}
            selectedComplaint={selectedComplaint}
            onNavigate={handleNavigate}
            onSelectComplaint={handleSelectComplaint}
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
            onSelectComplaint={handleSelectComplaint}
          />
        )}
      </main>

    </div>
  )
}
