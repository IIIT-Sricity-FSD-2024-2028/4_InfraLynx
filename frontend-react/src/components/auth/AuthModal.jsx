import { useState, useEffect } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'

// Helper to map DB roles and emails to frontend portal keys
function mapRoleToPortal(role, email = '') {
  const r = (role || '').toUpperCase()
  if (r === 'DESK_CLERK') return 'clerk'
  if (r === 'DEPARTMENT_HEAD') return 'dept_head'
  if (r === 'FIELD_CONTRACTOR') return 'contractor'
  if (r === 'FINANCE_CLERK') return 'finance'
  if (r === 'RWA') return 'rwa'
  if (r === 'TOWNSHIP_COO') return 'coo'

  // Intelligent fallback from email pattern
  const em = (email || '').toLowerCase()
  if (em.includes('clerk') || em.includes('pooja')) return 'clerk'
  if (em.includes('coo') || em.includes('dewan')) return 'coo'
  if (em.includes('head') || em.includes('sandeep') || em.includes('dept')) return 'dept_head'
  if (em.includes('contractor') || em.includes('vikram') || em.includes('voltech') || em.includes('apex')) return 'contractor'
  if (em.includes('finance') || em.includes('sunil')) return 'finance'
  return 'rwa'
}

function getPortalTitle(portalKey) {
  switch (portalKey) {
    case 'clerk': return 'Desk Clerk Portal'
    case 'dept_head': return 'Department Head Workspace'
    case 'contractor': return 'Contractor Management'
    case 'finance': return 'Finance & Audit Console'
    case 'rwa': return 'RWA Representative Portal'
    case 'coo': return 'Township COO Directorate'
    default: return 'Township Portal'
  }
}

export default function AuthModal({ isOpen, onClose, initialRole, onLoginSuccess }) {
  const { login, setCurrentUser, backendStatus } = useTIMS()
  const [formData, setFormData] = useState({
    email: 'rwa@infralynx.com',
    password: 'Password@123',
  })
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [detectedPortal, setDetectedPortal] = useState('rwa')
  const [detectedUserName, setDetectedUserName] = useState('')

  useEffect(() => {
    setErrorMsg(null)
    setSubmitted(false)
    setLoading(false)

    if (initialRole) {
      const r = initialRole.toLowerCase()
      let email = 'rwa@infralynx.com'
      if (r === 'coo') email = 'coo@infralynx.com'
      else if (r === 'finance') email = 'finance@infralynx.com'
      else if (r === 'clerk') email = 'clerk@infralynx.com'
      else if (r === 'dept_head' || r === 'depthead') email = 'head@infralynx.com'
      else if (r === 'contractor') email = 'contractor@infralynx.com'
      setFormData({ email, password: 'Password@123' })
    }
  }, [isOpen, initialRole])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  function handleQuickFill(email) {
    setFormData({
      email,
      password: 'Password@123',
    })
    setErrorMsg(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    const trimmedEmail = (formData.email || '').trim()
    const password = formData.password || ''

    if (!trimmedEmail || !password) {
      setErrorMsg('Please enter both email and password.')
      setLoading(false)
      return
    }

    try {
      const result = await login(trimmedEmail, password)
      const user = result?.user
      const portal = mapRoleToPortal(user?.role, trimmedEmail)
      setDetectedPortal(portal)
      setDetectedUserName(user?.name || user?.email || 'Authorized User')
      setSubmitted(true)

      setTimeout(() => {
        onClose()
        setSubmitted(false)
        setLoading(false)
        if (onLoginSuccess) {
          onLoginSuccess(portal)
        }
      }, 500)
    } catch (err) {
      console.warn('[AuthModal] Login attempt failed:', err.message)
      setErrorMsg(err.message || 'Invalid email or password. Please verify your credentials.')
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content panel-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 460,
          background: '#ffffff',
          border: '1px solid rgba(22, 101, 52, 0.22)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.18)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '22px 26px 18px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, #f8faf8 0%, #ffffff 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: 'var(--primary-dark)',
                color: '#ffffff',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800,
                fontSize: 16,
              }}
            >
              TL
            </div>
            <div>
              <h3 style={{ fontSize: 18, color: 'var(--text)', margin: 0, fontWeight: 700, fontFamily: 'var(--font-head)' }}>
                Official Portal Sign In
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: 'none',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--text-soft)',
              background: 'rgba(22, 101, 52, 0.06)',
              fontSize: 15,
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
          >
            ✕
          </button>
        </div>

        {/* Form Content */}
        <div style={{ padding: '24px 26px 28px' }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '32px 12px' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'var(--primary-subtle)',
                  color: 'var(--primary-dark)',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 16px',
                  fontSize: 24,
                  fontWeight: 700,
                }}
              >
                ✓
              </div>
              <h4 style={{ fontSize: 19, color: 'var(--text)', fontFamily: 'var(--font-head)' }}>
                Welcome, {detectedUserName || 'Authorized User'}
              </h4>
              <p style={{ marginTop: 6, fontSize: 14, color: 'var(--text-soft)' }}>
                Auto-detected role: <strong>{getPortalTitle(detectedPortal)}</strong>. Directing now...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Error Notice */}
              {errorMsg && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: '#fff7ed',
                    border: '1px solid #ffedd5',
                    color: '#9a3412',
                    fontSize: 13,
                    lineHeight: 1.4,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    ⚠️ {errorMsg}
                  </div>
                  <div style={{ fontSize: 12, color: '#7c2d12', marginTop: 4 }}>
                    Quick-select official account credentials:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {[
                      { label: 'RWA', email: 'rwa@infralynx.com' },
                      { label: 'Clerk', email: 'clerk@infralynx.com' },
                      { label: 'Dept Head', email: 'head@infralynx.com' },
                      { label: 'Contractor', email: 'contractor@infralynx.com' },
                      { label: 'Finance', email: 'finance@infralynx.com' },
                      { label: 'Township COO', email: 'coo@infralynx.com' },
                    ].map((acc) => (
                      <button
                        key={acc.label}
                        type="button"
                        onClick={() => handleQuickFill(acc.email)}
                        style={{
                          padding: '4px 8px',
                          background: '#fff',
                          border: '1px solid #fdba74',
                          borderRadius: 4,
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: '#9a3412',
                        }}
                      >
                        {acc.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Single Official Email Entry */}
              <div>
                <label
                  htmlFor="auth-email"
                  style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}
                >
                  Official Registered Email or Username
                </label>
                <input
                  id="auth-email"
                  type="text"
                  required
                  placeholder="e.g. name@infralynx.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={inputStyle}
                  autoComplete="username"
                />
              </div>

              {/* Password */}
              <div>
                <div style={{ marginBottom: 6 }}>
                  <label
                    htmlFor="auth-password"
                    style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}
                  >
                    Password
                  </label>
                </div>
                <input
                  id="auth-password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={inputStyle}
                  autoComplete="current-password"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="button button-primary"
                style={{
                  marginTop: 6,
                  padding: '12px',
                  fontSize: 14.5,
                  fontWeight: 700,
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In to System</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  background: '#ffffff',
  border: '1px solid var(--line-strong)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
}

