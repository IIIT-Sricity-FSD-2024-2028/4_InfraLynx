import { useState } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import ClerkDashboard from './ClerkDashboard.jsx'
import TriageValidation from './TriageValidation.jsx'
import WorkOrderCreate from './WorkOrderCreate.jsx'
import ClerkTracker from './ClerkTracker.jsx'
import './styles/ClerkPortal.css'

/**
 * ClerkPortal - Shell / layout component for the Desk Clerk module.
 * Mirrors RwaPortal.jsx: sticky header + amber role badge + tab nav + main content + footer.
 *
 * Props:
 *   onExitToLanding   - () => void   go back to the landing page
 *
 * State:
 *   currentScreen     - 'dashboard' | 'triage' | 'workorder' | 'tracker'
 *   selectedComplaint - the complaint object currently being worked on
 *   successNotice     - { id, message } toast shown after WO dispatch
 *
 * Child callbacks (passed as props to child screens):
 *   onNavigate(screen)            - switch active screen + scroll to top
 *   onSelectComplaint(complaint)  - store selected complaint in portal state
 *   onWorkOrderCreated(complaint) - called by WorkOrderCreate after dispatch
 *   onDismissNotice()             - called by ClerkDashboard to clear toast
 */
export default function ClerkPortal({ onExitToLanding }) {
  const { complaints, currentUser, resetDemoData } = useTIMS()

  const [currentScreen, setCurrentScreen]         = useState('dashboard')
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [successNotice, setSuccessNotice]         = useState(null)

  // Badge counts for tabs
  const pendingTriageCount    = complaints.filter(c => c.status === 'REPORTED' || c.status === 'UNDER_REVIEW').length
  const awaitingDeptHeadCount = complaints.filter(c => c.status === 'AWAITING_DEPT_HEAD').length

  function handleNavigate(screen) {
    setCurrentScreen(screen)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSelectComplaint(complaint) {
    setSelectedComplaint(complaint)
  }

  // Called by WorkOrderCreate once WO is dispatched or forwarded to Dept Head
  function handleWorkOrderCreated(complaint) {
    setSelectedComplaint(complaint)
    const woId       = complaint.workOrderId || ''
    const contractor = complaint.assignedContractor ? complaint.assignedContractor.name : 'contractor'
    const isDeptHead = complaint.status === 'AWAITING_DEPT_HEAD'
    setSuccessNotice({
      id: complaint.id,
      message: isDeptHead
        ? `Work order for "${complaint.title}" forwarded to Dept Head (estimate exceeds Rs.10,000 threshold).`
        : `Work Order ${woId} dispatched to ${contractor} for "${complaint.title}" (${complaint.id}).`,
    })
    handleNavigate('dashboard')
  }

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
              Desk Clerk
            </div>
          </div>

          {/* User info + action buttons */}
          <div className="clerk-user-actions">
            <div className="clerk-user-badge">
              <div className="clerk-user-name">{currentUser.name}</div>
              <div className="clerk-user-role">{currentUser.title} &bull; {currentUser.sector}</div>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Reset all complaints to default demo data?')) {
                  resetDemoData()
                  setSuccessNotice(null)
                  handleNavigate('dashboard')
                }
              }}
              className="clerk-btn-reset"
            >
              &#8634; Reset Data
            </button>
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
            onNavigate={handleNavigate}
            onSelectComplaint={handleSelectComplaint}
            successNotice={successNotice}
            onDismissNotice={() => setSuccessNotice(null)}
          />
        )}
        {currentScreen === 'triage' && (
          <TriageValidation
            selectedComplaint={selectedComplaint}
            onNavigate={handleNavigate}
            onSelectComplaint={handleSelectComplaint}
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
            selectedComplaint={selectedComplaint}
            onNavigate={handleNavigate}
            onSelectComplaint={handleSelectComplaint}
          />
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="clerk-footer">
        TIMS &bull; Desk Clerk Module &bull; In-Memory Architecture &bull; Member 2
      </footer>
    </div>
  )
}
