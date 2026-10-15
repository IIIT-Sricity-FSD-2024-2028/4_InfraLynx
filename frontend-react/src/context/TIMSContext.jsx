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
    sector: c.sector || loc.sector || 'Sector 54',
    block: c.block || loc.block || 'Block B',
    street: c.street || loc.street || 'Gulmohar Marg',
    asset_id: c.asset_id || loc.asset_id || loc.assetId || 'ASSET-GEN-01',
    asset_name: c.asset_name || loc.asset_name || loc.assetName || c.location_details || 'Township Infrastructure Fixture',
    landmark: c.location_details || loc.landmark || '',
  }

  // Resolve contractor entity from database record
  const assigned_contractor = c.assigned_contractor || (c.assigned_contractor_name ? {
    id: c.assigned_contractor_id || null,
    name: c.assigned_contractor_name,
    company_name: c.assigned_contractor_name,
    lead: c.assigned_contractor_lead || c.contact_person || null,
    phone: c.assigned_contractor_phone || null,
    email: c.assigned_contractor_email || null,
    amc_contract_id: c.amc_contract_id || null,
  } : (c.assignedContractor || null))

  const complaint_code = c.complaint_code || c.id
  const work_order_number = c.work_order_number || c.work_order_code || c.work_order?.work_order_number || c.work_order?.work_order_code || c.workOrderId || null
  const work_order_id = c.work_order_id || c.work_order?.id || null
  const department_id = c.department_id || c.departmentId || null
  const township_id = c.township_id || c.townshipId || null
  const contractor_id = c.contractor_id || c.assigned_contractor_id || (assigned_contractor ? assigned_contractor.id : null)
  const estimated_cost = Number(c.estimated_cost ?? c.estimate_amount ?? c.estimateAmount ?? c.work_order?.estimated_cost ?? c.work_order?.estimate_amount ?? 0)
  const actual_cost = Number(c.actual_cost ?? c.work_order?.actual_cost ?? (c.status === 'COMPLETED' ? estimated_cost : 0))
  const line_items = Array.isArray(c.line_items) ? c.line_items : (Array.isArray(c.lineItems) ? c.lineItems : (c.work_order?.line_items || []))
  const requires_dept_head = Boolean(c.requires_dept_head ?? c.requiresDeptHead ?? c.work_order?.requires_dept_head)
  const priority = c.priority || c.work_order?.priority || 'Medium'
  const created_at = c.created_at || c.createdAt || new Date().toISOString()

  return {
    ...c,
    id: complaint_code,
    complaint_code,
    work_order_number,
    work_order_id,
    department_id,
    township_id,
    contractor_id,
    estimated_cost,
    actual_cost,
    line_items,
    requires_dept_head,
    priority,
    created_at,
    location,
    history: cleanHistory,
    assigned_contractor,
    // Aliases for seamless compatibility across UI views
    assignedContractor: assigned_contractor,
    workOrderId: work_order_number,
    workOrderCode: work_order_number,
    estimateAmount: estimated_cost,
    estimatedCost: estimated_cost,
    moneyEstimated: estimated_cost,
    actualCost: actual_cost,
    moneyUsed: actual_cost,
    lineItems: line_items,
    requiresDeptHead: requires_dept_head,
    createdAt: created_at,
    departmentId: department_id,
    townshipId: township_id,
    contractorId: contractor_id,
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

  // Sync live contractors & rate cards from backend PostgreSQL API
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

  // Refresh complaints from backend database
  const refreshComplaints = useCallback(async () => {
    try {
      const data = await complaintApi.getComplaints()
      if (Array.isArray(data)) {
        const sanitized = data.map(sanitizeComplaintHistory)
        setComplaints(sanitized)
        sessionStorage.setItem('tims_complaints_v3', JSON.stringify(sanitized))
        return sanitized
      }
    } catch (err) {
      console.warn('[TIMSContext] Backend DB complaints sync error:', err.message)
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
