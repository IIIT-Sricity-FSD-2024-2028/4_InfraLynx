import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi, systemApi, complaintApi, masterApi } from '../services/api.js'

// Minimal baseline fallback for current user if not authenticated
const DEFAULT_CURRENT_USER = {
  id: 'usr-rwa-01',
  name: 'Ravi Sharma',
  role: 'rwa',
  title: 'RWA Secretary',
  sector: 'Sector 4',
  phone: '+91 98765 43210',
  email: 'rwa@infralynx.com',
}

const normStage = (s) => (s || '').toUpperCase().replace(/[\s_-]+/g, '')

const STAGE_RANK_MAP = {
  REPORTED: 0,
  UNDERREVIEW: 1,
  VALIDATED: 2,
  WORKORDERCREATED: 3,
  AWAITINGDEPTHEAD: 3,
  REVISIONREQUESTED: 3,
  ASSIGNED: 4,
  CONTRACTORESCALATED: 4,
  ESCALATEDTOCOO: 4,
  INPROGRESS: 5,
  COMPLETED: 6,
  PENDINGVERIFICATION: 7,
  CLOSED: 8,
  DISPUTED: 8,
}

function sanitizeComplaintHistory(c) {
  if (!c) return c
  const currentRank = STAGE_RANK_MAP[normStage(c.status)] ?? 0
  const cleanHistory = Array.isArray(c.history)
    ? c.history.filter((evt) => {
        const rank = STAGE_RANK_MAP[normStage(evt.stage)] ?? 0
        return rank <= currentRank
      })
    : []

  const loc = c.location || {}
  const location = {
    sector: loc.sector || c.sector || 'Sector 4',
    block: loc.block || c.block || 'Block B',
    street: loc.street || c.street || 'Main Street',
    assetId: loc.assetId || c.asset_id || 'ASSET-GEN-01',
    assetName: loc.assetName || c.asset_name || c.location_details || 'Township Infrastructure Fixture',
    landmark: loc.landmark || c.location_details || '',
    gps: loc.gps || c.gps || '28.5355° N, 77.3910° E',
  }

  return {
    ...c,
    id: c.complaint_code || c.id,
    complaint_code: c.complaint_code || c.id,
    location,
    history: cleanHistory,
    beforePhotos: Array.isArray(c.beforePhotos) ? c.beforePhotos : [],
    afterPhotos: Array.isArray(c.afterPhotos) ? c.afterPhotos : [],
  }
}

const TIMSContext = createContext(null)

