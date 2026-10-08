import { useState, useEffect, useCallback } from 'react'
import { TIMSProvider, useTIMS } from './context/TIMSContext.jsx'
import { authApi } from './services/api.js'
import Nav from './components/landing/Nav.jsx'
import Hero from './components/landing/Hero.jsx'
import Features from './components/landing/Features.jsx'
import Roles from './components/landing/Roles.jsx'
import Pricing from './components/landing/Pricing.jsx'
import Contact from './components/landing/Contact.jsx'
import Footer from './components/landing/Footer.jsx'
import AuthModal from './components/auth/AuthModal.jsx'
import RwaPortal from './pages/rwa/index.jsx'
import FinancePortal from './pages/finance/index.jsx'
import ClerkPortal from './pages/clerk/index.jsx'
import DeptHeadPortal from './pages/depthead/index.jsx'
import ContractorPortal from './pages/contractor/index.jsx'

/**
 * Route mapper: maps URL pathname / query to internal portal keys
 */
function getPortalFromLocation() {
  const path = window.location.pathname.replace(/^\/+/, '').toLowerCase()
  if (path === 'rwa') return 'rwa'
  if (path === 'finance') return 'finance'
  if (path === 'clerk') return 'clerk'
  if (path === 'dept-head' || path === 'dept_head' || path === 'depthead') return 'dept_head'
  if (path === 'contractor') return 'contractor'

  // Also check query param ?portal=xxx or hash #/xxx
  const searchParams = new URLSearchParams(window.location.search)
  const portalParam = searchParams.get('portal')
  if (portalParam) return portalParam.toLowerCase()

  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase()
  if (['rwa', 'finance', 'clerk', 'dept_head', 'contractor'].includes(hash)) return hash

  return 'landing'
}

function updateUrlForPortal(portalKey) {
  if (portalKey === 'landing') {
    if (window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/')
    }
  } else {
    const targetPath = portalKey === 'dept_head' ? '/dept-head' : `/${portalKey}`
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath)
    }
  }
}

