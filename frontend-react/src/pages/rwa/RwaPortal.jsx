import { useState } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import RwaDashboard from './RwaDashboard.jsx'
import ReportIssue from './ReportIssue.jsx'
import ComplaintTracker from './ComplaintTracker.jsx'
import VerificationDispute from './VerificationDispute.jsx'
import './styles/RwaPortal.css'

export default function RwaPortal({ onExitToLanding }) {
  const { complaints, currentUser, resetDemoData } = useTIMS()

  // Current screen: 'dashboard' | 'report' | 'track' | 'verify'
  const [currentScreen, setCurrentScreen] = useState('dashboard')
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [successNotice, setSuccessNotice] = useState(null)

  // Pending verification count for notification badge
  const pendingVerificationCount = complaints.filter(
    (c) => c.status === 'PENDING_VERIFICATION'
  ).length

  function handleNavigate(screen) {
    setCurrentScreen(screen)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSelectComplaint(complaint) {
    setSelectedComplaint(complaint)
  }

  function handleComplaintSubmitted(newComplaint) {
    setSelectedComplaint(newComplaint)
    setSuccessNotice({
      id: newComplaint.id,
      title: newComplaint.title,
      message: `Issue "${newComplaint.title}" (${newComplaint.id}) successfully reported and logged!`,
    })
    setCurrentScreen('dashboard')
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
              RWA Representative
            </div>
          </div>

          {/* User Info & Actions */}
          <div className="rwa-user-actions">
            {/* User identity badge */}
            <div className="rwa-user-badge">
              <div className="rwa-user-name">{currentUser.name}</div>
              <div className="rwa-user-role">
                {currentUser.title} • {currentUser.sector}
              </div>
            </div>

            {/* Reset Demo Data button */}
            <button
              onClick={() => {
                if (window.confirm('Reset all in-memory complaints to default demo records?')) {
                  resetDemoData()
                  setSuccessNotice(null)
                  handleNavigate('dashboard')
                }
              }}
              title="Reset in-memory mock data"
              className="rwa-btn-reset"
            >
              ↺ Reset Data
            </button>

            {/* Exit to Landing Page */}
            {onExitToLanding && (
              <button
                onClick={onExitToLanding}
                className="rwa-btn-exit"
              >
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
                label: 'Verification & Dispute',
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
                    <span className="rwa-tab-badge">
                      {tab.badge}
                    </span>
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
            onNavigate={handleNavigate}
            onSelectComplaint={handleSelectComplaint}
            successNotice={successNotice}
            onDismissNotice={() => setSuccessNotice(null)}
          />
        )}

        {currentScreen === 'report' && (
          <ReportIssue
            onNavigate={handleNavigate}
            onSelectComplaint={handleSelectComplaint}
            onComplaintSubmitted={handleComplaintSubmitted}
          />
        )}

        {currentScreen === 'track' && (
          <ComplaintTracker
            selectedComplaint={selectedComplaint}
            onNavigate={handleNavigate}
            onSelectComplaint={handleSelectComplaint}
          />
        )}

        {currentScreen === 'verify' && (
          <VerificationDispute
            selectedComplaint={selectedComplaint}
            onNavigate={handleNavigate}
            onSelectComplaint={handleSelectComplaint}
          />
        )}
      </main>

      {/* Minimal Civic Footer */}
      <footer className="rwa-footer">
        TIMS Township Infrastructure Management System • Member 1: RWA Representative Module (In-Memory Architecture)
      </footer>
    </div>
  )
}
