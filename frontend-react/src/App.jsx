import { useState } from 'react'
import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import Features from './components/Features.jsx'
import Workflow from './components/Workflow.jsx'
import Roles from './components/Roles.jsx'
import Pricing from './components/Pricing.jsx'
import Contact from './components/Contact.jsx'
import Footer from './components/Footer.jsx'
import AuthModal from './components/AuthModal.jsx'

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
