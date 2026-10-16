import { useState, useEffect, useCallback } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import { complaintApi } from '../../services/api.js'
import RwaDashboard from './RwaDashboard.jsx'
import ReportIssue from './ReportIssue.jsx'
import ComplaintTracker from './ComplaintTracker.jsx'
import VerificationDispute from './VerificationDispute.jsx'
import './styles/RwaPortal.css'

export default function RwaPortal({ onExitToLanding }) {
  // Global auth context
  const { currentUser } = useTIMS()
  // Local RWA Complaints State
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentScreen, setCurrentScreen] = useState('dashboard')
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [successNotice, setSuccessNotice] = useState(null)

  // 1. Fetch live complaints from backend on mount
  const loadComplaints = useCallback(async () => {
    try {
      setLoading(true)
      const data = await complaintApi.getComplaints()
      setComplaints(Array.isArray(data) ? data : [])
    } catch (err) {
      console.warn('[RwaPortal] Backend fetch notice:', err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadComplaints()
  }, [loadComplaints])

  // 2. Direct local actions via Backend API
  async function handleAddComplaint(formData) {
    try {
      const created = await complaintApi.createComplaint(formData)
      const newRecord = created?.data || created
      await loadComplaints()
      return newRecord
    } catch (err) {
      console.error('[RwaPortal] Error creating complaint:', err.message)
      throw err
    }
  }

  const normStatus = (s) => (s || '').toUpperCase().replace(/[\s_-]+/g, '_')

  async function handleConfirmFix(id, payload = {}) {
    try {
      const updated = await complaintApi.verifyComplaint(id, payload)
      const resolved = updated?.data || updated
      setComplaints((prev) =>
        prev.map((c) => (c.id === id || c.complaint_code === id ? { ...c, ...resolved, status: 'CLOSED' } : c))
      )
      setSelectedComplaint((prev) => {
        if (!prev) return null
        if (prev.id === id || prev.complaint_code === id) {
          return { ...prev, ...resolved, status: 'CLOSED' }
        }
        return prev
      })
      return resolved
    } catch (err) {
      console.error('[RwaPortal] Error confirming fix:', err.message)
      throw err
    }
  }



  // Pending verification count for notification badge derived from local state
  const pendingVerificationCount = complaints.filter((c) => {
    const st = normStatus(c.status)
    return ['PENDING_VERIFICATION', 'COMPLETED', 'WORK_COMPLETED'].includes(st)
  }).length

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
              {currentUser?.title || 'RWA Secretary'}
            </div>
          </div>

          {/* User Info & Actions */}
          <div className="rwa-user-actions">
            {/* User identity badge */}
            <div className="rwa-user-badge">
              <div className="rwa-user-name">{currentUser?.name || 'Dr. Arvind Swaminathan'}</div>
              <div className="rwa-user-role">
                {currentUser?.title || 'RWA Secretary'} • {currentUser?.sector || 'Sector 54'}
              </div>
            </div>

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
            complaints={complaints}
            loading={loading}
            currentUser={currentUser}
            onNavigate={handleNavigate}
            onSelectComplaint={handleSelectComplaint}
            successNotice={successNotice}
            onDismissNotice={() => setSuccessNotice(null)}
            onRefresh={loadComplaints}
          />
        )}

        {currentScreen === 'report' && (
          <ReportIssue
            currentUser={currentUser}
            onNavigate={handleNavigate}
            onSelectComplaint={handleSelectComplaint}
            onComplaintSubmitted={handleComplaintSubmitted}
            onAddComplaint={handleAddComplaint}
          />
        )}

        {currentScreen === 'track' && (
          <ComplaintTracker
            complaints={complaints}
            selectedComplaint={selectedComplaint}
            currentUser={currentUser}
            onNavigate={handleNavigate}
            onSelectComplaint={handleSelectComplaint}
          />
        )}

        {currentScreen === 'verify' && (
          <VerificationDispute
            complaints={complaints}
            selectedComplaint={selectedComplaint}
            currentUser={currentUser}
            onNavigate={handleNavigate}
            onSelectComplaint={handleSelectComplaint}
            onConfirmFix={handleConfirmFix}
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
