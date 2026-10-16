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
  if (r === 'SUPER_ADMIN') return 'superadmin'

  // Intelligent fallback from email pattern
  const em = (email || '').toLowerCase()
  if (em.includes('clerk') || em.includes('pooja')) return 'clerk'
  if (em.includes('coo') || em.includes('dewan')) return 'coo'
  if (em.includes('head') || em.includes('sandeep') || em.includes('dept')) return 'dept_head'
  if (
    em.includes('contractor') ||
    em.includes('vikram') ||
    em.includes('rathore') ||
    em.includes('rameshwar') ||
    em.includes('sharma') ||
    em.includes('suresh') ||
    em.includes('kulkarni') ||
    em.includes('gurpreet') ||
    em.includes('sandhu') ||
    em.includes('voltech')
  ) {
    return 'contractor'
  }
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
    case 'superadmin': return 'Super Admin Console'
    default: return 'Township Portal'
  }
}

// Client-side field validation helper
function validateField(name, value) {
  if (name === 'email') {
    const val = (value || '').trim()
    if (!val) return 'Official registered email is required.'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(val)) return 'Please enter a valid email address (e.g. name@infralynx.com).'
    return ''
  }
  if (name === 'password') {
    if (!value) return 'Password is required.'
    if (value.length < 6) return 'Password must be at least 6 characters.'
    return ''
  }
  return ''
}

export default function AuthModal({ isOpen, onClose, initialRole, onLoginSuccess, onOpenSignUp }) {
  const { login } = useTIMS()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [detectedPortal, setDetectedPortal] = useState('rwa')
  const [detectedUserName, setDetectedUserName] = useState('')

  useEffect(() => {
    // Reset all form fields, errors, and validation states on open/close
    setErrorMsg(null)
    setErrors({})
    setTouched({})
    setSubmitted(false)
    setLoading(false)
    setFormData({ email: '', password: '' })
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

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }))
    }
    if (errorMsg) setErrorMsg(null)
  }

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setErrors((prev) => ({ ...prev, [field]: validateField(field, formData[field]) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const emailErr = validateField('email', formData.email)
    const passErr = validateField('password', formData.password)

    setTouched({ email: true, password: true })
    setErrors({ email: emailErr, password: passErr })

    if (emailErr || passErr) {
      return
    }

    setLoading(true)
    setErrorMsg(null)

    // Normalize identifier: trimmed, and if email lowercase (RFC 5321 standard)
    // Passwords remain strictly case-sensitive for maximum security
    const rawIdentifier = (formData.email || '').trim()
    const trimmedIdentifier = rawIdentifier.includes('@') ? rawIdentifier.toLowerCase() : rawIdentifier
    const password = formData.password || ''

    try {
      const result = await login(trimmedIdentifier, password)
      const user = result?.user
      const portal = mapRoleToPortal(user?.role, trimmedIdentifier)
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
      const rawMsg = err.message || ''
      if (rawMsg.toLowerCase().includes('not found') || rawMsg.toLowerCase().includes('user not found')) {
        setErrorMsg('Email or Password incorrect')
      } else {
        setErrorMsg('Email or Password incorrect')
      }
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
            <form onSubmit={handleSubmit} noValidate autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Error Notice */}
              {errorMsg && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    fontSize: 13,
                    lineHeight: 1.4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <div style={{ fontWeight: 600 }}>{errorMsg}</div>
                </div>
              )}

              {/* Single Official Email Entry */}
              <div>
                <label
                  htmlFor="auth-email"
                  style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}
                >
                  Official Registered Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  disabled={loading}
                  placeholder="name@infralynx.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  style={{
                    ...inputStyle,
                    borderColor: errors.email && touched.email ? '#ef4444' : 'var(--line-strong)',
                    background: loading ? '#f8fafc' : '#ffffff',
                  }}
                  autoComplete="off"
                />
                {errors.email && touched.email && (
                  <span style={{ display: 'block', color: '#dc2626', fontSize: 12, marginTop: 4, fontWeight: 500 }}>
                    {errors.email}
                  </span>
                )}
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
                  disabled={loading}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  style={{
                    ...inputStyle,
                    borderColor: errors.password && touched.password ? '#ef4444' : 'var(--line-strong)',
                    background: loading ? '#f8fafc' : '#ffffff',
                  }}
                  autoComplete="new-password"
                />

                {errors.password && touched.password && (
                  <span style={{ display: 'block', color: '#dc2626', fontSize: 12, marginTop: 4, fontWeight: 500 }}>
                    {errors.password}
                  </span>
                )}
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

              <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--text-soft)' }}>
                New township?{' '}
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    if (onOpenSignUp) onOpenSignUp()
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#15803d',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Sign Up as Township COO
                </button>
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
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease',
}
