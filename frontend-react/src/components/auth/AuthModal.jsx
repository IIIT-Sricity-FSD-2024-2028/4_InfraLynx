import { useState, useEffect } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'

const ACTOR_ROLES = [
  { id: 'rwa', label: 'RWA Representative', email: 'rwa@infralynx.com', role: 'rwa', badge: 'External' },
  { id: 'contractor', label: 'Field Contractor', email: 'contractor@infralynx.com', role: 'contractor', badge: 'External' },
  { id: 'clerk', label: 'Desk Clerk', email: 'clerk@infralynx.com', role: 'clerk', badge: 'Internal' },
  { id: 'dept_head', label: 'Department Head', email: 'head@infralynx.com', role: 'dept_head', badge: 'Internal' },
  { id: 'finance', label: 'Finance Clerk', email: 'finance@infralynx.com', role: 'finance', badge: 'Internal' },
  { id: 'coo', label: 'Township COO', email: 'coo@infralynx.com', role: 'coo', badge: 'Executive' },
]

export default function AuthModal({ isOpen, onClose, initialRole = 'rwa', onLoginSuccess }) {
  const { login, setCurrentUser, backendStatus } = useTIMS()
  const [selectedRole, setSelectedRole] = useState(initialRole)
  const [formData, setFormData] = useState({
    email: 'rwa@infralynx.com',
    password: 'Password@123',
  })
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const validRole = ACTOR_ROLES.some((r) => r.id === initialRole) ? initialRole : 'rwa'
    const roleObj = ACTOR_ROLES.find((r) => r.id === validRole) || ACTOR_ROLES[0]
    setSelectedRole(validRole)
    setFormData({
      email: roleObj.email,
      password: 'Password@123',
    })
    setErrorMsg(null)
    setSubmitted(false)
    setLoading(false)
  }, [initialRole, isOpen])

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

  function handleRoleChange(roleId) {
    const roleObj = ACTOR_ROLES.find((r) => r.id === roleId) || ACTOR_ROLES[0]
    setSelectedRole(roleId)
    setFormData({
      email: roleObj.email,
      password: 'Password@123',
    })
    setErrorMsg(null)
  }

  function handleDemoBypass() {
    const roleObj = ACTOR_ROLES.find((r) => r.id === selectedRole) || ACTOR_ROLES[0]
    setCurrentUser({
      id: `usr-${selectedRole}-demo`,
      name: roleObj.label,
      email: roleObj.email,
      role: selectedRole,
      sector: 'Sector 4',
      title: roleObj.label,
    })
    setSubmitted(true)
    setTimeout(() => {
      onClose()
      setSubmitted(false)
      if (onLoginSuccess) {
        onLoginSuccess(selectedRole)
      }
    }, 400)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    try {
      // 1. Attempt live login with backend REST API
      await login(formData.email, formData.password)
      setSubmitted(true)

      setTimeout(() => {
        onClose()
        setSubmitted(false)
        setLoading(false)
        if (onLoginSuccess) {
          onLoginSuccess(selectedRole)
        }
      }, 500)
    } catch (err) {
      console.warn('[AuthModal] Live login attempt failed:', err.message)
      setErrorMsg(err.message || 'Authentication error. Database may need connection configuration.')
      setLoading(false)
    }
  }

  const activeRoleInfo = ACTOR_ROLES.find((r) => r.id === selectedRole) || ACTOR_ROLES[0]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content panel-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
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
                    ? `${backendStatus.mode === 'POSTGRESQL' ? 'PostgreSQL' : 'In-Memory RAM'} API Connected`
                    : 'Local Standalone Mode'}
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
            <div style={{ textAlign: 'center', padding: '36px 12px' }}>
              <div
                style={{
                  width: 54,
                  height: 54,
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
                Authenticated Successfully
              </h4>
              <p style={{ marginTop: 6, fontSize: 14, color: 'var(--text-soft)' }}>
                Directing to <strong>{activeRoleInfo.label}</strong> workspace...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Error Banner with One-Click Demo Mode Button */}
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
                    ⚠️ Notice: {errorMsg}
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
                    <span>⚡ Click to Enter Portal in Preview / Demo Mode</span>
                    <span>→</span>
                  </button>
                </div>
              )}

              {/* Select Actor Role Dropdown */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label htmlFor="role-select" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    Select Actor Role
                  </label>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--primary-dark)',
                      fontWeight: 600,
                      background: 'var(--primary-subtle)',
                      padding: '2px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {activeRoleInfo.badge} ACCESS
                  </span>
                </div>

                <div style={{ position: 'relative' }}>
                  <select
                    id="role-select"
                    value={selectedRole}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    style={{
                      ...inputStyle,
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      paddingRight: 36,
                      fontWeight: 600,
                      color: 'var(--text)',
                      cursor: 'pointer',
                      background: '#ffffff',
                    }}
                  >
                    {ACTOR_ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <div
                    style={{
                      position: 'absolute',
                      right: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: 'var(--primary-dark)',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    ▼
                  </div>
                </div>

                {/* Role detail highlight */}
                <div
                  style={{
                    marginTop: 6,
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: '#f8faf8',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: 'var(--text-soft)',
                  }}
                >
                  <span>
                    Workspace: <strong>{activeRoleInfo.label}</strong>
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--primary-darker)' }}>
                    {activeRoleInfo.email}
                  </span>
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="auth-email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                  Official Registered Email / Username
                </label>
                <input
                  id="auth-email"
                  type="text"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={inputStyle}
                />
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label htmlFor="auth-password" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    Security Password
                  </label>
                  <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
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
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="button button-primary"
                style={{
                  marginTop: 4,
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
                  <span>Verifying Credentials...</span>
                ) : (
                  <>
                    <span>Sign In as {activeRoleInfo.label}</span>
                    <span>→</span>
                  </>
                )}
              </button>

              {/* Direct Demo Link */}
              <div style={{ textAlign: 'center', marginTop: 2 }}>
                <button
                  type="button"
                  onClick={handleDemoBypass}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-dark)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  ⚡ Or click here to explore {activeRoleInfo.label} Portal directly
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
}
