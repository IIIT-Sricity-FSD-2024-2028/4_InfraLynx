import { useState, useEffect, useCallback } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import { complaintApi } from '../../services/api.js'
import RwaDashboard from './RwaDashboard.jsx'
import ReportIssue from './ReportIssue.jsx'
import ComplaintTracker from './ComplaintTracker.jsx'
import VerificationDispute from './VerificationDispute.jsx'
import './styles/RwaPortal.css'

export default function RwaPortal({ onExitToLanding }) {
  // Global auth context (strictly for user credentials / session info)
  const { currentUser: contextUser } = useTIMS()
  const currentUser = contextUser || {
    id: '10000000-0000-0000-0000-000000000001',
    name: 'Dr. Arvind Swaminathan',
    role: 'RWA',
    title: 'RWA Secretary',
    sector: 'Sector 54',
    email: 'rwa@infralynx.com',
  }

  // Local RWA Complaints State (matching FinancePortal pattern)
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
      if (Array.isArray(data)) {
        setComplaints(data)
      }
    } catch (err) {
      console.warn('[RwaPortal] Backend fetch notice:', err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadComplaints()
  }, [loadComplaints])

  // 2. Direct local actions matching FinancePortal pattern
  async function handleAddComplaint(formData) {
    try {
      const created = await complaintApi.createComplaint(formData)
      const newRecord = created?.data || created
      setComplaints((prev) => [newRecord, ...prev])
      return newRecord
    } catch (err) {
      console.warn('[RwaPortal] Offline/Backend notice on create:', err.message)
      const tempId = `CMP-2026-${Math.floor(1000 + Math.random() * 9000)}`
      const fallbackRecord = {
        id: tempId,
        complaint_code: tempId,
        title: formData.title || `${formData.category}: ${formData.subCategory}`,
        category: formData.category,
        subCategory: formData.subCategory,
        location: formData.location || {
          sector: currentUser?.sector || 'Sector 54',
          block: 'Block A',
          street: 'Gulmohar Marg',
          assetId: 'ASSET-GEN-01',
          assetName: 'General Infrastructure Fixture',
          landmark: '',
          gps: '28.5355° N, 77.3910° E',
        },
        severity: formData.severity || 'Medium',
        status: 'REPORTED',
        description: formData.description,
        beforePhotos: formData.photos || [],
        afterPhotos: [],
        createdAt: new Date().toISOString(),
        reportedBy: {
          id: currentUser?.id,
          name: currentUser?.name || 'Dr. Arvind Swaminathan',
          role: currentUser?.title || 'RWA Secretary',
          sector: currentUser?.sector || 'Sector 54',
        },
        history: [
          {
            stage: 'REPORTED',
            timestamp: new Date().toISOString(),
            actor: `${currentUser?.name || 'Dr. Arvind Swaminathan'} (${currentUser?.title || 'RWA Secretary'})`,
            note: `Issue logged under ${formData.category} (${formData.subCategory}). Severity: ${formData.severity}.`,
          },
        ],
      }
      setComplaints((prev) => [fallbackRecord, ...prev])
      return fallbackRecord
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
      console.warn('[RwaPortal] Offline/Backend notice on verify:', err.message)
      const now = new Date().toISOString()
      const rating = payload.rating || 5
      const remarks = payload.remarks || 'Work completed satisfactorily and verified on ground.'

      setComplaints((prev) =>
        prev.map((c) => {
          if (c.id !== id && c.complaint_code !== id) return c
          return {
            ...c,
            status: 'CLOSED',
            verification: {
              status: 'CONFIRMED',
              rating,
              remarks,
              verifiedAt: now,
              verifiedBy: currentUser?.name || 'Dr. Arvind Swaminathan',
            },
            history: [
              ...(c.history || []),
              {
                stage: 'VERIFIED',
                timestamp: now,
                actor: `${currentUser?.name || 'Dr. Arvind Swaminathan'} (${currentUser?.title || 'RWA Secretary'})`,
                note: `Work verified and confirmed with a ${rating}-star rating. Issue closed.`,
              },
              {
                stage: 'CLOSED',
                timestamp: now,
                actor: 'System Automation',
                note: 'Workflow resolved. Work Order closed.',
              },
            ],
          }
        })
      )
      setSelectedComplaint((prev) => {
        if (!prev) return null
        if (prev.id === id || prev.complaint_code === id) {
          return { ...prev, status: 'CLOSED' }
        }
        return prev
      })
    }
  }

  async function handleDisputeComplaint(id, payload = {}) {
    try {
      const updated = await complaintApi.disputeComplaint(id, payload)
      const resolved = updated?.data || updated
      setComplaints((prev) =>
        prev.map((c) => (c.id === id || c.complaint_code === id ? { ...c, ...resolved, status: 'DISPUTED' } : c))
      )
      setSelectedComplaint((prev) => {
        if (!prev) return null
        if (prev.id === id || prev.complaint_code === id) {
          return { ...prev, ...resolved, status: 'DISPUTED' }
        }
        return prev
      })
      return resolved
    } catch (err) {
      console.warn('[RwaPortal] Offline/Backend notice on dispute:', err.message)
      const now = new Date().toISOString()
      const reason = payload.reason || 'Incomplete resolution / poor quality'
      const remarks = payload.remarks || 'The repaired fixture is still malfunctioning.'

      setComplaints((prev) =>
        prev.map((c) => {
          if (c.id !== id && c.complaint_code !== id) return c
          return {
            ...c,
            status: 'DISPUTED',
            dispute: {
              reason,
              notes: remarks,
              remarks,
              disputedAt: now,
              disputedBy: currentUser?.name || 'Dr. Arvind Swaminathan',
              requestedAction: 'REWORK',
            },
            history: [
              ...(c.history || []),
              {
                stage: 'DISPUTED',
                timestamp: now,
                actor: `${currentUser?.name || 'Dr. Arvind Swaminathan'} (${currentUser?.title || 'RWA Secretary'})`,
                note: `Work disputed: ${reason}. Requesting field rework.`,
              },
            ],
          }
        })
      )
      setSelectedComplaint((prev) => {
        if (!prev) return null
        if (prev.id === id || prev.complaint_code === id) {
          return { ...prev, status: 'DISPUTED' }
        }
        return prev
      })
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
            onDisputeComplaint={handleDisputeComplaint}
          />
        )}
      </main>

      {/* Minimal Civic Footer */}
      <footer className="rwa-footer">
        TIMS Township Infrastructure Management System • Member 1: RWA Representative Module (Direct API Architecture)
      </footer>
    </div>
  )
}
