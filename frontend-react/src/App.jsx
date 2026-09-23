import { useState } from 'react'
import { TIMSProvider } from './context/TIMSContext.jsx'
import Nav from './components/landing/Nav.jsx'
import Hero from './components/landing/Hero.jsx'
import Features from './components/landing/Features.jsx'
import Workflow from './components/landing/Workflow.jsx'
import Roles from './components/landing/Roles.jsx'
import Pricing from './components/landing/Pricing.jsx'
import Contact from './components/landing/Contact.jsx'
import Footer from './components/landing/Footer.jsx'
import AuthModal from './components/auth/AuthModal.jsx'
import RwaPortal from './pages/rwa/index.jsx'

export default function App() {
  const [authOpen, setAuthOpen] = useState(false)
  const [authRole, setAuthRole] = useState('rwa')
  const [viewMode, setViewMode] = useState('landing') // 'landing' | 'rwa'

  function handleOpenAuth(role = 'rwa') {
    setAuthRole(typeof role === 'string' ? role : 'rwa')
    setAuthOpen(true)
  }

  function handleLoginSuccess(role) {
    if (role === 'rwa') {
      setViewMode('rwa')
    }
  }

  return (
    <TIMSProvider>
      {viewMode === 'rwa' ? (
        <RwaPortal onExitToLanding={() => setViewMode('landing')} />
      ) : (
        <div className="page-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Nav
            onOpenAuth={handleOpenAuth}
            onOpenRwaPortal={() => setViewMode('rwa')}
          />
          <main style={{ flex: 1 }}>
            <Hero onOpenAuth={handleOpenAuth} />
            <Workflow />
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

