import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { selectAuthUser } from '../../store/auth/authSlice.js'
import {
  clearSuperAdminNotice,
  selectSuperAdminNotice,
} from '../../store/superadmin/superAdminSlice.js'
import Overview from './sections/Overview.jsx'
import TenantsSubscriptions from './sections/TenantsSubscriptions.jsx'
import UsersAccess from './sections/UsersAccess.jsx'

import './styles/SuperAdminPortal.css'

const NAV_TABS = [
  { id: 'overview',  label: 'Overview',                icon: '📊' },
  { id: 'tenants',   label: 'Subscriptions & Tenants', icon: '🏢' },
  { id: 'users',     label: 'Users & Access',          icon: '👥' },
]

export default function SuperAdminPortal({ onExitToLanding }) {
  const dispatch = useDispatch()
  const currentUser = useSelector(selectAuthUser)
  const toast = useSelector(selectSuperAdminNotice)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => {
      dispatch(clearSuperAdminNotice())
    }, 3500)
    return () => clearTimeout(timer)
  }, [toast, dispatch])

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
        {activeTab === 'overview' && <Overview />}
        {activeTab === 'tenants'  && <TenantsSubscriptions />}
        {activeTab === 'users'    && <UsersAccess />}
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
