import React, { useState } from 'react'
import FinanceDashboard from './FinanceDashboard.jsx'
import InvoiceAudit from './InvoiceAudit.jsx'
import RateCardViewer from './RateCardViewer.jsx'
import PaymentReleases from './PaymentReleases.jsx'
import { INITIAL_INVOICES } from './mockFinanceData.js'
import './styles/FinancePortal.css'

export default function FinancePortal({ onExitToLanding }) {
  // Navigation Tabs: 'dashboard' | 'audit' | 'rates' | 'releases'
  const [currentScreen, setCurrentScreen] = useState('dashboard')

  // In-memory Finance State
  const [invoices, setInvoices] = useState(INITIAL_INVOICES)
  const [activeInvoiceModal, setActiveInvoiceModal] = useState(null)
  const [notice, setNotice] = useState(null)

  const pendingAuditCount = invoices.filter((i) => i.auditStatus === 'PENDING_AUDIT').length
  const varianceCount = invoices.filter((i) => i.auditStatus === 'VARIANCE_FLAGGED').length

  function handleNavigate(screen) {
    setCurrentScreen(screen)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleOpenInvoice(invoice) {
    setActiveInvoiceModal(invoice)
  }

  function handleCloseInvoice() {
    setActiveInvoiceModal(null)
  }

  function handleAuthorizeInvoice(invoiceId) {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              auditStatus: 'AUTHORIZED',
              authorizedAt: new Date().toISOString(),
              authorizedBy: 'Sunil Agrawal (Finance Clerk)',
            }
          : inv
      )
    )

    const targeted = invoices.find((i) => i.id === invoiceId)
    setActiveInvoiceModal(null)
    setNotice(`Invoice ${invoiceId} (₹${targeted?.billedAmount?.toLocaleString('en-IN')}) successfully verified and authorized for staged payment release!`)
  }

  function handleFlagVariance(invoiceId, reason) {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              auditStatus: 'VARIANCE_FLAGGED',
              varianceReason: reason,
            }
          : inv
      )
    )

    setActiveInvoiceModal(null)
    setNotice(`Variance discrepancy flagged for ${invoiceId}. Clarification request sent to Contractor & Department Head.`)
  }

  function handleResetFinanceData() {
    if (window.confirm('Reset all in-memory invoice and financial records to default demo data?')) {
      setInvoices(INITIAL_INVOICES)
      setActiveInvoiceModal(null)
      setNotice(null)
      setCurrentScreen('dashboard')
    }
  }

  return (
    <div className="finance-shell">
      {/* Top Header */}
      <header className="finance-header">
        <div className="finance-header-top">
          {/* Brand & Role Tag */}
          <div className="finance-brand-group">
            <div
              className="finance-brand-link"
              onClick={() => handleNavigate('dashboard')}
            >
              <img
                src="/assets/CRIMS_logo.png"
                alt="TIMS Logo"
                className="finance-brand-logo"
              />
              <div>
                <span className="finance-brand-title">TIMS</span>
                <span className="finance-brand-sub">Township Infrastructure Management</span>
              </div>
            </div>

            <div className="finance-role-badge">
              <span className="finance-role-dot"></span>
              Finance & Billing Clerk
            </div>
          </div>

          {/* User Details & Exit */}
          <div className="finance-user-actions">
            <div className="finance-user-badge">
              <div className="finance-user-name">Sunil Agrawal</div>
              <div className="finance-user-role">Senior Finance Officer • AMC Accounts</div>
            </div>

            <button
              onClick={handleResetFinanceData}
              title="Reset in-memory finance records"
              className="finance-btn-reset"
            >
              ↺ Reset Data
            </button>

            {onExitToLanding && (
              <button
                onClick={onExitToLanding}
                className="finance-btn-exit"
              >
                Exit Portal ↗
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="finance-tabs-wrapper">
          <div className="finance-tabs-container">
            {[
              { id: 'dashboard', label: 'Financial Overview' },
              {
                id: 'audit',
                label: 'Invoice Audits & 3-Way Check',
                badge: pendingAuditCount > 0 ? pendingAuditCount : null,
              },
              { id: 'rates', label: 'AMC Rate Cards & Contracts' },
              { id: 'releases', label: 'Staged Fund Releases & Payouts' },
            ].map((tab) => {
              const isActive = currentScreen === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleNavigate(tab.id)}
                  className={`finance-tab-btn ${isActive ? 'active' : ''}`}
                >
                  {tab.label}
                  {tab.badge && (
                    <span className="finance-tab-badge">
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Main Container Body */}
      <main className="finance-main-container">
        {/* Notice Alert Banner if any action occurred */}
        {notice && (
          <div
            style={{
              padding: '14px 18px',
              background: '#ecfdf5',
              border: '1.5px solid #34d399',
              borderRadius: 'var(--radius-md)',
              color: 'var(--primary-darker)',
              fontWeight: 600,
              fontSize: '13.5px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>✓ {notice}</span>
            <button
              onClick={() => setNotice(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--primary-darker)',
                fontSize: '16px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {currentScreen === 'dashboard' && (
          <FinanceDashboard
            invoices={invoices}
            onNavigate={handleNavigate}
            onOpenInvoice={handleOpenInvoice}
            onAuthorizeInvoice={handleAuthorizeInvoice}
          />
        )}

        {currentScreen === 'audit' && (
          <InvoiceAudit
            invoices={invoices}
            activeInvoiceModal={activeInvoiceModal}
            onOpenInvoice={handleOpenInvoice}
            onCloseInvoice={handleCloseInvoice}
            onAuthorizeInvoice={handleAuthorizeInvoice}
            onFlagVariance={handleFlagVariance}
          />
        )}

        {currentScreen === 'rates' && <RateCardViewer />}

        {currentScreen === 'releases' && (
          <PaymentReleases invoices={invoices} />
        )}
      </main>
    </div>
  )
}
