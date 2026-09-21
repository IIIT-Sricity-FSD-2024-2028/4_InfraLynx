import { useState } from 'react'

export default function Contact() {
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    township: '',
    sectors: '5 to 15 Sectors',
    email: '',
    domain: 'All Municipal Departments',
    message: '',
  })

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <section id="contact" className="section" style={{ background: '#ffffff' }}>
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '0.85fr 1.15fr',
            gap: 56,
            alignItems: 'start',
          }}
          className="contact-grid"
        >
          {/* Left: Contact Info */}
          <div>
            <div className="badge-eyebrow" style={{ marginBottom: 14 }}>
              Municipal Advisory
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 3.8vw, 40px)', color: 'var(--text)' }}>
              Bring TIMS to Your Township
            </h2>
            <p style={{ marginTop: 14, fontSize: 16, color: 'var(--text-soft)', lineHeight: 1.65 }}>
              Speak directly with our smart township deployment engineers. We assist with sector
              boundary mapping, asset GIS onboarding, and digitizing existing AMC rate cards.
            </p>

            <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={iconBoxStyle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Official Inquiries</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>advisory@tims-infra.gov.in</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={iconBoxStyle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-dark)" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Operations Desk</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>+91 (080) 4192-8000</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={iconBoxStyle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Operations Center</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Urban Services Command Hub, Andhra Pradesh, IN</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Consultation Form */}
          <div
            className="panel-card"
            style={{
              padding: 36,
              border: '1px solid var(--line-strong)',
              background: 'var(--surface)',
            }}
          >
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '48px 16px' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'var(--primary-subtle)',
                    color: 'var(--primary-dark)',
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto 18px',
                    fontSize: 26,
                    fontWeight: 700,
                  }}
                >
                  ✓
                </div>
                <h3 style={{ fontSize: 22, color: 'var(--text)' }}>
                  Inquiry Registered
                </h3>
                <p style={{ marginTop: 8, fontSize: 15, color: 'var(--text-soft)', maxWidth: 420, margin: '8px auto 0' }}>
                  Thank you, <strong>{formData.name || 'Officer'}</strong>. A TIMS municipal implementation
                  specialist will reach out with an onboarding overview.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="button button-secondary"
                  style={{ marginTop: 22, fontSize: 13 }}
                >
                  Submit Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Officer / Representative Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. S. Venkatraman"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={fieldStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Designation</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dept Head / Officer"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      style={fieldStyle}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Township / Municipal Entity</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sri City Zone 2"
                      value={formData.township}
                      onChange={(e) => setFormData({ ...formData, township: e.target.value })}
                      style={fieldStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Scale (Sectors)</label>
                    <select
                      value={formData.sectors}
                      onChange={(e) => setFormData({ ...formData, sectors: e.target.value })}
                      style={fieldStyle}
                    >
                      <option value="1 to 4 Sectors">1 to 4 Sectors</option>
                      <option value="5 to 15 Sectors">5 to 15 Sectors</option>
                      <option value="16 to 40 Sectors">16 to 40 Sectors</option>
                      <option value="40+ Metropolitan">40+ Metropolitan</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Official Email</label>
                    <input
                      type="email"
                      required
                      placeholder="officer@municipal.gov.in"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={fieldStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Priority Department</label>
                    <select
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      style={fieldStyle}
                    >
                      <option value="All Municipal Departments">All (Civil, Electrical, Water)</option>
                      <option value="Civil Infrastructure Only">Civil Infrastructure Only</option>
                      <option value="Electrical & Power Only">Electrical & Power Only</option>
                      <option value="Water & Drainage Only">Water & Drainage Only</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Township Requirements / AMC Scope</label>
                  <textarea
                    rows={3}
                    placeholder="Briefly describe your active contractor base, current bottlenecks, or target rollout timeline..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    style={{ ...fieldStyle, resize: 'vertical' }}
                  />
                </div>

                <button
                  type="submit"
                  className="button button-primary"
                  style={{
                    padding: '13px',
                    fontSize: 15,
                    fontWeight: 700,
                    width: '100%',
                    marginTop: 4,
                  }}
                >
                  Submit Deployment Request
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .contact-grid {
            grid-template-columns: 1fr !important;
            gap: 36px !important;
          }
        }
      `}</style>
    </section>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--text)',
  marginBottom: 6,
}

const fieldStyle = {
  width: '100%',
  padding: '10px 12px',
  background: '#ffffff',
  border: '1px solid var(--line-strong)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
}

const iconBoxStyle = {
  width: 40,
  height: 40,
  borderRadius: 8,
  background: 'var(--surface-muted)',
  border: '1px solid var(--line)',
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
}
