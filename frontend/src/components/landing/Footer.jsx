export default function Footer() {
  return (
    <footer
      style={{
        background: '#ffffff',
        borderTop: '1px solid var(--line)',
        padding: '48px 0 28px',
        color: 'var(--text-soft)',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 36,
            marginBottom: 36,
          }}
        >
          {/* Brand & Summary */}
          <div style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <img
                src="/assets/CRIMS_logo.png"
                alt="TIMS logo"
                style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'contain' }}
              />
              <span style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
                TIMS
              </span>
            </div>

            <p style={{ fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.6, margin: 0 }}>
              Township Infrastructure Management System — unifying civic complaints, AMC-governed contractor execution,
              and cross-departmental operations on a single accountable platform.
            </p>
          </div>

          {/* Quick Links */}
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            <div>
              <h4 style={{ fontSize: 13, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, fontWeight: 700 }}>
                Navigation
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, padding: 0, margin: 0, fontSize: 13.5 }}>
                <li><a href="#roles" className="footer-link">7 Actor Roles</a></li>
                <li><a href="#modules" className="footer-link">Core Modules</a></li>
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize: 13, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, fontWeight: 700 }}>
                Departments
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, padding: 0, margin: 0, fontSize: 13.5 }}>
                <li>Civil & Road Works</li>
                <li>Electrical & Power</li>
                <li>Water & Sanitation</li>
                <li>Horticulture</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid var(--line)',
            paddingTop: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 12.5,
            color: 'var(--text-muted)',
          }}
        >
          <div>
            © {new Date().getFullYear()} InfraLynx TIMS · All rights reserved.
          </div>
          <div>
            Township Infrastructure Lifecycle Platform
          </div>
        </div>
      </div>

      <style>{`
        .footer-link {
          color: var(--text-soft);
          text-decoration: none;
          transition: color 0.18s ease;
        }
        .footer-link:hover {
          color: var(--primary-dark);
        }
      `}</style>
    </footer>
  )
}
