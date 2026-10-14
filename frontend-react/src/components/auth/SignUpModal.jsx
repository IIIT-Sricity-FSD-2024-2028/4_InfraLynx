import { useState } from 'react'
import { authApi } from '../../services/api.js'
import './styles/SignUpModal.css'

// Strict validation patterns
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const PHONE_REGEX = /^[6-9]\d{9}$/
const NAME_REGEX = /^[a-zA-Z\s.'-]{3,60}$/

export default function SignUpModal({ isOpen, onClose, onOpenLogin, onSignUpSuccess }) {
  const [step, setStep] = useState(1) // 1: Details, 2: Plan Confirmation, 3: Credentials & Launch
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState(null)

  // Step 1 Form Data
  const [formData, setFormData] = useState({
    townshipName: '',
    executiveName: '',
    email: '',
    phone: '',
    sector: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  })

  // Touched state for immediate on-blur feedback
  const [touched, setTouched] = useState({})

  // Step 3 Password update state
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordUpdateMsg, setPasswordUpdateMsg] = useState(null)
  const [passwordUpdateLoading, setPasswordUpdateLoading] = useState(false)

  // Created credentials payload from server
  const [createdData, setCreatedData] = useState(null)

  if (!isOpen) return null

  // ── Validation Helpers ───────────────────────────────────────────────────────
  const validateField = (field, value, allData = formData) => {
    switch (field) {
      case 'townshipName':
        if (!value || !value.trim()) return 'Township or municipal entity name is required.'
        if (value.trim().length < 3) return 'Township name must be at least 3 characters.'
        return ''

      case 'executiveName':
        if (!value || !value.trim()) return 'Executive full name is required.'
        if (!NAME_REGEX.test(value.trim())) return 'Name must be 3-60 characters and contain letters only.'
        return ''

      case 'email':
        if (!value || !value.trim()) return 'Official email address is required.'
        const emailTrimmed = value.trim()
        if (emailTrimmed.includes('@@') || (emailTrimmed.match(/@/g) || []).length !== 1) {
          return 'Invalid email: multiple @ characters detected.'
        }
        if (!EMAIL_REGEX.test(emailTrimmed)) {
          return 'Enter a valid corporate email (e.g. coo@township.com).'
        }
        return ''

      case 'phone':
        if (!value || !value.trim()) return '10-digit mobile number is required.'
        if (!PHONE_REGEX.test(value.trim())) {
          return 'Enter a valid 10-digit Indian mobile number (e.g. 9812345678).'
        }
        return ''

      case 'sector':
        if (!value || !value.trim()) return 'Township sector / location address is required.'
        if (value.trim().length < 3) return 'Sector / location must be at least 3 characters.'
        return ''

      case 'password':
        if (!value) return 'Password is required.'
        if (value.length < 8) return 'Password must be at least 8 characters long.'
        if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter (A-Z).'
        if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter (a-z).'
        if (!/\d/.test(value)) return 'Password must contain at least one number (0-9).'
        if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)) {
          return 'Password must contain at least one special character (!@#$%^&*).'
        }
        return ''

      case 'confirmPassword':
        if (!value) return 'Please confirm your password.'
        if (value !== allData.password) return 'Passwords do not match.'
        return ''

      case 'agreeTerms':
        if (!value) return 'You must agree to the Terms of Service to proceed.'
        return ''

      default:
        return ''
    }
  }

  // Real-time error computation
  const errors = {
    townshipName: validateField('townshipName', formData.townshipName),
    executiveName: validateField('executiveName', formData.executiveName),
    email: validateField('email', formData.email),
    phone: validateField('phone', formData.phone),
    sector: validateField('sector', formData.sector),
    password: validateField('password', formData.password),
    confirmPassword: validateField('confirmPassword', formData.confirmPassword),
    agreeTerms: validateField('agreeTerms', formData.agreeTerms),
  }

  const isStep1Valid =
    !errors.townshipName &&
    !errors.executiveName &&
    !errors.email &&
    !errors.phone &&
    !errors.sector &&
    !errors.password &&
    !errors.confirmPassword &&
    !errors.agreeTerms &&
    formData.townshipName &&
    formData.executiveName &&
    formData.email &&
    formData.phone &&
    formData.sector &&
    formData.password &&
    formData.confirmPassword &&
    formData.agreeTerms

  // Live password checklist checks
  const pwdChecks = {
    length: formData.password.length >= 8,
    upper: /[A-Z]/.test(formData.password),
    lower: /[a-z]/.test(formData.password),
    number: /\d/.test(formData.password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password),
  }

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setApiError(null)
  }

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  // Advance to Step 2
  const handleProceedToPlan = (e) => {
    e.preventDefault()
    // Touch all fields to show any missing requirements
    const allTouched = Object.keys(formData).reduce((acc, k) => ({ ...acc, [k]: true }), {})
    setTouched(allTouched)

    if (isStep1Valid) {
      setApiError(null)
      setStep(2)
    }
  }

  // Step 2: Confirm plan & register on backend
  const handleActivateSubscription = async () => {
    setLoading(true)
    setApiError(null)

    try {
      const data = await authApi.registerTownship({
        townshipName: formData.townshipName.trim(),
        executiveName: formData.executiveName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.sector.trim(),
        password: formData.password,
        planLabel: 'Enterprise Municipal Plan',
      })

      if (!data) {
        throw new Error('Failed to retrieve registration data.')
      }

      setCreatedData(data)
      setStep(3)
    } catch (err) {
      console.warn('[SignUp Error]:', err.message)
      setApiError(err.message || 'Server connection error during onboarding.')
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Update password handler
  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    const pwdErr = validateField('password', newPassword)
    if (pwdErr) {
      setPasswordUpdateMsg({ type: 'error', text: pwdErr })
      return
    }

    setPasswordUpdateLoading(true)
    setPasswordUpdateMsg(null)

    try {
      await authApi.setPassword(
        createdData?.user?.email || formData.email.trim(),
        newPassword
      )

      setPasswordUpdateMsg({ type: 'success', text: 'Password successfully updated!' })
      setNewPassword('')
      setTimeout(() => setShowPasswordChange(false), 2000)
    } catch (err) {
      setPasswordUpdateMsg({ type: 'error', text: err.message || 'Could not update password.' })
    } finally {
      setPasswordUpdateLoading(false)
    }
  }

  // Step 3: Final Launch into COO Directorate
  const handleLaunchDirectorate = () => {
    const userToLogin = createdData?.user || {
      name: formData.executiveName.trim(),
      email: formData.email.trim(),
      role: 'TOWNSHIP_COO',
      townshipName: formData.townshipName.trim(),
    }
    if (onSignUpSuccess) {
      onSignUpSuccess(userToLogin)
    } else {
      onClose()
    }
  }

  return (
    <div className="su-overlay" onClick={onClose}>
      <div className="su-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="su-header">
          <div>
            <div className="su-brand">
              <div className="su-logo-icon">IL</div>
              <span className="su-brand-text">InfraLynx TIMS</span>
            </div>
            <h2 className="su-title">
              {step === 1 && 'Register Township & COO Account'}
              {step === 2 && 'Confirm Township Subscription'}
              {step === 3 && 'Township Onboarding Complete'}
            </h2>
            <p className="su-subtitle">
              {step === 1 && 'Create top-level municipal administration account'}
              {step === 2 && 'Step 2 of 3: Activate default enterprise township tier'}
              {step === 3 && 'Step 3 of 3: Official credentials & directorate launch'}
            </p>
          </div>
          <button className="su-close-btn" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="su-stepper">
          <div className={`su-step-item ${step === 1 ? 'active' : 'completed'}`}>
            <span className="su-step-num">{step > 1 ? '✓' : '1'}</span>
            <span>Executive Info</span>
          </div>
          <div className={`su-step-divider ${step >= 2 ? 'completed' : ''}`} />
          <div className={`su-step-item ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
            <span className="su-step-num">{step > 2 ? '✓' : '2'}</span>
            <span>Subscription Plan</span>
          </div>
          <div className={`su-step-divider ${step === 3 ? 'completed' : ''}`} />
          <div className={`su-step-item ${step === 3 ? 'active' : ''}`}>
            <span className="su-step-num">3</span>
            <span>Credentials</span>
          </div>
        </div>

        {/* Body */}
        <div className="su-body">
          {apiError && <div className="su-api-error">&#9888; {apiError}</div>}

          {/* ───────────────── STEP 1: Details ───────────────── */}
          {step === 1 && (
            <form onSubmit={handleProceedToPlan} id="signup-step1-form">
              <div className="su-form-grid">
                {/* Township Name */}
                <div className="su-field su-field-full">
                  <label className="su-label">
                    <span>Township / Municipal Entity Name<span className="su-required">*</span></span>
                  </label>
                  <input
                    type="text"
                    className={`su-input ${touched.townshipName ? (errors.townshipName ? 'is-error' : 'is-valid') : ''}`}
                    placeholder="e.g. DLF CyberCity & Aralias Smart Township"
                    value={formData.townshipName}
                    onChange={(e) => handleChange('townshipName', e.target.value)}
                    onBlur={() => handleBlur('townshipName')}
                    required
                  />
                  {touched.townshipName && errors.townshipName && (
                    <span className="su-error-msg">&#9888; {errors.townshipName}</span>
                  )}
                </div>

                {/* Executive Name */}
                <div className="su-field">
                  <label className="su-label">
                    <span>Executive / COO Full Name<span className="su-required">*</span></span>
                  </label>
                  <input
                    type="text"
                    className={`su-input ${touched.executiveName ? (errors.executiveName ? 'is-error' : 'is-valid') : ''}`}
                    placeholder="e.g. Col. Sanjeev Dewan"
                    value={formData.executiveName}
                    onChange={(e) => handleChange('executiveName', e.target.value)}
                    onBlur={() => handleBlur('executiveName')}
                    required
                  />
                  {touched.executiveName && errors.executiveName && (
                    <span className="su-error-msg">&#9888; {errors.executiveName}</span>
                  )}
                </div>

                {/* Official Email */}
                <div className="su-field">
                  <label className="su-label">
                    <span>Official Email Address<span className="su-required">*</span></span>
                  </label>
                  <input
                    type="email"
                    className={`su-input ${touched.email ? (errors.email ? 'is-error' : 'is-valid') : ''}`}
                    placeholder="coo@infralynx.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    required
                  />
                  {touched.email && errors.email && (
                    <span className="su-error-msg">&#9888; {errors.email}</span>
                  )}
                </div>

                {/* Phone Number */}
                <div className="su-field">
                  <label className="su-label">
                    <span>Contact Mobile (10-Digit)<span className="su-required">*</span></span>
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    className={`su-input ${touched.phone ? (errors.phone ? 'is-error' : 'is-valid') : ''}`}
                    placeholder="9871234567"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, ''))}
                    onBlur={() => handleBlur('phone')}
                    required
                  />
                  {touched.phone && errors.phone && (
                    <span className="su-error-msg">&#9888; {errors.phone}</span>
                  )}
                </div>

                {/* Sector / Location */}
                <div className="su-field">
                  <label className="su-label">
                    <span>Sector / Location<span className="su-required">*</span></span>
                  </label>
                  <input
                    type="text"
                    className={`su-input ${touched.sector ? (errors.sector ? 'is-error' : 'is-valid') : ''}`}
                    placeholder="e.g. Sector 54, Golf Course Road"
                    value={formData.sector}
                    onChange={(e) => handleChange('sector', e.target.value)}
                    onBlur={() => handleBlur('sector')}
                    required
                  />
                  {touched.sector && errors.sector && (
                    <span className="su-error-msg">&#9888; {errors.sector}</span>
                  )}
                </div>

                {/* Password */}
                <div className="su-field">
                  <label className="su-label">
                    <span>Password<span className="su-required">*</span></span>
                  </label>
                  <input
                    type="password"
                    className={`su-input ${touched.password ? (errors.password ? 'is-error' : 'is-valid') : ''}`}
                    placeholder="••••••••••••"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    onBlur={() => handleBlur('password')}
                    required
                  />
                  {touched.password && errors.password && (
                    <span className="su-error-msg">&#9888; {errors.password}</span>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="su-field">
                  <label className="su-label">
                    <span>Confirm Password<span className="su-required">*</span></span>
                  </label>
                  <input
                    type="password"
                    className={`su-input ${touched.confirmPassword ? (errors.confirmPassword ? 'is-error' : 'is-valid') : ''}`}
                    placeholder="••••••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    onBlur={() => handleBlur('confirmPassword')}
                    required
                  />
                  {touched.confirmPassword && errors.confirmPassword && (
                    <span className="su-error-msg">&#9888; {errors.confirmPassword}</span>
                  )}
                </div>

                {/* Live Password Strength Checklist */}
                <div className="su-field-full">
                  <div className="su-pwd-checks">
                    <span className={`su-pwd-check-item ${pwdChecks.length ? 'met' : ''}`}>
                      {pwdChecks.length ? '✓' : '○'} At least 8 characters
                    </span>
                    <span className={`su-pwd-check-item ${pwdChecks.upper ? 'met' : ''}`}>
                      {pwdChecks.upper ? '✓' : '○'} 1 Uppercase letter (A-Z)
                    </span>
                    <span className={`su-pwd-check-item ${pwdChecks.lower ? 'met' : ''}`}>
                      {pwdChecks.lower ? '✓' : '○'} 1 Lowercase letter (a-z)
                    </span>
                    <span className={`su-pwd-check-item ${pwdChecks.number ? 'met' : ''}`}>
                      {pwdChecks.number ? '✓' : '○'} 1 Number (0-9)
                    </span>
                    <span className={`su-pwd-check-item ${pwdChecks.special ? 'met' : ''}`}>
                      {pwdChecks.special ? '✓' : '○'} 1 Special character (!@#$%^&*)
                    </span>
                  </div>
                </div>

                {/* Terms agreement */}
                <div className="su-field-full">
                  <label className="su-checkbox-label">
                    <input
                      type="checkbox"
                      className="su-checkbox"
                      checked={formData.agreeTerms}
                      onChange={(e) => handleChange('agreeTerms', e.target.checked)}
                    />
                    <span>
                      I confirm that I am authorized to represent this municipal/township entity and agree to the{' '}
                      <strong>InfraLynx Infrastructure Management Terms & SLA Guidelines</strong>.
                    </span>
                  </label>
                  {touched.agreeTerms && errors.agreeTerms && (
                    <span className="su-error-msg">&#9888; {errors.agreeTerms}</span>
                  )}
                </div>
              </div>
            </form>
          )}

          {/* ───────────────── STEP 2: Subscription Plan ───────────────── */}
          {step === 2 && (
            <div>
              <div className="su-plan-card">
                <span className="su-plan-badge">Default Municipal Tier</span>
                <div className="su-plan-title">Enterprise Municipal &amp; Township Plan</div>
                <div className="su-plan-price">
                  ₹1,50,000 <span>/ year (Billed Annually)</span>
                </div>
                <p className="su-plan-desc">
                  Full infrastructure lifecycle orchestration for large gated townships, SEZs, and municipal zones.
                </p>

                <ul className="su-plan-features">
                  <li><span className="su-plan-check">✓</span> 4 Complete Departments (Civil, Electrical, Water, Horticulture)</li>
                  <li><span className="su-plan-check">✓</span> AMC Rate Card Engine &amp; 3-Way Reconciliation</li>
                  <li><span className="su-plan-check">✓</span> Township COO Directorate &amp; Escalation Telemetry</li>
                  <li><span className="su-plan-check">✓</span> Unlimited RWA Resident Complaint Filing</li>
                  <li><span className="su-plan-check">✓</span> 100 Internal Staff &amp; Contractor Accounts</li>
                  <li><span className="su-plan-check">✓</span> Automated SLA Escalation &amp; Overrides</li>
                </ul>
              </div>

              <div className="su-demo-notice">
                <span style={{ fontSize: 18 }}>ℹ</span>
                <div>
                  <strong>Academic / Demonstration Sandbox Mode:</strong>
                  <div style={{ marginTop: 2, fontSize: 12 }}>
                    Clicking the button below instantly activates your township subscription without payment friction.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────── STEP 3: Credentials & Launch ───────────────── */}
          {step === 3 && (
            <div>
              <div className="su-success-banner">
                <div className="su-success-icon">✓</div>
                <h3 style={{ fontSize: 20, color: '#0f172a', margin: '0 0 6px' }}>
                  Township Registered &amp; Activated!
                </h3>
                <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                  Your official <strong>Township COO</strong> credentials have been provisioned.
                </p>
              </div>

              <div className="su-cred-card">
                <div className="su-cred-row">
                  <span className="su-cred-label">Township Entity</span>
                  <span className="su-cred-val">{createdData?.township?.name || formData.townshipName}</span>
                </div>
                <div className="su-cred-row">
                  <span className="su-cred-label">Designated Role</span>
                  <span className="su-cred-badge">TOWNSHIP_COO</span>
                </div>
                <div className="su-cred-row">
                  <span className="su-cred-label">Login Identifier / Email</span>
                  <span className="su-cred-val" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                    {createdData?.credentials?.email || formData.email}
                  </span>
                </div>
                <div className="su-cred-row">
                  <span className="su-cred-label">Subscription Status</span>
                  <span style={{ color: '#16a34a', fontWeight: 700 }}>ACTIVE • Enterprise Tier</span>
                </div>
              </div>

              {/* Password Setting / Updating Section */}
              <div className="su-pwd-change-box">
                <div className="su-pwd-change-title">
                  <span>Security &amp; Password</span>
                  <button
                    type="button"
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                    style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  >
                    {showPasswordChange ? 'Cancel' : 'Change Password'}
                  </button>
                </div>

                {!showPasswordChange ? (
                  <div style={{ fontSize: 12.5, color: '#64748b' }}>
                    Your password has been securely encrypted with bcrypt. You can launch your portal now, or update it here.
                  </div>
                ) : (
                  <form onSubmit={handleUpdatePassword} style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="password"
                        placeholder="Enter new strong password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="su-input"
                        style={{ flex: 1 }}
                        required
                      />
                      <button
                        type="submit"
                        className="su-btn su-btn-primary"
                        disabled={passwordUpdateLoading}
                      >
                        {passwordUpdateLoading ? 'Saving...' : 'Set Password'}
                      </button>
                    </div>
                    {passwordUpdateMsg && (
                      <div style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: passwordUpdateMsg.type === 'error' ? '#ef4444' : '#16a34a',
                        fontWeight: 600,
                      }}>
                        {passwordUpdateMsg.text}
                      </div>
                    )}
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="su-footer">
          {step === 1 && (
            <>
              <button type="button" className="su-btn su-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                form="signup-step1-form"
                className="su-btn su-btn-primary"
                disabled={!isStep1Valid}
              >
                Continue to Plan Selection &rarr;
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                className="su-btn su-btn-secondary"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                &larr; Back to Details
              </button>
              <button
                type="button"
                className="su-btn su-btn-primary"
                onClick={handleActivateSubscription}
                disabled={loading}
              >
                {loading ? 'Activating Township...' : 'Confirm & Activate Township Subscription ✓'}
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Departments &amp; desk clerk staff can be created inside the portal.
              </div>
              <button
                type="button"
                className="su-btn su-btn-launch"
                onClick={handleLaunchDirectorate}
              >
                Launch COO Directorate &rarr;
              </button>
            </>
          )}
        </div>

        {/* Toggle link to Sign In */}
        {step === 1 && (
          <div className="su-login-link" style={{ paddingBottom: 16 }}>
            Already an official staff member or RWA?{' '}
            <button
              type="button"
              onClick={() => {
                onClose()
                if (onOpenLogin) onOpenLogin()
              }}
            >
              Sign In here
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
