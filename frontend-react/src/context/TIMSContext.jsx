import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi, systemApi, masterApi, complaintApi } from '../services/api.js'

const INITIAL_CURRENT_USER = null

const TIMSContext = createContext(null)

export function TIMSProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    return authApi.getCachedUser() || INITIAL_CURRENT_USER
  })

  const [contractors, setContractors] = useState([])
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
    // Cross-tab logout: when another tab calls logout(), it sets tims_logout_signal
    // in localStorage which fires the 'storage' event in all other tabs
    const handleStorageLogout = (e) => {
      if (e.key === 'tims_logout_signal' && e.newValue) {
        // Signal value is "<sessionId>:<timestamp>"
        // Only log out if the signalling tab shares the same session ID as us.
        // This prevents a DIFFERENT user logging out in another tab from
        // kicking out an unrelated session in this tab.
        const signalSessionId = e.newValue.split(':')[0]
        const mySessionId = sessionStorage.getItem('tims_session_id')
        if (mySessionId && mySessionId !== signalSessionId) return
        // Same session (or session ID not set) — mirror the logout
        try { sessionStorage.clear() } catch (_) {}
        handleRevocation()
        try { localStorage.removeItem('tims_logout_signal') } catch (_) {}
      }
    }
    window.addEventListener('tims_auth_session_expired', handleRevocation)
    window.addEventListener('tims_auth_unauthorized', handleRevocation)
    window.addEventListener('tims_auth_logout', handleRevocation)
    window.addEventListener('storage', handleStorageLogout)
    return () => {
      window.removeEventListener('tims_auth_session_expired', handleRevocation)
      window.removeEventListener('tims_auth_unauthorized', handleRevocation)
      window.removeEventListener('tims_auth_logout', handleRevocation)
      window.removeEventListener('storage', handleStorageLogout)
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