function AppContent() {
  const { currentUser, logout } = useTIMS()
  const [authOpen, setAuthOpen] = useState(false)
  const [authRole, setAuthRole] = useState('rwa')
  const [authNotice, setAuthNotice] = useState(null)
  const [viewMode, setViewMode] = useState('landing')

  // Enforce tab-isolated authentication and protected routing
  const verifyRouteAccess = useCallback((targetPortal) => {
    if (!targetPortal || targetPortal === 'landing') {
      setViewMode('landing')
      return
    }

    const isAuthed = authApi.isAuthenticated()
    const cachedUser = authApi.getCachedUser()

    // If attempting to access a portal without an active authenticated session in THIS tab
    if (!isAuthed || !cachedUser) {
      setViewMode('landing')
      updateUrlForPortal('landing')
      setAuthRole(targetPortal)
      setAuthNotice(
        'Authentication Required: This browser tab does not have an active session. For your security, please sign in with your password.'
      )
      setAuthOpen(true)
      return
    }

    // Role-based authorization check
    const userRole = (cachedUser.role || '').toUpperCase()
    const portalRoleMap = {
      rwa: ['RWA', 'TOWNSHIP_COO'],
      finance: ['FINANCE_CLERK', 'TOWNSHIP_COO'],
      clerk: ['DESK_CLERK', 'TOWNSHIP_COO'],
      dept_head: ['DEPARTMENT_HEAD', 'TOWNSHIP_COO'],
      contractor: ['FIELD_CONTRACTOR', 'TOWNSHIP_COO'],
    }

    const permittedRoles = portalRoleMap[targetPortal] || []
    if (permittedRoles.length > 0 && !permittedRoles.includes(userRole)) {
      alert(`Access Restricted: Your account role (${userRole}) is not authorized for the ${targetPortal} portal.`)
      setViewMode('landing')
      updateUrlForPortal('landing')
      return
    }

    setViewMode(targetPortal)
    updateUrlForPortal(targetPortal)
  }, [])

  // Check URL on initial load and handle browser back/forward buttons
  useEffect(() => {
    const initialPortal = getPortalFromLocation()
    if (initialPortal !== 'landing') {
      verifyRouteAccess(initialPortal)
    }

    const handlePopState = () => {
      const portal = getPortalFromLocation()
      verifyRouteAccess(portal)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [verifyRouteAccess])

  // If user logs out or session expires, reset viewMode to landing
  useEffect(() => {
    if (!currentUser && viewMode !== 'landing') {
      setViewMode('landing')
      updateUrlForPortal('landing')
    }
  }, [currentUser, viewMode])

  function handleOpenAuth(role = 'rwa') {
    setAuthRole(typeof role === 'string' ? role : 'rwa')
    setAuthNotice(null)
    setAuthOpen(true)
  }

  function handleLoginSuccess(role) {
    const r = (role || '').toLowerCase()
    let target = 'rwa'
    if (r === 'finance' || r === 'finance_clerk') target = 'finance'
    else if (r === 'clerk' || r === 'desk_clerk') target = 'clerk'
    else if (r === 'dept_head' || r === 'department_head') target = 'dept_head'
    else if (r === 'contractor' || r === 'field_contractor') target = 'contractor'

    setViewMode(target)
    updateUrlForPortal(target)
    setAuthOpen(false)
    setAuthNotice(null)
  }

  async function handleSecureLogout() {
    await logout()
    setViewMode('landing')
    updateUrlForPortal('landing')
  }

  return (
    <>
      {/* Session notice banner if redirected from pasted URL */}
      {authNotice && !authOpen && (
        <div
          style={{
            position: 'fixed',
            top: 12,
            right: 12,
            zIndex: 9999,
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            color: '#9a3412',
            padding: '12px 16px',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            maxWidth: 380,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span>🔒 {authNotice}</span>
          <button
            onClick={() => setAuthNotice(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#9a3412',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {viewMode === 'rwa' && (
        <RwaPortal onExitToLanding={handleSecureLogout} />
      )}

      {viewMode === 'finance' && (
        <FinancePortal onExitToLanding={handleSecureLogout} />
      )}

      {viewMode === 'clerk' && (
        <ClerkPortal onExitToLanding={handleSecureLogout} />
      )}

      {viewMode === 'dept_head' && (
        <DeptHeadPortal onExitToLanding={handleSecureLogout} />
      )}

      {viewMode === 'contractor' && (
        <ContractorPortal onExitToLanding={handleSecureLogout} />
      )}

      {viewMode === 'landing' && (
        <div className="page-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Nav
            onOpenAuth={handleOpenAuth}
            currentUser={currentUser}
            onLogout={handleSecureLogout}
            onGoToPortal={() => {
              if (currentUser) {
                const target =
                  currentUser.role === 'FINANCE_CLERK' ? 'finance' :
                  currentUser.role === 'DESK_CLERK' ? 'clerk' :
                  currentUser.role === 'DEPARTMENT_HEAD' ? 'dept_head' :
                  currentUser.role === 'FIELD_CONTRACTOR' ? 'contractor' : 'rwa'
                setViewMode(target)
                updateUrlForPortal(target)
              } else {
                handleOpenAuth()
              }
            }}
          />
          <main style={{ flex: 1 }}>
            <Hero onOpenAuth={handleOpenAuth} />
            <Roles onOpenAuth={handleOpenAuth} />
            <Features />
            <Pricing onOpenAuth={handleOpenAuth} />
            <Contact />
          </main>
          <Footer onOpenAuth={handleOpenAuth} />

          <AuthModal
            isOpen={authOpen}
            onClose={() => {
              setAuthOpen(false)
              setAuthNotice(null)
            }}
            initialRole={authRole}
            onLoginSuccess={handleLoginSuccess}
          />
        </div>
      )}
    </>
  )
}

export default function App() {
  return (
    <TIMSProvider>
      <AppContent />
    </TIMSProvider>
  )
}
