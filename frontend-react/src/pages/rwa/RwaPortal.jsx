import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useTIMS } from '../../context/TIMSContext.jsx'

// Redux slices
import {
  fetchComplaints,
  selectAllComplaints,
  selectPendingVerificationCount,
} from '../../store/rwa/complaintsSlice.js'
import {
  navigateTo,
  selectComplaint,
  setSuccessNotice,
  dismissNotice,
  selectCurrentScreen,
  selectSuccessNotice,
  selectSelectedComplaint,
} from '../../store/rwa/uiSlice.js'

// Child screens
import RwaDashboard from './RwaDashboard.jsx'
import ReportIssue from './ReportIssue.jsx'
import ComplaintTracker from './ComplaintTracker.jsx'
import VerificationDispute from './VerificationDispute.jsx'
import './styles/RwaPortal.css'

export default function RwaPortal({ onExitToLanding }) {
  const { currentUser } = useTIMS()
  const dispatch = useDispatch()

  // ── Redux state ──────────────────────────────────────────────────────────
  const currentScreen = useSelector(selectCurrentScreen)
  const successNotice = useSelector(selectSuccessNotice)
  const selectedComplaint = useSelector(selectSelectedComplaint)
  const pendingVerificationCount = useSelector(selectPendingVerificationCount)

  // ── Fetch complaints on mount ────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchComplaints())
  }, [dispatch])

  // ── Handlers (all dispatch Redux actions) ────────────────────────────────
  function handleNavigate(screen) {
    dispatch(navigateTo(screen))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSelectComplaint(complaint) {
    dispatch(selectComplaint(complaint))
  }

  function handleDismissNotice() {
    dispatch(dismissNotice())
  }

  function handleComplaintSubmitted(newComplaint) {
    dispatch(selectComplaint(newComplaint))
    dispatch(
      setSuccessNotice({
        id: newComplaint.id,
        title: newComplaint.title,
        message: `Issue "${newComplaint.title}" (${newComplaint.id}) successfully reported and logged!`,
      })
    )
    dispatch(navigateTo('dashboard'))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="rwa-shell">
      {/* Top Navigation Bar */}
      <header className="rwa-header">
        <div className="rwa-header-top">
          {/* Brand & Role Tag */}
          <div className="rwa-brand-group">
            <div
              className="rwa-brand-link"
              onClick={() => handleNavigate('dashboard')}
            >
              <img
                src="/assets/CRIMS_logo.png"
                alt="TIMS Logo"
                className="rwa-brand-logo"
              />
              <div>
                <span className="rwa-brand-title">TIMS</span>
                <span className="rwa-brand-sub">Township Infrastructure Management</span>
              </div>
            </div>

            <div className="rwa-role-badge">
              <span className="rwa-role-dot"></span>
              {currentUser?.title || 'RWA Secretary'}
            </div>
          </div>

          {/* User Info & Actions */}
          <div className="rwa-user-actions">
            <div className="rwa-user-badge">
              <div className="rwa-user-name">{currentUser?.name || 'Dr. Arvind Swaminathan'}</div>
              <div className="rwa-user-role">
                {currentUser?.title || 'RWA Secretary'} • {currentUser?.sector || 'Sector 54'}
              </div>
            </div>

            {onExitToLanding && (
              <button onClick={onExitToLanding} className="rwa-btn-exit">
                Exit Portal ↗
              </button>
            )}
          </div>
        </div>

        {/* Screen Tabs Bar */}
        <div className="rwa-tabs-wrapper">
          <div className="rwa-tabs-container">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'report', label: 'Report Issue' },
              { id: 'track', label: 'Live Tracker' },
              {
                id: 'verify',
                label: 'Verification',
                badge: pendingVerificationCount > 0 ? pendingVerificationCount : null,
              },
            ].map((tab) => {
              const isActive = currentScreen === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleNavigate(tab.id)}
                  className={`rwa-tab-btn ${isActive ? 'active' : ''}`}
                >
                  {tab.label}
                  {tab.badge && (
                    <span className="rwa-tab-badge">{tab.badge}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Main Screen Content Body */}
      <main className="rwa-main-container">
        {currentScreen === 'dashboard' && (
          <RwaDashboard
            currentUser={currentUser}
            onComplaintSubmitted={handleComplaintSubmitted}
            onDismissNotice={handleDismissNotice}
          />
        )}

        {currentScreen === 'report' && (
          <ReportIssue
            currentUser={currentUser}
            onComplaintSubmitted={handleComplaintSubmitted}
          />
        )}

        {currentScreen === 'track' && (
          <ComplaintTracker
            currentUser={currentUser}
          />
        )}

        {currentScreen === 'verify' && (
          <VerificationDispute
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Minimal Civic Footer */}
      <footer className="rwa-footer">
        TIMS Township Infrastructure Management System
      </footer>
    </div>
  )
}
