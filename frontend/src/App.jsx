import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { TIMSProvider, useTIMS } from './context/TIMSContext.jsx'
import { authApi } from './services/api.js'
import {
  setAppUiField,
  openAuthModal,
  closeAuthModal,
  selectAppUi,
} from './store/auth/authSlice.js'
import ProtectedRoute from './components/common/ProtectedRoute.jsx'
import Nav from './components/landing/Nav.jsx'
import Hero from './components/landing/Hero.jsx'
import Features from './components/landing/Features.jsx'
import Roles from './components/landing/Roles.jsx'
import Pricing from './components/landing/Pricing.jsx'
import Contact from './components/landing/Contact.jsx'
import Footer from './components/landing/Footer.jsx'
import AuthModal from './components/auth/AuthModal.jsx'
import SignUpModal from './components/auth/SignUpModal.jsx'
import RwaPortal from './pages/rwa/index.jsx'
import FinancePortal from './pages/finance/index.jsx'
import ClerkPortal from './pages/clerk/index.jsx'
import DeptHeadPortal from './pages/depthead/index.jsx'
import ContractorPortal from './pages/contractor/index.jsx'
import CooPortal from './pages/coo/CooPortal.jsx'
import SuperAdminPortal from './pages/superadmin/index.jsx'

function LandingView({ onOpenAuth, onOpenSignUp, currentUser, onLogout, onGoToPortal }) {
  return (
    <div className="page-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav
        onOpenAuth={onOpenAuth}
        onOpenSignUp={onOpenSignUp}
        currentUser={currentUser}
        onLogout={onLogout}
        onGoToPortal={onGoToPortal}
      />
      <main style={{ flex: 1 }}>
        <Hero onOpenAuth={onOpenAuth} />
        <Roles onOpenAuth={onOpenAuth} />
        <Features />
        <Pricing onOpenAuth={onOpenAuth} />
        <Contact />
      </main>
      <Footer onOpenAuth={onOpenAuth} />
    </div>
  )
}

function AppContent() {
  const dispatch = useDispatch()
  const { currentUser, logout, setCurrentUser } = useTIMS()
  const navigate = useNavigate()
  const location = useLocation()

  const { authOpen, authRole, authNotice, signUpOpen } = useSelector(selectAppUi)

  // Listen for redirected state from ProtectedRoute
  useEffect(() => {
    if (location.state?.authRequired) {
      dispatch(setAppUiField({
        field: 'authNotice',
        value: `Authentication Required: Please sign in to access the ${location.state.portalName || 'selected portal'}.`,
      }))
      dispatch(setAppUiField({ field: 'authOpen', value: true }))
    }
  }, [location.state, dispatch])

  function handleOpenAuth(role = null) {
    dispatch(openAuthModal(role))
  }

  function handleLoginSuccess(userOrRole) {
    let roleStr = ''
    if (typeof userOrRole === 'string') {
      roleStr = userOrRole
    } else if (userOrRole && typeof userOrRole === 'object') {
      roleStr = userOrRole.role || ''
      if (setCurrentUser) {
        setCurrentUser(userOrRole)
      }
    }
    const r = (roleStr || '').toLowerCase()
    let target = '/rwa'
    if (r === 'finance' || r === 'finance_clerk') target = '/finance'
    else if (r === 'clerk' || r === 'desk_clerk') target = '/clerk'
    else if (r === 'dept_head' || r === 'department_head') target = '/dept-head'
    else if (r === 'contractor' || r === 'field_contractor') target = '/contractor'
    else if (r === 'coo' || r === 'township_coo') target = '/coo'
    else if (r === 'super_admin' || r === 'superadmin') target = '/superadmin'

    dispatch(closeAuthModal())
    navigate(target)
  }

  async function handleSecureLogout() {
    await logout()
    navigate('/')
  }

  function handleGoToPortal() {
    if (currentUser) {
      const r = (currentUser.role || '').toLowerCase()
      let target = '/rwa'
      if (r === 'township_coo') target = '/coo'
      else if (r === 'finance_clerk') target = '/finance'
      else if (r === 'desk_clerk') target = '/clerk'
      else if (r === 'department_head') target = '/dept-head'
      else if (r === 'field_contractor') target = '/contractor'
      else if (r === 'super_admin') target = '/superadmin'
      navigate(target)
    } else {
      handleOpenAuth()
    }
  }

  return (
    <>
      {/* Session notice banner */}
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
            onClick={() => dispatch(setAppUiField({ field: 'authNotice', value: null }))}
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

      {/* Standard React-Router v6+ Routes */}
      <Routes>
        <Route
          path="/"
          element={
            <LandingView
              onOpenAuth={handleOpenAuth}
              onOpenSignUp={() => dispatch(setAppUiField({ field: 'signUpOpen', value: true }))}
              currentUser={currentUser}
              onLogout={handleSecureLogout}
              onGoToPortal={handleGoToPortal}
            />
          }
        />

        <Route
          path="/rwa"
          element={
            <ProtectedRoute allowedRoles={['RWA', 'TOWNSHIP_COO']} portalName="RWA Resident Portal">
              <RwaPortal onExitToLanding={handleSecureLogout} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/clerk"
          element={
            <ProtectedRoute allowedRoles={['DESK_CLERK', 'TOWNSHIP_COO']} portalName="Desk Clerk Triage Portal">
              <ClerkPortal onExitToLanding={handleSecureLogout} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/contractor"
          element={
            <ProtectedRoute allowedRoles={['FIELD_CONTRACTOR', 'TOWNSHIP_COO']} portalName="Contractor Work Portal">
              <ContractorPortal onExitToLanding={handleSecureLogout} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dept-head"
          element={
            <ProtectedRoute allowedRoles={['DEPARTMENT_HEAD', 'TOWNSHIP_COO']} portalName="Department Head Portal">
              <DeptHeadPortal onExitToLanding={handleSecureLogout} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance"
          element={
            <ProtectedRoute allowedRoles={['FINANCE_CLERK', 'TOWNSHIP_COO']} portalName="Finance & Audit Portal">
              <FinancePortal onExitToLanding={handleSecureLogout} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/coo"
          element={
            <ProtectedRoute allowedRoles={['TOWNSHIP_COO']} portalName="Township COO Executive Portal">
              <CooPortal onExitToLanding={handleSecureLogout} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/superadmin"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']} portalName="Platform Super Admin Console">
              <SuperAdminPortal onExitToLanding={handleSecureLogout} />
            </ProtectedRoute>
          }
        />

        {/* Fallback wildcard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Auth Modals */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => dispatch(closeAuthModal())}
        initialRole={authRole}
        onLoginSuccess={handleLoginSuccess}
        onOpenSignUp={() => dispatch(setAppUiField({ field: 'signUpOpen', value: true }))}
      />

      <SignUpModal
        isOpen={signUpOpen}
        onClose={() => dispatch(setAppUiField({ field: 'signUpOpen', value: false }))}
        onOpenLogin={() => {
          dispatch(setAppUiField({ field: 'signUpOpen', value: false }))
          handleOpenAuth()
        }}
        onSignUpSuccess={(newUser) => {
          dispatch(setAppUiField({ field: 'signUpOpen', value: false }))
          handleLoginSuccess(newUser)
        }}
      />
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
