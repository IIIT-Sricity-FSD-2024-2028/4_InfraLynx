// Finance portal shell: tab navigation and modal host
import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import FinanceDashboard from './FinanceDashboard.jsx'
import InvoiceAudit from './InvoiceAudit.jsx'
import InvoiceAuditModal from './InvoiceAuditModal.jsx'
import RateCardViewer from './RateCardViewer.jsx'

import {
  fetchInvoices,
  authorizeInvoice,
  flagVariance,
  releasePayment,
  setSelectedInvoice,
  clearSelectedInvoice,
  clearInvoiceNotice,
  selectSelectedInvoice,
  selectInvoiceNotice,
  selectPendingAuditCount,
} from '../../store/finance/invoicesSlice.js'

import { fetchContractors, fetchAmcRates } from '../../store/master/masterDataSlice.js'
import { fetchRateCards } from '../../store/finance/rateCardsSlice.js'
import { selectAuthUser } from '../../store/auth/authSlice.js'

import './styles/FinancePortal.css'

export default function FinancePortal({ onExitToLanding }) {
  const dispatch = useDispatch()
  const currentUser = useSelector(selectAuthUser)
  const activeInvoiceModal = useSelector(selectSelectedInvoice)
  const notice = useSelector(selectInvoiceNotice)
  const pendingAuditCount = useSelector(selectPendingAuditCount)

  const [currentScreen, setCurrentScreen] = useState('dashboard')

  // Load finance and master data on mount
  useEffect(() => {
    dispatch(fetchInvoices())
    dispatch(fetchContractors())
    dispatch(fetchAmcRates())
    dispatch(fetchRateCards())
  }, [dispatch])

  // Re-fetch invoices when switching screens
  useEffect(() => {
    dispatch(fetchInvoices())
  }, [currentScreen, dispatch])

  function handleNavigate(screen) {
    setCurrentScreen(screen)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Authorize invoice via Redux thunk
  async function handleAuthorizeInvoice(invoiceId, keepOpen = false) {
    const action = await dispatch(authorizeInvoice({ id: invoiceId, rawId: invoiceId }))
    if (authorizeInvoice.rejected.match(action)) {
      alert(action.payload || 'Authorization failed.')
      return false
    }
    if (!keepOpen) dispatch(clearSelectedInvoice())
    return true
  }

  // Release payment via Redux thunk
  async function handleReleasePayment(invoiceId, paymentConfig) {
    const action = await dispatch(releasePayment({ id: invoiceId, rawId: invoiceId, paymentConfig }))
    if (releasePayment.rejected.match(action)) {
      alert(action.payload || 'Payment release failed. Please try again.')
      throw new Error(action.payload || 'Payment release failed')
    }
    return action.payload?.result
  }

  // Flag variance via Redux thunk
  async function handleFlagVariance(invoiceId, reason) {
    const action = await dispatch(flagVariance({ id: invoiceId, rawId: invoiceId, reason }))
    if (flagVariance.rejected.match(action)) {
      alert(action.payload || 'Failed to flag variance.')
    }
  }

  const TABS = [
    { id: 'dashboard', label: 'Financial Overview' },
    { id: 'audit', label: 'Invoice Audits & Settlements', badge: pendingAuditCount > 0 ? pendingAuditCount : null },
    { id: 'rates', label: 'AMC Rate Cards & Contracts' },
  ]

  return (
    <div className="finance-shell">
      <header className="finance-header">
        <div className="finance-header-top">
          <div className="finance-brand-group">
            <div className="finance-brand-link" onClick={() => handleNavigate('dashboard')}>
              <img src="/assets/CRIMS_logo.png" alt="TIMS Logo" className="finance-brand-logo" />
              <div>
                <span className="finance-brand-title">TIMS</span>
                <span className="finance-brand-sub">Township Infrastructure Management</span>
              </div>
            </div>
            <div className="finance-role-badge">
              <span className="finance-role-dot"></span>
              Finance &amp; Billing Clerk
            </div>
          </div>
          <div className="finance-user-actions">
            <div className="finance-user-badge">
              <div className="finance-user-name">{currentUser?.name || 'Sunil Agrawal, CA'}</div>
              <div className="finance-user-role">{currentUser?.title || 'Senior Finance Officer • AMC Accounts'}</div>
            </div>
            {onExitToLanding && <button onClick={onExitToLanding} className="finance-btn-exit">Exit Portal ↗</button>}
          </div>
        </div>

        <div className="finance-tabs-wrapper">
          <div className="finance-tabs-container">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => handleNavigate(tab.id)} className={`finance-tab-btn ${currentScreen === tab.id ? 'active' : ''}`}>
                {tab.label}
                {tab.badge && <span className="finance-tab-badge">{tab.badge}</span>}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="finance-main-container">
        {notice && (
          <div className="finance-notice-banner">
            <span>✓ {notice}</span>
            <button onClick={() => dispatch(clearInvoiceNotice())} className="finance-notice-close">✕</button>
          </div>
        )}

        {currentScreen === 'dashboard' && (
          <FinanceDashboard
            onNavigate={handleNavigate}
            onOpenInvoice={(inv) => dispatch(setSelectedInvoice(inv))}
            onAuthorizeInvoice={handleAuthorizeInvoice}
          />
        )}
        {currentScreen === 'audit' && (
          <InvoiceAudit
            onOpenInvoice={(inv) => dispatch(setSelectedInvoice(inv))}
            onAuthorizeInvoice={handleAuthorizeInvoice}
          />
        )}
        {currentScreen === 'rates' && <RateCardViewer />}

        {activeInvoiceModal && (
          <InvoiceAuditModal
            onClose={() => dispatch(clearSelectedInvoice())}
            onAuthorizeInvoice={handleAuthorizeInvoice}
            onFlagVariance={handleFlagVariance}
            onReleasePayment={handleReleasePayment}
          />
        )}
      </main>
    </div>
  )
}
