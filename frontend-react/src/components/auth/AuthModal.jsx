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
  if (r === 'TOWNSHIP_COO') return 'dept_head'

  // Intelligent fallback from email pattern
  const em = (email || '').toLowerCase()
  if (em.includes('clerk') || em.includes('pooja')) return 'clerk'
  if (em.includes('head') || em.includes('sandeep') || em.includes('dept')) return 'dept_head'
  if (em.includes('contractor') || em.includes('vikram') || em.includes('voltech') || em.includes('apex')) return 'contractor'
  if (em.includes('finance') || em.includes('sunil')) return 'finance'
  if (em.includes('coo')) return 'dept_head'
  return 'rwa'
}

function getPortalTitle(portalKey) {
  switch (portalKey) {
    case 'clerk': return 'Desk Clerk Portal'
    case 'dept_head': return 'Department Head Workspace'
    case 'contractor': return 'Contractor Management'
    case 'finance': return 'Finance & Audit Console'
    case 'rwa': return 'RWA Representative Portal'
    default: return 'Township Portal'
  }
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
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
  }, [isOpen])

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

  function handleDemoBypass() {
    const portal = mapRoleToPortal(null, formData.email)
    const displayName = formData.email.split('@')[0]
    setCurrentUser({
      id: `usr-${portal}-demo`,
      name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
      email: formData.email,
      role: portal,
      sector: 'Sector 4',
      title: getPortalTitle(portal),
    })
    setDetectedPortal(portal)
    setDetectedUserName(displayName)
    setSubmitted(true)
    setTimeout(() => {
      onClose()
      setSubmitted(false)
      if (onLoginSuccess) {
        onLoginSuccess(portal)
      }
    }, 450)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    try {
      const result = await login(formData.email.trim(), formData.password)
      const user = result?.user
      const portal = mapRoleToPortal(user?.role, formData.email)
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
      setErrorMsg(err.message || 'Invalid email or password.')
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: backendStatus.connected ? '#16a34a' : '#ea580c',
                  }}
                />
                <p style={{ fontSize: 12, color: 'var(--text-soft)', margin: 0 }}>
                  {backendStatus.connected
                    ? `${backendStatus.database || 'Live'} API Connected`
                    : 'Standalone / Local Engine'}
                </p>
              </div>
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
                  <button
                    type="button"
                    onClick={handleDemoBypass}
                    style={{
                      marginTop: 8,
                      width: '100%',
                      padding: '8px 12px',
                      background: '#ea580c',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <span>⚡ Enter in Demo / Standalone Mode</span>
                    <span>→</span>
                  </button>
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
                  placeholder="e.g. clerk@infralynx.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={inputStyle}
                  autoComplete="username"
                />
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 5 }}>
                  The system automatically detects your department and role from your credentials.
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label
                    htmlFor="auth-password"
                    style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}
                  >
                    Password
                  </label>
                  <span style={{ fontSize: 11.5, color: 'var(--text-soft)' }}>
                    Default: <code>Password@123</code>
                  </span>
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
                  <span>Authenticating & Detecting Role...</span>
                ) : (
                  <>
                    <span>Sign In to System</span>
                    <span>→</span>
                  </>
                )}
              </button>

              {/* Quick Fill Test Accounts Pills */}
              <div
                style={{
                  marginTop: 10,
                  padding: '12px 14px',
                  background: '#f8faf8',
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-soft)', marginBottom: 8 }}>
                  QUICK PREFILL ACCOUNTS (CLICK TO TEST):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    { label: 'Desk Clerk', email: 'clerk@infralynx.com' },
                    { label: 'Dept Head', email: 'head@infralynx.com' },
                    { label: 'Contractor', email: 'contractor@infralynx.com' },
                    { label: 'RWA Rep', email: 'rwa@infralynx.com' },
                    { label: 'Finance', email: 'finance@infralynx.com' },
                  ].map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => setFormData({ ...formData, email: acc.email })}
                      style={{
                        padding: '4px 8px',
                        fontSize: 11.5,
                        borderRadius: 4,
                        border: '1px solid var(--line-strong)',
                        background: formData.email === acc.email ? 'var(--primary-subtle)' : '#ffffff',
                        color: formData.email === acc.email ? 'var(--primary-darker)' : 'var(--text-soft)',
                        fontWeight: formData.email === acc.email ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {acc.label}
                    </button>
                  ))}
                </div>
              </div>
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

