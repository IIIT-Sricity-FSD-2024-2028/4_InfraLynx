import React, { useState, useEffect } from 'react'
import FinanceDashboard from './FinanceDashboard.jsx'
import InvoiceAudit from './InvoiceAudit.jsx'
import InvoiceAuditModal from './InvoiceAuditModal.jsx'
import RateCardViewer from './RateCardViewer.jsx'
import { financeApi } from '../../services/api.js'
import { useTIMS } from '../../context/TIMSContext.jsx'
import './styles/FinancePortal.css'

export default function FinancePortal({ onExitToLanding }) {
  const { currentUser, refreshComplaints } = useTIMS()
  const [currentScreen, setCurrentScreen] = useState('dashboard')
  const [invoices, setInvoices] = useState([])
  const [activeInvoiceModal, setActiveInvoiceModal] = useState(null)
  const [notice, setNotice] = useState(null)

  const loadInvoices = async () => {
    try {
      const data = await financeApi.getInvoices()
      if (Array.isArray(data)) setInvoices(data)
    } catch (err) {
      console.warn('[FinancePortal] Invoices fetch error:', err.message)
    }
  }

  useEffect(() => { loadInvoices() }, [currentScreen])

  // Keep activeInvoiceModal in sync when invoices list updates
  useEffect(() => {
    if (activeInvoiceModal) {
      const updated = invoices.find(
        (i) => (i.rawId && i.rawId === activeInvoiceModal.rawId) || i.id === activeInvoiceModal.id
      )
      if (updated && (updated.auditStatus !== activeInvoiceModal.auditStatus || updated.status !== activeInvoiceModal.status)) {
        setActiveInvoiceModal(updated)
      }
    }
  }, [invoices])

  const pendingAuditCount = invoices.filter((i) => i.auditStatus === 'PENDING_AUDIT').length

  function handleNavigate(screen) {
    setCurrentScreen(screen)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const safeRefresh = async () => {
    try { if (refreshComplaints) await refreshComplaints() } catch (_) {}
  }

  async function handleAuthorizeInvoice(invoiceId, keepOpen = false) {
    const inv = invoices.find((i) => i.id === invoiceId || i.rawId === invoiceId)
    if (inv?.rwaVerified === false) {
      alert('Cannot authorize invoice: RWA / Citizen on-ground verification is mandatory prior to financial payment authorization.')
      return false
    }
    try {
      await financeApi.authorizeInvoice(inv?.rawId || invoiceId)
    } catch (err) {
      alert(err.message || 'Authorization failed.')
      return false
    }
    await loadInvoices()
    await safeRefresh()
    setActiveInvoiceModal((prev) => prev ? { ...prev, auditStatus: 'AUTHORIZED', status: 'AUTHORIZED' } : null)
    if (!keepOpen) setActiveInvoiceModal(null)
    setNotice(`Invoice ${inv?.id || invoiceId} (₹${inv?.billedAmount?.toLocaleString('en-IN')}) successfully authorized! You can now disburse escrow payment.`)
    return true
  }

  async function handleReleasePayment(invoiceId, paymentConfig) {
    const inv = invoices.find((i) => i.id === invoiceId || i.rawId === invoiceId)
    try {
      const result = await financeApi.releasePayment(inv?.rawId || invoiceId, paymentConfig)
      await loadInvoices()
      await safeRefresh()
      setActiveInvoiceModal((prev) => prev
        ? { ...prev, auditStatus: 'PAID', status: 'PAID', paymentMode: paymentConfig.paymentMode, paymentReference: paymentConfig.paymentReference, bankReference: paymentConfig.paymentReference, disbursedAt: new Date().toISOString() }
        : null
      )
      setNotice(`✓ Payment of ₹${Number(inv?.billedAmount || 0).toLocaleString('en-IN')} disbursed for ${inv?.id || invoiceId}! Bank UTR: ${paymentConfig.paymentReference}`)
      return result
    } catch (err) {
      alert(err.message || 'Payment release failed. Please try again.')
      throw err
    }
  }

  async function handleFlagVariance(invoiceId, reason) {
    const inv = invoices.find((i) => i.id === invoiceId || i.rawId === invoiceId)
    try {
      await financeApi.flagVariance(inv?.rawId || invoiceId, reason)
    } catch (err) {
      alert(err.message || 'Failed to flag variance.')
      return
    }
    await loadInvoices()
    setActiveInvoiceModal(null)
    setNotice(`Variance discrepancy flagged for ${inv?.id || invoiceId}. Clarification request sent to Contractor & Department Head.`)
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
            <button onClick={() => setNotice(null)} className="finance-notice-close">✕</button>
          </div>
        )}
        {currentScreen === 'dashboard' && (
          <FinanceDashboard
            invoices={invoices}
            onNavigate={handleNavigate}
            onOpenInvoice={setActiveInvoiceModal}
            onAuthorizeInvoice={handleAuthorizeInvoice}
          />
        )}
        {currentScreen === 'audit' && (
          <InvoiceAudit
            invoices={invoices}
            onOpenInvoice={setActiveInvoiceModal}
            onAuthorizeInvoice={handleAuthorizeInvoice}
          />
        )}
        {currentScreen === 'rates' && <RateCardViewer />}

        {/* Global Invoice Audit & Details Modal */}
        {activeInvoiceModal && (
          <InvoiceAuditModal
            invoice={activeInvoiceModal}
            onClose={() => setActiveInvoiceModal(null)}
            onAuthorizeInvoice={handleAuthorizeInvoice}
            onFlagVariance={handleFlagVariance}
            onReleasePayment={handleReleasePayment}
          />
        )}
      </main>
    </div>
  )
}
