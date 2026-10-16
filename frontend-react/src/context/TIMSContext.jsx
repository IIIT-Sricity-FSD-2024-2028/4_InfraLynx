import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi, systemApi, masterApi, complaintApi } from '../services/api.js'

const INITIAL_CURRENT_USER = null

const CANONICAL_FALLBACK_CONTRACTORS = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    name: 'Larsen & Toubro Urban Infra Works Ltd.',
    company_name: 'Larsen & Toubro Urban Infra Works Ltd.',
    lead: 'Rameshwar Nath Sharma',
    phone: '+91 98110 45231',
    email: 'rameshwar.sharma@infralynx.com',
    departments: ['Civil', 'Roads'],
    amcContractId: 'AMC-CIV-2025-08',
    status: 'Active',
    rating: 4.8,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    name: 'Voltech Power & Electrical Systems Ltd.',
    company_name: 'Voltech Power & Electrical Systems Ltd.',
    lead: 'Vikram Singh Rathore',
    phone: '+91 97230 11984',
    email: 'vikram.rathore@infralynx.com',
    departments: ['Electrical', 'Power'],
    amcContractId: 'AMC-ELE-2025-03',
    status: 'Active',
    rating: 4.6,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    name: 'Kirloskar HydroTech & Water Systems Pvt. Ltd.',
    company_name: 'Kirloskar HydroTech & Water Systems Pvt. Ltd.',
    lead: 'Suresh Narayan Kulkarni',
    phone: '+91 94220 33819',
    email: 'suresh.kulkarni@infralynx.com',
    departments: ['Water', 'Sanitation'],
    amcContractId: 'AMC-WTR-2025-11',
    status: 'Active',
    rating: 4.9,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    name: 'Swachh Urban Environmental Solutions LLP',
    company_name: 'Swachh Urban Environmental Solutions LLP',
    lead: 'Gurpreet Singh Sandhu',
    phone: '+91 98722 55431',
    email: 'gurpreet.sandhu@infralynx.com',
    departments: ['Horticulture', 'Horticulture & Urban Waste Management', 'Waste'],
    amcContractId: 'AMC-SAN-2025-18',
    status: 'Active',
    rating: 4.7,
  },
]

const TIMSContext = createContext(null)

export function TIMSProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    return authApi.getCachedUser() || INITIAL_CURRENT_USER
  })

  const [contractors, setContractors] = useState(CANONICAL_FALLBACK_CONTRACTORS)
  const [amcRateCards, setAmcRateCards] = useState([])

  const [backendStatus, setBackendStatus] = useState({
    connected: false,
    checking: true,
    environment: null,
  })

  // Listen for session expiration or unauthorized events from API layer
  useEffect(() => {
    const handleRevocation = () => {
      setCurrentUser(null)
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
  const refreshMasterData = useCallback(async () => {
    try {
      const data = await masterApi.getContractors()
      if (Array.isArray(data) && data.length > 0) {
        setContractors(data)
      }
    } catch (err) {
      console.warn('[TIMSContext] Master contractors notice:', err.message)
    }

    try {
      const rates = await masterApi.getAmcRates()
      if (Array.isArray(rates) && rates.length > 0) {
        setAmcRateCards(rates)
      }
    } catch (err) {
      console.warn('[TIMSContext] Master AMC rates notice:', err.message)
    }
  }, [])

  useEffect(() => {
    refreshMasterData()
  }, [backendStatus.connected, currentUser?.id, refreshMasterData])

  const login = useCallback(async (emailOrUsername, password) => {
    const data = await authApi.login(emailOrUsername, password)
    const user = data.user
    setCurrentUser(user)
    return { success: true, user }
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setCurrentUser(null)
    try {
      sessionStorage.clear()
    } catch (_) {}
  }, [])

  // Direct fetch helper for components needing live PostgreSQL complaints
  const refreshComplaints = useCallback(async () => {
    try {
      const data = await complaintApi.getComplaints()
      return Array.isArray(data) ? data : []
    } catch (err) {
      console.warn('[TIMSContext] Complaints fetch notice:', err.message)
      return []
    }
  }, [])

  const value = {
    currentUser,
    setCurrentUser,
    contractors,
    amcRateCards,
    backendStatus,
    login,
    logout,
    refreshMasterData,
    refreshComplaints,
    complaints: [],
    updateComplaintStatus: () => {},
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

