import { useState, useEffect } from 'react'

const ACTOR_ROLES = [
  { id: 'rwa', label: 'RWA Representative', domain: 'Public Liaison', badge: 'External' },
  { id: 'contractor', label: 'Field Contractor', domain: 'AMC Work Orders', badge: 'External' },
  { id: 'clerk', label: 'Desk Clerk', domain: 'Triage & Routing', badge: 'Internal' },
  { id: 'dept_head', label: 'Department Head', domain: 'Dept Approvals', badge: 'Internal' },
  { id: 'finance', label: 'Finance Clerk', domain: 'AMC Invoice Audit', badge: 'Internal' },
  { id: 'coo', label: 'Township COO', domain: 'Executive Authority', badge: 'Executive' },
  { id: 'admin', label: 'System Administrator', domain: 'RBAC & Config', badge: 'Admin' },
]

export default function AuthModal({ isOpen, onClose, initialRole = 'rwa' }) {
  const [selectedRole, setSelectedRole] = useState(initialRole)
  const [formData, setFormData] = useState({
    email: 'rwa@township-infra.gov.in',
    password: '••••••••••••',
  })
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (initialRole) {
      setSelectedRole(initialRole)
      setFormData({
        email: `${initialRole}@township-infra.gov.in`,
        password: '••••••••••••',
      })
    }
    setSubmitted(false)
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

  function handleRoleClick(roleId) {
    setSelectedRole(roleId)
    setFormData({
      email: `${roleId}@township-infra.gov.in`,
      password: '••••••••••••',
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => {
      setTimeout(() => {
        onClose()
        setSubmitted(false)
      }, 1200)
    }, 800)
  }

  const activeRoleInfo = ACTOR_ROLES.find((r) => r.id === selectedRole) || ACTOR_ROLES[0]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content panel-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#ffffff',
          border: '1px solid rgba(22, 101, 52, 0.22)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px 20px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, #f8faf8 0%, #ffffff 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src="/assets/CRIMS_logo.png"
              alt="CRIMS logo"
              style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain' }}
            />
            <div>
              <h3 style={{ fontSize: 18, color: 'var(--text)', margin: 0 }}>
                Official Portal Sign In
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: '2px 0 0' }}>
                Township Infrastructure Management Platform
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              display: 'grid',
              placeItems: 'center',
              color: 'var(--text-soft)',
              background: 'rgba(22, 101, 52, 0.06)',
              fontSize: 15,
            }}
          >
            ✕
          </button>
        </div>

        {/* Form Content */}
        <div style={{ padding: '24px 28px 30px' }}>
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
              <h4 style={{ fontSize: 19, color: 'var(--text)' }}>
                Authenticated Successfully
              </h4>
              <p style={{ marginTop: 6, fontSize: 14, color: 'var(--text-soft)' }}>
                Directing to <strong>{activeRoleInfo.label}</strong> workspace...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Select Actor Role */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    Select Your Actor Role
                  </label>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--primary-dark)', fontWeight: 600 }}>
                    {activeRoleInfo.badge} ACCESS
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: 6,
                    padding: 4,
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-sm)',
                    background: '#f8faf8',
                  }}
                >
                  {ACTOR_ROLES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleRoleClick(r.id)}
                      style={{
                        padding: '7px 8px',
                        borderRadius: 6,
                        fontSize: 12,
                        textAlign: 'left',
                        fontWeight: selectedRole === r.id ? 700 : 500,
                        background: selectedRole === r.id ? 'var(--surface-contrast)' : 'transparent',
                        color: selectedRole === r.id ? 'var(--primary-darker)' : 'var(--text-soft)',
                        border: selectedRole === r.id ? '1px solid var(--primary)' : '1px solid transparent',
                        boxShadow: selectedRole === r.id ? 'var(--shadow-sm)' : 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                  Official Registered Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={inputStyle}
                />
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    Security Password
                  </label>
                  <a
                    href="#reset"
                    onClick={(e) => {
                      e.preventDefault()
                      alert('Please contact your Township System Administrator to reset access credentials.')
                    }}
                    style={{ fontSize: 12, color: 'var(--primary-dark)' }}
                  >
                    Forgot password?
                  </a>
                </div>
                <input
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
                className="button button-primary"
                style={{
                  marginTop: 6,
                  padding: '13px',
                  fontSize: 15,
                  fontWeight: 700,
                  width: '100%',
                }}
              >
                Sign In as {activeRoleInfo.label}
              </button>

              {/* Quick tip */}
              <div
                style={{
                  background: 'var(--primary-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: 'var(--primary-darker)',
                }}
              >
                <span>💡 Click any role above to test immediate access credentials.</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>RBAC v2.4</span>
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
