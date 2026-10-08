import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi, systemApi, complaintApi, masterApi } from '../services/api.js'

// Default initial state for unauthenticated visitor is null
const INITIAL_CURRENT_USER = null

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
    sector: loc.sector || c.sector || 'Sector 54',
    block: loc.block || c.block || 'Block B',
    street: loc.street || c.street || 'Gulmohar Marg',
    assetId: loc.assetId || c.asset_id || 'ASSET-GEN-01',
    assetName: loc.assetName || c.asset_name || c.location_details || 'Township Infrastructure Fixture',
    landmark: loc.landmark || c.location_details || '',
    gps: loc.gps || c.gps || '28.5355° N, 77.3910° E',
  }

  // Resolve contractor entity purely from in-memory database record
  const assignedContractor = c.assignedContractor || (c.assigned_contractor_name ? {
    id: c.assigned_contractor_id || null,
    name: c.assigned_contractor_name,
    company_name: c.assigned_contractor_name,
    lead: c.assigned_contractor_lead || c.contact_person || null,
    phone: c.assigned_contractor_phone || null,
    email: c.assigned_contractor_email || null,
    amcContractId: c.amc_contract_id || null,
  } : null)

  const workOrderId = c.workOrderId || c.work_order_code || c.work_order?.work_order_code || c.work_order?.id || null
  const estimateAmount = c.estimateAmount ?? c.estimate_amount ?? c.work_order?.estimate_amount ?? 0
  const lineItems = c.lineItems || c.line_items || c.work_order?.line_items || []
  const requiresDeptHead = c.requiresDeptHead ?? c.requires_dept_head ?? c.work_order?.requires_dept_head ?? false
  const priority = c.priority || c.work_order?.priority || 'Medium'
  const createdAt = c.createdAt || c.created_at || new Date().toISOString()

  return {
    ...c,
    id: c.complaint_code || c.id,
    complaint_code: c.complaint_code || c.id,
    location,
    history: cleanHistory,
    assignedContractor,
    workOrderId,
    estimateAmount,
    lineItems,
    requiresDeptHead,
    priority,
    createdAt,
    beforePhotos: Array.isArray(c.beforePhotos) ? c.beforePhotos : [],
    afterPhotos: Array.isArray(c.afterPhotos) ? c.afterPhotos : [],
  }
}

const TIMSContext = createContext(null)

export function TIMSProvider({ children }) {
  const [complaints, setComplaints] = useState(() => {
    try {
      const saved = sessionStorage.getItem('tims_complaints_v3')
      if (saved) {
        const parsed = JSON.parse(saved)
        return Array.isArray(parsed) ? parsed.map(sanitizeComplaintHistory) : []
      }
    } catch {
      return []
    }
    return []
  })

  const [contractors, setContractors] = useState(() => {
    try {
      const saved = sessionStorage.getItem('tims_contractors')
      if (saved) {
        const parsed = JSON.parse(saved)
        return Array.isArray(parsed) ? parsed : []
      }
    } catch {
      return []
    }
    return []
  })

  const [amcRateCards, setAmcRateCards] = useState(() => {
    try {
      const saved = sessionStorage.getItem('tims_rate_cards')
      if (saved) {
        const parsed = JSON.parse(saved)
        return Array.isArray(parsed) ? parsed : []
      }
    } catch {
      return []
    }
    return []
  })

  // Initialize currentUser ONLY from active sessionStorage token; defaults to null if unauthenticated
  const [currentUser, setCurrentUser] = useState(() => {
    return authApi.getCachedUser() || INITIAL_CURRENT_USER
  })

  const [backendStatus, setBackendStatus] = useState({
    connected: false,
    checking: true,
    environment: null,
  })

  // Listen for session expiration or unauthorized events from API layer
  useEffect(() => {
    const handleRevocation = () => {
      setCurrentUser(null)
      setComplaints([])
    }
    window.addEventListener('tims_auth_session_expired', handleRevocation)
    window.addEventListener('tims_auth_unauthorized', handleRevocation)
    window.addEventListener('tims_auth_logout', handleRevocation)
    return () => {
      window.removeEventListener('tims_auth_session_expired', handleRevocation)
      window.removeEventListener('tims_auth_unauthorized', handleRevocation)
      window.removeEventListener('tims_auth_logout', handleRevocation)
    }
  }, [])

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

  // Sync live contractors & rate cards from backend master in-memory API
  useEffect(() => {
    let isMounted = true
    if (backendStatus.connected) {
      masterApi
        .getContractors()
        .then((data) => {
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setContractors(data)
            sessionStorage.setItem('tims_contractors', JSON.stringify(data))
          }
        })
        .catch((err) => console.warn('[TIMSContext] Master contractors error:', err.message))

      masterApi
        .getAmcRates()
        .then((data) => {
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setAmcRateCards(data)
            sessionStorage.setItem('tims_rate_cards', JSON.stringify(data))
          }
        })
        .catch((err) => console.warn('[TIMSContext] Master AMC rates error:', err.message))
    }
    return () => {
      isMounted = false
    }
  }, [backendStatus.connected])

  // Refresh complaints from in-memory database
  const refreshComplaints = useCallback(async () => {
    try {
      const data = await complaintApi.getComplaints()
      if (Array.isArray(data)) {
        const sanitized = data.map(sanitizeComplaintHistory)
        setComplaints(sanitized)
        return sanitized
      }
    } catch (err) {
      console.warn('[TIMSContext] Master in-memory DB complaints sync error:', err.message)
    }
    return []
  }, [])

  // Sync live complaints from backend API when available
  useEffect(() => {
    if (backendStatus.connected) {
      refreshComplaints()
    }
  }, [backendStatus.connected, currentUser, refreshComplaints])

  // Persist complaints state changes in tab-isolated sessionStorage
  useEffect(() => {
    sessionStorage.setItem('tims_complaints_v3', JSON.stringify(complaints))
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
   * Secure log out: terminates backend session, clears credentials, and purges state
   */
  const logout = useCallback(async () => {
    await authApi.logout()
    setCurrentUser(null)
    setComplaints([])
    try {
      sessionStorage.clear()
    } catch {
      // Ignore
    }
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
    if (!currentUser) {
      throw new Error('Authentication required: Please sign in to submit a complaint.')
    }
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
        sector: location?.sector || currentUser.sector || 'Sector 54',
        block: location?.block || 'Block A',
        street: location?.street || 'Gulmohar Marg',
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
   * Helper to manually update any fields on a complaint
   */
  function updateComplaint(complaintId, updates = {}) {
    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id !== complaintId && c.complaint_code !== complaintId) return c
        return sanitizeComplaintHistory({
          ...c,
          ...updates,
        })
      })
    )
  }

  /**
   * Helper to manually update status and optional extra fields
   */
  function updateComplaintStatus(complaintId, newStatus, note = '', extraFields = {}) {
    const now = new Date().toISOString()
    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id !== complaintId && c.complaint_code !== complaintId) return c
        const newRank = STAGE_RANK_MAP[normStage(newStatus)] ?? 0
        const cleanHistory = (c.history || []).filter(
          (evt) => (STAGE_RANK_MAP[normStage(evt.stage)] ?? 0) < newRank
        )
        return sanitizeComplaintHistory({
          ...c,
          ...extraFields,
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
        })
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
    refreshComplaints,
    addComplaint,
    confirmFix,
    disputeComplaint,
    updateComplaint,
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
