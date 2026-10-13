import { useState, useCallback } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import { superAdminApi } from '../../services/api.js'
import Overview from './sections/Overview.jsx'
import TenantsSubscriptions from './sections/TenantsSubscriptions.jsx'
import UsersAccess from './sections/UsersAccess.jsx'
import GlobalRules from './sections/GlobalRules.jsx'
import SystemHealth from './sections/SystemHealth.jsx'
import './styles/SuperAdminPortal.css'

const NAV_TABS = [
  { id: 'overview',  label: 'Overview',                icon: '📊' },
  { id: 'tenants',   label: 'Subscriptions & Tenants', icon: '🏢' },
  { id: 'users',     label: 'Users & Access',          icon: '👥' },
  { id: 'rules',     label: 'Global Rules & Catalogs', icon: '⚙️' },
  { id: 'health',    label: 'System Health & Audit',   icon: '🛡️' },
]

export default function SuperAdminPortal({ onExitToLanding }) {
  const { currentUser } = useTIMS()
  const [activeTab, setActiveTab] = useState('overview')
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const sectionProps = { showToast, api: superAdminApi }

  return (
    <div className="sa-shell">
      {/* ── Sticky Header ─────────────────────────────────────────────── */}
      <header className="sa-header">
        {/* Top Row */}
        <div className="sa-header-top">
          {/* Brand */}
          <div className="sa-brand-group">
            <div className="sa-brand-icon" title="InfraLynx">IL</div>
            <div>
              <span className="sa-brand-title">InfraLynx</span>
              <span className="sa-brand-subtitle">Platform Maker Console</span>
            </div>
            <div className="sa-role-badge">
              <span className="sa-role-dot" />
              Super Admin
            </div>
          </div>

          {/* Right */}
          <div className="sa-header-right">
            <div className="sa-user-pill">
              <div className="sa-user-avatar">
                {(currentUser?.name || 'SA').slice(0, 1).toUpperCase()}
              </div>
              <div className="sa-user-meta">
                <div className="sa-user-name">{currentUser?.name || 'Super Admin'}</div>
                <div className="sa-user-role">Platform Administrator</div>
              </div>
            </div>
            {onExitToLanding && (
              <button
                className="sa-btn-exit"
                onClick={onExitToLanding}
                id="sa-btn-exit"
              >
                Exit Portal ↗
              </button>
            )}
          </div>
        </div>

        {/* Tab Bar */}
        <nav className="sa-nav-bar" aria-label="Super Admin sections">
          <div className="sa-nav-inner">
            {NAV_TABS.map((tab) => (
              <button
                type="button"
                key={tab.id}
                id={`sa-tab-${tab.id}`}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                className={`sa-tab-btn${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.id)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <main className="sa-main">
        {activeTab === 'overview' && <Overview {...sectionProps} />}
        {activeTab === 'tenants'  && <TenantsSubscriptions {...sectionProps} />}
        {activeTab === 'users'    && <UsersAccess {...sectionProps} />}
        {activeTab === 'rules'    && <GlobalRules {...sectionProps} />}
        {activeTab === 'health'   && <SystemHealth {...sectionProps} />}
      </main>

      {/* ── Toast Notification ────────────────────────────────────────── */}
      {toast && (
        <div className={`sa-toast ${toast.type}`} id="sa-toast">
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}
    </div>
  )
}
