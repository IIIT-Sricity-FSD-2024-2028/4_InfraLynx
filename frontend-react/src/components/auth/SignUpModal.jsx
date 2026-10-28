/**
 * SignUpModal - Township Onboarding and Executive Registration Wizard (3-Step Modal)
 *
 * Workflow:
 * - Step 1 (Executive Info): Controlled form with live regex validation and instant password checklist.
 * - Step 2 (Subscription Plan): Confirmation of the Enterprise Municipal tier with sandbox demonstration notice.
 * - Step 3 (Credential Provisioning): Displays provisioned COO credentials, role badge, and allows password update.
 *
 * Key React Concepts:
 * - Controlled Components: Form state held in useState and synchronized on every keystroke.
 * - Performance Optimization: useMemo caches field validation and password rules to prevent redundant recalculations.
 * - Event Callbacks: useCallback memoizes change and submit handlers to prevent child re-renders.
 * - Side Effect Cleanup: useEffect with useRef cleanly unmounts any pending setTimeout handles to avoid memory leaks.
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { authApi } from '../../services/api.js'
import './styles/SignUpModal.css'

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const PHONE_REGEX = /^[6-9]\d{9}$/
const NAME_REGEX = /^[a-zA-Z\s.'-]{3,60}$/
const UPPER_REGEX = /[A-Z]/
const LOWER_REGEX = /[a-z]/
const DIGIT_REGEX = /\d/
const SPECIAL_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/

const INITIAL_FORM = {
  townshipName: '', executiveName: '', email: '', phone: '',
  sector: '', password: '', confirmPassword: '', agreeTerms: false,
}

const STEP1_FIELDS = [
  { key: 'townshipName', label: 'Township / Municipal Entity Name', placeholder: 'e.g. DLF CyberCity & Aralias Smart Township', full: true },
  { key: 'executiveName', label: 'Executive / COO Full Name', placeholder: 'e.g. Col. Sanjeev Dewan' },
  { key: 'email', label: 'Official Email Address', placeholder: 'coo@infralynx.com', type: 'email' },
  { key: 'phone', label: 'Contact Mobile (10-Digit)', placeholder: '9871234567', type: 'tel', maxLength: 10 },
  { key: 'sector', label: 'Sector / Location', placeholder: 'e.g. Sector 54, Golf Course Road' },
  { key: 'password', label: 'Password', placeholder: '••••••••••••', type: 'password' },
  { key: 'confirmPassword', label: 'Confirm Password', placeholder: '••••••••••••', type: 'password' },
]

const PWD_CHECKS_CONFIG = [
  { key: 'length', label: 'At least 8 characters' },
  { key: 'upper', label: '1 Uppercase letter (A-Z)' },
  { key: 'lower', label: '1 Lowercase letter (a-z)' },
  { key: 'number', label: '1 Number (0-9)' },
  { key: 'special', label: '1 Special character (!@#$%^&*)' },
]

const PLAN_FEATURES = [
  '4 Complete Departments (Civil, Electrical, Water, Horticulture)',
  'AMC Rate Card Engine & 3-Way Reconciliation',
  'Township COO Directorate & Escalation Telemetry',
  'Unlimited RWA Resident Complaint Filing',
  '100 Internal Staff & Contractor Accounts',
  'Automated SLA Escalation & Overrides',
]

function validateField(field, value, allData = {}) {
  const v = (value || '').toString().trim()
  switch (field) {
    case 'townshipName':
      return !v ? 'Township or municipal entity name is required.' : v.length < 3 ? 'Township name must be at least 3 characters.' : ''
    case 'executiveName':
      return !v ? 'Executive full name is required.' : !NAME_REGEX.test(v) ? 'Name must be 3-60 characters and contain letters only.' : ''
    case 'email':
      if (!v) return 'Official email address is required.'
      if (v.includes('@@') || (v.match(/@/g) || []).length !== 1) return 'Invalid email: multiple @ characters detected.'
      return !EMAIL_REGEX.test(v) ? 'Enter a valid corporate email (e.g. coo@township.com).' : ''
    case 'phone':
      return !v ? '10-digit mobile number is required.' : !PHONE_REGEX.test(v) ? 'Enter a valid 10-digit Indian mobile number (e.g. 9812345678).' : ''
    case 'sector':
      return !v ? 'Township sector / location address is required.' : v.length < 3 ? 'Sector / location must be at least 3 characters.' : ''
    case 'password':
      if (!value) return 'Password is required.'
      if (value.length < 8) return 'Password must be at least 8 characters long.'
      if (!UPPER_REGEX.test(value)) return 'Password must contain at least one uppercase letter (A-Z).'
      if (!LOWER_REGEX.test(value)) return 'Password must contain at least one lowercase letter (a-z).'
      if (!DIGIT_REGEX.test(value)) return 'Password must contain at least one number (0-9).'
      return !SPECIAL_REGEX.test(value) ? 'Password must contain at least one special character (!@#$%^&*).' : ''
    case 'confirmPassword':
      return !value ? 'Please confirm your password.' : value !== allData.password ? 'Passwords do not match.' : ''
    case 'agreeTerms':
      return !value ? 'You must agree to the Terms of Service to proceed.' : ''
    default:
      return ''
  }
}

export default function SignUpModal({ 
  isOpen,           // Controls whether the modal dialog is visible on screen
  onClose,          // Callback function to close the modal
  onOpenLogin,      // Callback function to open the Login modal instead
  onSignUpSuccess,  // Callback notifying parent of newly provisioned township & credentials
}) {
  // --- 1. Component State & Controlled Form Hooks ---
  const [step, setStep]                                 = useState(1)           // Active wizard step (1: Details, 2: Plan, 3: Provisioned Credentials)
  const [loading, setLoading]                           = useState(false)       // Async submission loading state (disables buttons & shows spinner)
  const [apiError, setApiError]                         = useState(null)        // Server error response message (e.g. duplicate email registration)
  const [formData, setFormData]                         = useState(INITIAL_FORM)// Controlled form object storing all input fields
  const [touched, setTouched]                           = useState({})          // Tracks blurred fields so errors only show after user interaction
  const [showPasswordChange, setShowPasswordChange]     = useState(false)       // Toggles inline password update drawer in Step 3
  const [newPassword, setNewPassword]                   = useState('')          // Controlled input state for password change in Step 3
  const [passwordUpdateMsg, setPasswordUpdateMsg]       = useState(null)        // Feedback toast message for password update
  const [passwordUpdateLoading, setPasswordUpdateLoading]= useState(false)       // Loading state for password update API call
  const [createdData, setCreatedData]                   = useState(null)        // Stores newly created township and provisioned COO account
  const pwdTimerRef                                     = useRef(null)          // Mutable timer reference to cleanly cancel timeouts on unmount

  useEffect(() => () => { if (pwdTimerRef.current) clearTimeout(pwdTimerRef.current) }, [])

    // --- 2. Real-Time Form Validation & Password Checks (Memoized) ---
  // Validates all fields against domain rules whenever formData changes
  const errors = useMemo(() => {
    const errs = {}
    Object.keys(formData).forEach(k => { errs[k] = validateField(k, formData[k], formData) })
    return errs
  }, [formData])

  const isStep1Valid = useMemo(() => (
    Object.values(errors).every(e => !e) &&
    Object.entries(formData).every(([k, v]) => Boolean(v))
  ), [errors, formData])

  const pwdChecks = useMemo(() => ({
    length: formData.password.length >= 8,
    upper: UPPER_REGEX.test(formData.password),
    lower: LOWER_REGEX.test(formData.password),
    number: DIGIT_REGEX.test(formData.password),
    special: SPECIAL_REGEX.test(formData.password),
  }), [formData.password])

    // --- 3. Event Handlers & Callbacks (Memoized) ---
  // Handles controlled input changes and clears api error
  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setApiError(null)
  }, [])

  const handleBlur = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }, [])

    // Validates step 1 inputs on submit before advancing to subscription selection
  const handleProceedToPlan = useCallback((e) => {
    e.preventDefault()
    setTouched(Object.keys(formData).reduce((acc, k) => { acc[k] = true; return acc }, {}))
    if (isStep1Valid) { setApiError(null); setStep(2) }
  }, [formData, isStep1Valid])

    // Submits registration payload to backend auth API and activates township tier
  const handleActivateSubscription = useCallback(async () => {
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
      if (!data) throw new Error('Failed to retrieve registration data.')
      setCreatedData(data)
      setStep(3)
    } catch (err) {
      console.warn('[SignUp Error]:', err.message)
      setApiError(err.message || 'Server connection error during onboarding.')
    } finally {
      setLoading(false)
    }
  }, [formData])

    // Optional: Allows freshly onboarded COO to update password immediately
  const handleUpdatePassword = useCallback(async (e) => {
    e.preventDefault()
    const pwdErr = validateField('password', newPassword)
    if (pwdErr) { setPasswordUpdateMsg({ type: 'error', text: pwdErr }); return }

    setPasswordUpdateLoading(true)
    setPasswordUpdateMsg(null)
    try {
      await authApi.setPassword(createdData?.user?.email || formData.email.trim(), newPassword)
      setPasswordUpdateMsg({ type: 'success', text: 'Password successfully updated!' })
      setNewPassword('')
      if (pwdTimerRef.current) clearTimeout(pwdTimerRef.current)
      pwdTimerRef.current = setTimeout(() => setShowPasswordChange(false), 2000)
    } catch (err) {
      setPasswordUpdateMsg({ type: 'error', text: err.message || 'Could not update password.' })
    } finally {
      setPasswordUpdateLoading(false)
    }
  }, [newPassword, createdData, formData.email])

    // Launches the COO Directorate portal with the newly created account
  const handleLaunchDirectorate = useCallback(() => {
    const userToLogin = createdData?.user || {
      name: formData.executiveName.trim(),
      email: formData.email.trim(),
      role: 'TOWNSHIP_COO',
      townshipName: formData.townshipName.trim(),
    }
    if (onSignUpSuccess) onSignUpSuccess(userToLogin)
    else onClose()
  }, [createdData, formData, onSignUpSuccess, onClose])

  if (!isOpen) return null

  return (
    <div className="su-overlay" onClick={onClose}>
      <div className="su-modal" onClick={(e) => e.stopPropagation()}>
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
          <button className="su-close-btn" onClick={onClose} aria-label="Close modal">&times;</button>
        </div>

        <div className="su-stepper">
          {[
            { num: 1, label: 'Executive Info' },
            { num: 2, label: 'Subscription Plan' },
            { num: 3, label: 'Credentials' },
          ].map(({ num, label }, i) => (
            <div key={num} style={{ display: 'contents' }}>
              {i > 0 && <div className={`su-step-divider ${step >= num ? 'completed' : ''}`} />}
              <div className={`su-step-item ${step === num ? 'active' : step > num ? 'completed' : ''}`}>
                <span className="su-step-num">{step > num ? '✓' : num}</span>
                <span>{label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="su-body">
          {apiError && <div className="su-api-error">&#9888; {apiError}</div>}

          {step === 1 && (
            <form onSubmit={handleProceedToPlan} id="signup-step1-form">
              <div className="su-form-grid">
                {STEP1_FIELDS.map(({ key, label, placeholder, type = 'text', full, maxLength }) => (
                  <div key={key} className={`su-field${full ? ' su-field-full' : ''}`}>
                    <label className="su-label">
                      <span>{label}<span className="su-required">*</span></span>
                    </label>
                    <input
                      type={type}
                      maxLength={maxLength}
                      className={`su-input ${touched[key] ? (errors[key] ? 'is-error' : 'is-valid') : ''}`}
                      placeholder={placeholder}
                      value={formData[key]}
                      onChange={(e) => handleChange(key, key === 'phone' ? e.target.value.replace(/\D/g, '') : e.target.value)}
                      onBlur={() => handleBlur(key)}
                      required
                    />
                    {touched[key] && errors[key] && (
                      <span className="su-error-msg">&#9888; {errors[key]}</span>
                    )}
                  </div>
                ))}

                <div className="su-field-full">
                  <div className="su-pwd-checks">
                    {PWD_CHECKS_CONFIG.map(({ key, label }) => (
                      <span key={key} className={`su-pwd-check-item ${pwdChecks[key] ? 'met' : ''}`}>
                        {pwdChecks[key] ? '✓' : '○'} {label}
                      </span>
                    ))}
                  </div>
                </div>

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

          {step === 2 && (
            <div>
              <div className="su-plan-card">
                <span className="su-plan-badge">Default Municipal Tier</span>
                <div className="su-plan-title">Enterprise Municipal &amp; Township Plan</div>
                <div className="su-plan-price">₹1,50,000 <span>/ year (Billed Annually)</span></div>
                <p className="su-plan-desc">
                  Full infrastructure lifecycle orchestration for large gated townships, SEZs, and municipal zones.
                </p>
                <ul className="su-plan-features">
                  {PLAN_FEATURES.map((feat) => (
                    <li key={feat}><span className="su-plan-check">✓</span> {feat}</li>
                  ))}
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

          {step === 3 && (
            <div>
              <div className="su-success-banner">
                <div className="su-success-icon">✓</div>
                <h3 style={{ fontSize: 20, color: '#0f172a', margin: '0 0 6px' }}>Township Registered &amp; Activated!</h3>
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
                      <button type="submit" className="su-btn su-btn-primary" disabled={passwordUpdateLoading}>
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

        <div className="su-footer">
          {step === 1 && (
            <>
              <button type="button" className="su-btn su-btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" form="signup-step1-form" className="su-btn su-btn-primary" disabled={!isStep1Valid}>
                Continue to Plan Selection &rarr;
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button type="button" className="su-btn su-btn-secondary" onClick={() => setStep(1)} disabled={loading}>
                &larr; Back to Details
              </button>
              <button type="button" className="su-btn su-btn-primary" onClick={handleActivateSubscription} disabled={loading}>
                {loading ? 'Activating Township...' : 'Confirm & Activate Township Subscription ✓'}
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Departments &amp; desk clerk staff can be created inside the portal.
              </div>
              <button type="button" className="su-btn su-btn-launch" onClick={handleLaunchDirectorate}>
                Launch COO Directorate &rarr;
              </button>
            </>
          )}
        </div>

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
