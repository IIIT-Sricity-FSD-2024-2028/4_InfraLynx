import { createContext, useContext, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { systemApi } from '../services/api.js'
import {
  loginUser,
  logoutUser,
  fetchCurrentUser,
  setUser,
  clearAuth,
  setBackendStatus as setBackendStatusAction,
  selectAuthUser,
  selectBackendStatus,
} from '../store/auth/authSlice.js'
import {
  fetchContractors,
  fetchAmcRates,
  selectAllContractors,
  selectAllAmcRates,
} from '../store/master/masterDataSlice.js'
import { fetchComplaints as fetchRwaComplaints } from '../store/rwa/complaintsSlice.js'

const TIMSContext = createContext(null)

export function TIMSProvider({ children }) {
  const dispatch = useDispatch()
  const currentUser = useSelector(selectAuthUser)
  const backendStatus = useSelector(selectBackendStatus)

  // Master data now lives in Redux — read via selectors (Rule 6, Rule 10)
  const reduxContractors  = useSelector(selectAllContractors)
  const reduxAmcRateCards = useSelector(selectAllAmcRates)

  const setCurrentUser = useCallback((user) => {
    dispatch(setUser(user))
  }, [dispatch])

  // Listen for session expiration or unauthorized events from API layer
  useEffect(() => {
    const handleRevocation = () => {
      dispatch(clearAuth())
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
  }, [dispatch])

  // Check backend server connectivity on startup
  useEffect(() => {
    let isMounted = true
    systemApi.checkHealth().then((health) => {
      if (isMounted) {
        dispatch(setBackendStatusAction({
          connected: health.success === true,
          checking: false,
          environment: health.environment || 'local',
          database: health.database || 'DISCONNECTED',
        }))
      }
    })
    return () => {
      isMounted = false
    }
  }, [dispatch])

  // Dispatch master data thunks through Redux
  const refreshMasterData = useCallback(() => {
    dispatch(fetchContractors())
    dispatch(fetchAmcRates())
  }, [dispatch])

  // Only fetch master data & refresh current user profile when backend is reachable AND a user is logged in
  useEffect(() => {
    if (!backendStatus.connected || !currentUser) return
    dispatch(fetchCurrentUser())
    refreshMasterData()
  }, [backendStatus.connected, currentUser?.id, refreshMasterData, dispatch])

  // Login: Dispatches loginUser Redux thunk
  const login = useCallback(async (emailOrUsername, password) => {
    const action = await dispatch(loginUser({ emailOrUsername, password }))
    if (loginUser.rejected.match(action)) {
      throw new Error(action.payload || 'Login failed')
    }
    const user = action.payload
    return { success: true, user }
  }, [dispatch])

  // Logout: Dispatches logoutUser Redux thunk
  const logout = useCallback(async () => {
    await dispatch(logoutUser())
    try {
      sessionStorage.clear()
    } catch (_) {}
  }, [dispatch])

  // Dispatch Redux thunk for complaints refresh
  const refreshComplaints = useCallback(async () => {
    try {
      const data = await dispatch(fetchRwaComplaints()).unwrap()
      return Array.isArray(data) ? data : []
    } catch (err) {
      console.warn('[TIMSContext] Complaints fetch notice:', err)
      return []
    }
  }, [dispatch])

  const value = {
    currentUser,
    setCurrentUser,
    // Master data bridged from Redux store for backward-compat with non-finance consumers
    contractors:  reduxContractors,
    amcRateCards: reduxAmcRateCards,
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