export function TIMSProvider({ children }) {
  const [complaints, setComplaints] = useState(() => {
    localStorage.removeItem('tims_complaints')
    const saved = localStorage.getItem('tims_complaints_v3')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return Array.isArray(parsed) ? parsed.map(sanitizeComplaintHistory) : []
      } catch {
        return []
      }
    }
    return []
  })

  const [contractors, setContractors] = useState(() => {
    const saved = localStorage.getItem('tims_contractors')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  })

  const [amcRateCards, setAmcRateCards] = useState(() => {
    const saved = localStorage.getItem('tims_rate_cards')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  })

  // Initialize currentUser from localStorage if available, or fall back to default
  const [currentUser, setCurrentUser] = useState(() => {
    const cached = authApi.getCachedUser()
    return cached || DEFAULT_CURRENT_USER
  })

  const [backendStatus, setBackendStatus] = useState({
    connected: false,
    checking: true,
    environment: null,
  })

  // Check backend server connectivity on startup
  useEffect(() => {
    let isMounted = true
    systemApi.checkHealth().then((health) => {
      if (isMounted) {
        setBackendStatus({
          connected: health.success === true,
          checking: false,
          environment: health.environment || 'local',
          database: health.database || 'DISCONNECTED',
        })
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  // Auto-authenticate default user session if backend is running but token is missing
  useEffect(() => {
    if (backendStatus.connected && !authApi.isAuthenticated()) {
      authApi
        .login('rwa@infralynx.com', 'Password@123')
        .then((data) => {
          if (data?.user) setCurrentUser(data.user)
        })
        .catch(() => {})
    }
  }, [backendStatus.connected])

  // Sync live contractors & rate cards from backend master in-memory API
  useEffect(() => {
    let isMounted = true
    if (backendStatus.connected) {
      masterApi
        .getContractors()
        .then((data) => {
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setContractors(data)
            localStorage.setItem('tims_contractors', JSON.stringify(data))
          }
        })
        .catch((err) => console.warn('[TIMSContext] Master contractors error:', err.message))

      masterApi
        .getAmcRates()
        .then((data) => {
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setAmcRateCards(data)
            localStorage.setItem('tims_rate_cards', JSON.stringify(data))
          }
        })
        .catch((err) => console.warn('[TIMSContext] Master AMC rates error:', err.message))
    }
    return () => {
      isMounted = false
    }
  }, [backendStatus.connected])

  // Sync live complaints from backend API when available
  useEffect(() => {
    let isMounted = true
    if (backendStatus.connected) {
      complaintApi
        .getComplaints()
        .then((data) => {
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setComplaints(data.map(sanitizeComplaintHistory))
          }
        })
        .catch(() => {
          // Fallback to local state if backend is offline
        })
    }
    return () => {
      isMounted = false
    }
  }, [backendStatus.connected, currentUser])

  // Persist complaints state changes in browser localStorage
  useEffect(() => {
    localStorage.setItem('tims_complaints_v3', JSON.stringify(complaints))
  }, [complaints])

  /**
   * Log in user via Backend API with graceful offline fallback
   */
  const login = useCallback(async (emailOrUsername, password) => {
    try {
      const data = await authApi.login(emailOrUsername, password)
      const user = data.user
      setCurrentUser(user)
      return { success: true, user }
    } catch (err) {
      console.warn('[TIMS Login Warning] Backend API error:', err.message)
      throw err
    }
  }, [])

  /**
   * Log out user
   */
  const logout = useCallback(async () => {
    await authApi.logout()
    setCurrentUser(DEFAULT_CURRENT_USER)
  }, [])

  /**
   * Screen 2 - Report New Issue (In-Memory + API Sync)
   */
  function addComplaint({
    title,
    category,
    subCategory,
    location,
    severity = 'Medium',
    description,
    photos = [],
  }) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const newId = `CMP-2026-${randomSuffix}`

    const slaHoursMap = {
      Emergency: 6,
      High: 24,
      Medium: 48,
      Low: 72,
    }
    const slaHours = slaHoursMap[severity] || 48
    const slaDeadline = new Date(Date.now() + slaHours * 3600 * 1000).toISOString()
    const now = new Date().toISOString()

    const newRecord = {
      id: newId,
      complaint_code: newId,
      title: title || `${category} - ${subCategory}`,
      category,
      subCategory,
      location: {
        sector: location?.sector || currentUser.sector || 'Sector 4',
        block: location?.block || 'Block A',
        street: location?.street || '',
        assetId: location?.assetId || 'ASSET-GEN-01',
        assetName: location?.assetName || 'General Infrastructure Asset',
        landmark: location?.landmark || '',
        gps: location?.gps || '28.5355° N, 77.3910° E',
      },
      severity,
      slaDeadline,
      status: 'REPORTED',
      description,
      reportedBy: {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
        sector: currentUser.sector,
      },
      createdAt: now,
      beforePhotos: photos.length > 0 ? photos : ['https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80'],
      afterPhotos: [],
      assignedContractor: null,
      workOrderId: null,
      inspectionRemarks: null,
      estimateAmount: null,
      completionRemarks: null,
      completedAt: null,
      verification: null,
      dispute: null,
      history: [
        {
          stage: 'REPORTED',
          timestamp: now,
          actor: `${currentUser.name} (${currentUser.title || currentUser.role || 'RWA'})`,
          note: `Complaint filed under ${category} (${subCategory}). Severity: ${severity}.`,
        },
      ],
    }

    setComplaints((prev) => [newRecord, ...prev])

    // Asynchronously sync with Backend API
    complaintApi
      .createComplaint({
        title: newRecord.title,
        category: newRecord.category,
        subCategory: newRecord.subCategory,
        location: newRecord.location,
        severity: newRecord.severity,
        description: newRecord.description,
        photos: newRecord.beforePhotos,
      })
      .catch((err) => {
        console.warn('[Offline Mode] Saved complaint locally:', err.message)
      })

    return newRecord
  }

  /**
   * Screen 4 - Confirm Fix (Marks CLOSED)
   */
  function confirmFix(complaintId, { rating = 5, remarks = '' } = {}) {
    const now = new Date().toISOString()

    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id !== complaintId && c.complaint_code !== complaintId) return c

        return {
          ...c,
          status: 'CLOSED',
          verification: {
            status: 'CONFIRMED',
            rating,
            remarks: remarks || 'Work completed satisfactorily and verified on ground.',
            verifiedAt: now,
            verifiedBy: currentUser.name,
          },
          history: [
            ...(c.history || []),
            {
              stage: 'VERIFIED',
              timestamp: now,
              actor: `${currentUser.name} (RWA Rep)`,
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

    // Sync with backend API
    complaintApi
      .verifyComplaint(complaintId, { rating, remarks })
      .catch((err) => console.warn('[Offline Mode] Verification saved locally:', err.message))
  }

  /**
   * Screen 4 - Dispute Fix (Marks DISPUTED)
   */
  function disputeComplaint(complaintId, { reason, disputeNotes, remarks, requestedAction = 'REWORK' } = {}) {
    const now = new Date().toISOString()
    const activeReason = reason || 'Incomplete resolution / poor quality'
    const activeRemarks = disputeNotes || remarks || 'The repaired fixture is still malfunctioning.'

    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id !== complaintId && c.complaint_code !== complaintId) return c

        return {
          ...c,
          status: 'DISPUTED',
          dispute: {
            reason: activeReason,
            notes: activeRemarks,
            remarks: activeRemarks,
            disputedAt: now,
            disputedBy: currentUser.name,
            requestedAction,
          },
          history: [
            ...(c.history || []),
            {
              stage: 'DISPUTED',
              timestamp: now,
              actor: `${currentUser.name} (RWA Rep)`,
              note: `Work disputed: ${activeReason}. Requesting field rework.`,
            },
          ],
        }
      })
    )

    // Sync with backend API
    complaintApi
      .disputeComplaint(complaintId, { reason: activeReason, remarks: activeRemarks })
      .catch((err) => console.warn('[Offline Mode] Dispute saved locally:', err.message))
  }

  /**
   * Helper to manually update status
   */
  function updateComplaintStatus(complaintId, newStatus, note = '') {
    const now = new Date().toISOString()
    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id !== complaintId && c.complaint_code !== complaintId) return c
        const newRank = STAGE_RANK_MAP[normStage(newStatus)] ?? 0
        const cleanHistory = (c.history || []).filter(
          (evt) => (STAGE_RANK_MAP[normStage(evt.stage)] ?? 0) < newRank
        )
        return {
          ...c,
          status: newStatus,
          history: [
            ...cleanHistory,
            {
              stage: newStatus,
              timestamp: now,
              actor: currentUser.name,
              note: note || `Status updated to ${newStatus.replace(/_/g, ' ')}`,
            },
          ],
        }
      })
    )
  }

  const value = {
    complaints,
    contractors,
    amcRateCards,
    currentUser,
    setCurrentUser,
    login,
    logout,
    backendStatus,
    addComplaint,
    confirmFix,
    disputeComplaint,
    updateComplaintStatus,
  }

  return <TIMSContext.Provider value={value}>{children}</TIMSContext.Provider>
}

export function useTIMS() {
  const context = useContext(TIMSContext)
  if (!context) {
    throw new Error('useTIMS must be used within a TIMSProvider')
  }
  return context
}
