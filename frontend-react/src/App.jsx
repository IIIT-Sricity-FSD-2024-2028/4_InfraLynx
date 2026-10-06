import { useState } from 'react'
import { TIMSProvider } from './context/TIMSContext.jsx'
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

export default function App() {
  const [authOpen, setAuthOpen] = useState(false)
  const [authRole, setAuthRole] = useState('rwa')
  // viewMode: 'landing' | 'rwa' | 'finance' | 'clerk' | 'dept_head' | 'contractor'
  const [viewMode, setViewMode] = useState('landing')

  function handleOpenAuth(role = 'rwa') {
    setAuthRole(typeof role === 'string' ? role : 'rwa')
    setAuthOpen(true)
  }

  function handleLoginSuccess(role) {
    const r = (role || '').toLowerCase()
    if (r === 'rwa') {
      setViewMode('rwa')
    } else if (r === 'finance' || r === 'finance_clerk') {
      setViewMode('finance')
    } else if (r === 'clerk' || r === 'desk_clerk') {
      setViewMode('clerk')
    } else if (r === 'dept_head' || r === 'department_head') {
      setViewMode('dept_head')
    } else if (r === 'contractor' || r === 'field_contractor') {
      setViewMode('contractor')
    } else {
      setViewMode('rwa') // Default to RWA portal on successful authentication
    }
    setAuthOpen(false)
  }

  return (
    <TIMSProvider>
      {viewMode === 'rwa' && (
        <RwaPortal onExitToLanding={() => setViewMode('landing')} />
      )}

      {viewMode === 'finance' && (
        <FinancePortal onExitToLanding={() => setViewMode('landing')} />
      )}

      {viewMode === 'clerk' && (
        <ClerkPortal onExitToLanding={() => setViewMode('landing')} />
      )}

      {viewMode === 'dept_head' && (
        <DeptHeadPortal onExitToLanding={() => setViewMode('landing')} />
      )}

      {viewMode === 'contractor' && (
        <ContractorPortal onExitToLanding={() => setViewMode('landing')} />
      )}

      {viewMode === 'landing' && (
        <div className="page-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Nav
            onOpenAuth={handleOpenAuth}
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
            onClose={() => setAuthOpen(false)}
            initialRole={authRole}
            onLoginSuccess={handleLoginSuccess}
          />
        </div>
      )}
    </TIMSProvider>
  )
}
