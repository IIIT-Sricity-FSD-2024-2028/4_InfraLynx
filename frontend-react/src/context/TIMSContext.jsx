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
   * Helper to manually update status and optional extra fields (Legacy support for Clerk & DeptHead)
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
