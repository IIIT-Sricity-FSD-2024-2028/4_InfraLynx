export default function Footer({ onOpenAuth }) {
  return (
    <footer
      style={{
        background: '#ffffff',
        borderTop: '1px solid var(--line)',
        padding: '56px 0 32px',
        color: 'var(--text-soft)',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 1fr 1.2fr',
            gap: 40,
            marginBottom: 44,
          }}
          className="footer-grid"
        >
          {/* Brand & Mission */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <img
                src="/assets/CRIMS_logo.png"
                alt="TIMS logo"
                style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'contain' }}
              />
              <span style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
                TIMS
              </span>
            </div>

            <p style={{ fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.6, maxWidth: 340 }}>
              Township-level infrastructure operating system governing the complete lifecycle:
              reporting, validation, AMC estimation, threshold approvals, contractor execution,
              and resident sign-off.
            </p>

            <div style={{ marginTop: 18 }}>
              <button
                type="button"
                onClick={onOpenAuth}
                className="button button-primary"
                style={{ padding: '8px 18px', fontSize: 13 }}
              >
                Official Sign In
              </button>
            </div>
          </div>

          {/* Platform Core */}
          <div>
            <h4 style={{ fontSize: 13, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14, fontWeight: 700 }}>
              Platform Core
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5 }}>
              <li><a href="#workflow" className="footer-link">14-Step Workflow</a></li>
              <li><a href="#roles" className="footer-link">7 Actor Roles</a></li>
              <li><a href="#modules" className="footer-link">13 Core Modules</a></li>
              <li><a href="#pricing" className="footer-link">Subscription Plans</a></li>
              <li><a href="#contact" className="footer-link">Municipal Contact</a></li>
            </ul>
          </div>

          {/* Actor Workspaces */}
          <div>
            <h4 style={{ fontSize: 13, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14, fontWeight: 700 }}>
              Actor Workspaces
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5 }}>
              <li><a href="#roles" onClick={() => onOpenAuth('rwa')} className="footer-link">RWA Resident Portal</a></li>
              <li><a href="#roles" onClick={() => onOpenAuth('contractor')} className="footer-link">Field Contractor Console</a></li>
              <li><a href="#roles" onClick={() => onOpenAuth('clerk')} className="footer-link">Desk Clerk Triage</a></li>
              <li><a href="#roles" onClick={() => onOpenAuth('dept_head')} className="footer-link">Department Head Desk</a></li>
              <li><a href="#roles" onClick={() => onOpenAuth('finance')} className="footer-link">Finance & Billing Audit</a></li>
              <li><a href="#roles" onClick={() => onOpenAuth('coo')} className="footer-link">Township COO Authority</a></li>
            </ul>
          </div>

          {/* Scope Boundary & Standards */}
          <div>
            <h4 style={{ fontSize: 13, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14, fontWeight: 700 }}>
              Governance Standards
            </h4>
            <div
              style={{
                background: 'var(--surface-muted)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-sm)',
                padding: 14,
                fontSize: 12.5,
                color: 'var(--text-soft)',
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: 'var(--primary-dark)' }}>Scope Boundary:</strong> Built on Annual Maintenance Contracts (AMCs) with predefined contractor rates rather than township-owned inventory.
            </div>

            <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span className="badge-eyebrow" style={{ fontSize: 10.5, padding: '3px 8px' }}>
                ISO 27001
              </span>
              <span className="badge-eyebrow" style={{ fontSize: 10.5, padding: '3px 8px' }}>
                Smart City Ready
              </span>
              <span className="badge-eyebrow" style={{ fontSize: 10.5, padding: '3px 8px' }}>
                RBAC Audit Guard
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid var(--line)',
            paddingTop: 22,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            fontSize: 13,
          }}
        >
          <div>
            © {new Date().getFullYear()} TIMS — Township Infrastructure Management System.
          </div>
          <div style={{ display: 'flex', gap: 20, color: 'var(--text-soft)' }}>
            <span>Section 1–17 Specification Compliant</span>
            <span>Zero Unverified Invoices</span>
          </div>
        </div>
      </div>

      <style>{`
        .footer-link {
          color: var(--text-soft);
          transition: color 0.18s ease;
        }
        .footer-link:hover {
          color: var(--primary-dark);
        }
        @media (max-width: 900px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 560px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  )
}
