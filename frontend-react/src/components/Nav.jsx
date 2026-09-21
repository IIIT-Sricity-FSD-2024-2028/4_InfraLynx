export default function Nav() {
  return (
    <header style={{ borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, background: 'var(--paper)', zIndex: 10 }}>
      <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>
          TIMS
        </div>
        <nav style={{ display: 'flex', gap: 28, fontSize: 14.5, fontWeight: 500 }} className="nav-links">
          <a href="#modules">Modules</a>
          <a href="#workflow">Workflow</a>
          <a href="#roles">Who it's for</a>
          <a href="#pricing">Pricing</a>
          <a href="#contact">Contact</a>
        </nav>
        <a href="#contact" className="btn btn-primary" style={{ padding: '10px 18px', fontSize: 14 }}>
          Request a demo
        </a>
      </div>
      <style>{`
        @media (max-width: 780px) {
          .nav-links { display: none; }
        }
      `}</style>
    </header>
  )
}
