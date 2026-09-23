import { useState } from 'react'
import Nav from './components/landing/Nav.jsx'
import Hero from './components/landing/Hero.jsx'
import Features from './components/landing/Features.jsx'
import Workflow from './components/landing/Workflow.jsx'
import Roles from './components/landing/Roles.jsx'
import Pricing from './components/landing/Pricing.jsx'
import Contact from './components/landing/Contact.jsx'
import Footer from './components/landing/Footer.jsx'
import AuthModal from './components/auth/AuthModal.jsx'

export default function App() {
  const [authOpen, setAuthOpen] = useState(false)
  const [authRole, setAuthRole] = useState('rwa')

  function handleOpenAuth(role = 'rwa') {
    setAuthRole(typeof role === 'string' ? role : 'rwa')
    setAuthOpen(true)
  }

  return (
    <div className="page-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav onOpenAuth={handleOpenAuth} />
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
      />
    </div>
  )
}
