import React, { useState, useEffect } from 'react'
import { financeApi } from '../../services/api.js'
import './styles/InvoiceAudit.css'

export default function InvoiceAudit({
  invoices = [],
  activeInvoiceModal,
  onOpenInvoice,
  onCloseInvoice,
  onAuthorizeInvoice,
  onFlagVariance,
  onReleasePayment,
}) {
  const [selectedDept, setSelectedDept] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [varianceReasonInput, setVarianceReasonInput] = useState('')
  const [showVarianceForm, setShowVarianceForm] = useState(false)
  const [reconciliationReport, setReconciliationReport] = useState(null)
  const [paymentMode, setPaymentMode] = useState('RTGS / Township Escrow')
  const [paymentReference, setPaymentReference] = useState('')
  const [isReleasing, setIsReleasing] = useState(false)

  useEffect(() => {
    if (activeInvoiceModal) {
      setPaymentMode(activeInvoiceModal.paymentMode || 'RTGS / Township Escrow')
      setPaymentReference(
        activeInvoiceModal.paymentReference ||
        activeInvoiceModal.bankReference ||
        `UTR-HDFC-${Math.floor(10000000000 + Math.random() * 90000000000)}`
      )
      setShowVarianceForm(false)
      setVarianceReasonInput('')
    }
  }, [activeInvoiceModal?.rawId, activeInvoiceModal?.id])

  useEffect(() => {
    if (!activeInvoiceModal) { setReconciliationReport(null); return }
    let isMounted = true
    const targetId = activeInvoiceModal.rawId || activeInvoiceModal.id
    financeApi.get3WayCheck(targetId)
      .then((report) => { if (isMounted) setReconciliationReport(report) })
      .catch((err) => console.warn('[InvoiceAudit] 3-way check:', err.message))
    return () => { isMounted = false }
  }, [activeInvoiceModal?.rawId, activeInvoiceModal?.id])

  const filteredInvoices = (invoices || []).filter((inv) => {
    if (selectedDept !== 'ALL' && inv.department !== selectedDept) return false
    if (selectedStatus !== 'ALL' && inv.auditStatus !== selectedStatus && inv.status !== selectedStatus) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const contractorName = inv.contractor?.name || inv.contractor?.company_name || ''
      if (
        !(inv.id || '').toLowerCase().includes(q) &&
        !(inv.title || '').toLowerCase().includes(q) &&
        !contractorName.toLowerCase().includes(q) &&
        !(inv.workOrderId || '').toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  async function handleAuthorizeClick(invoice, keepOpen = true) {
    if (invoice.rwaVerified === false) {
      alert('Cannot authorize payment: RWA / Citizen on-ground verification is mandatory prior to financial payment authorization.')
      return
    }
    if (onAuthorizeInvoice) await onAuthorizeInvoice(invoice.rawId || invoice.id, keepOpen)
  }

  async function handleDisbursePaymentClick() {
    if (!activeInvoiceModal || !onReleasePayment) return
    setIsReleasing(true)
    try {
      await onReleasePayment(activeInvoiceModal.rawId || activeInvoiceModal.id, {
        paymentMode,
        paymentReference: paymentReference.trim() || `UTR-HDFC-${Math.floor(10000000000 + Math.random() * 90000000000)}`,
      })
    } catch (err) {
      console.warn('[InvoiceAudit] Disburse error:', err.message)
    } finally {
      setIsReleasing(false)
    }
  }

  function handleFlagClick(e) {
    e.preventDefault()
    if (!varianceReasonInput.trim()) return
    onFlagVariance(activeInvoiceModal?.rawId || activeInvoiceModal?.id, varianceReasonInput)
    setVarianceReasonInput('')
    setShowVarianceForm(false)
  }

  const currentStatus = activeInvoiceModal?.auditStatus || activeInvoiceModal?.status || 'PENDING_AUDIT'

  return (
    <div className="invoice-audit-root">
      {/* Filter Controls */}
      <div className="audit-controls-bar">
        <div className="audit-filter-group">
          <input
            type="text"
            placeholder="Search by Invoice ID, WO#, Contractor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="audit-search-input"
          />
          <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="audit-select-filter">
            <option value="ALL">All Departments</option>
            <option value="Civil">Civil Infrastructure</option>
            <option value="Electrical">Electrical Systems</option>
            <option value="Water">Water &amp; Sanitation</option>
          </select>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="audit-select-filter">
            <option value="ALL">All Audit Statuses</option>
            <option value="PENDING_AUDIT">Pending Audit</option>
            <option value="VARIANCE_FLAGGED">Variance Flagged</option>
            <option value="AUTHORIZED">Authorized for Payout</option>
            <option value="PAID">Disbursed / Settled</option>
          </select>
        </div>
        <div className="audit-count-summary">
          Showing <strong>{filteredInvoices.length}</strong> of {invoices.length} invoices
        </div>
      </div>

      {/* Invoices Table */}
      <div className="audit-table-wrapper">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Invoice / Work Order</th>
              <th>Task &amp; Contractor</th>
              <th>Estimate vs Billed</th>
              <th>Variance</th>
              <th>Audit Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr><td colSpan="6" className="audit-empty-row">No invoices match the selected filter criteria.</td></tr>
            ) : filteredInvoices.map((inv) => {
              const status = inv.auditStatus || inv.status || 'PENDING_AUDIT'
              const isPending = status === 'PENDING_AUDIT'
              const isAuthorized = status === 'AUTHORIZED'
              const isPaid = status === 'PAID'
              const isFlagged = status === 'VARIANCE_FLAGGED'
              return (
                <tr key={inv.id}>
                  <td>
                    <div className="inv-row-id">{inv.id}</div>
                    <div className="inv-row-wo">WO: {inv.workOrderId}</div>
                    <div className="inv-row-doc">Doc: {inv.invoiceNumber}</div>
                  </td>
                  <td>
                    <div className="inv-row-title">{inv.title}</div>
                    <div className="inv-row-contractor">
                      {inv.contractor?.name || inv.contractor?.company_name || 'Authorized Contractor'} ({inv.department})
                    </div>
                  </td>
                  <td>
                    <div className="inv-row-amount"><span className="inv-row-used-label">Used: </span>₹{Number(inv.billedAmount || 0).toLocaleString('en-IN')}</div>
                    <div className="inv-row-estimate">Est: ₹{Number(inv.estimateAmount || 0).toLocaleString('en-IN')}</div>
                  </td>
                  <td>
                    {inv.varianceAmount === 0
                      ? <span className="variance-zero">₹0 (0%) ✓</span>
                      : <span className="variance-positive">+₹{Number(inv.varianceAmount || 0).toLocaleString('en-IN')} (+{inv.variancePercent || 0}%)</span>
                    }
                  </td>
                  <td>
                    {isPending && <span className="status-badge pending">Pending Audit</span>}
                    {isFlagged && <span className="status-badge flagged">Variance Flagged</span>}
                    {isAuthorized && <span className="status-badge authorized">Authorized ✓</span>}
                    {isPaid && <span className="status-badge paid">Disbursed ✓</span>}
                  </td>
                  <td className="inv-table-actions-cell">
                    <div className="inv-table-actions-group">
                      <button onClick={() => onOpenInvoice(inv)} className="btn-audit-details">3-Way Check</button>
                      {isPending && (
                        inv.rwaVerified === false
                          ? <button onClick={() => onOpenInvoice(inv)} className="btn-awaiting-rwa" title="Work awaiting on-ground RWA verification before authorization">⏳ Awaiting RWA</button>
                          : <button onClick={() => handleAuthorizeClick(inv, false)} className="btn-audit-action">Authorize</button>
                      )}
                      {isAuthorized && <button onClick={() => onOpenInvoice(inv)} className="btn-release-table" title="Directly release payout for this authorized invoice">⚡ Release Payment</button>}
                      {isPaid && <button onClick={() => onOpenInvoice(inv)} className="btn-voucher-table">🧾 View Voucher</button>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Invoice Detail Modal */}
      {activeInvoiceModal && (
        <div className="audit-modal-overlay" onClick={onCloseInvoice}>
          <div className="audit-modal-box" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="audit-modal-header">
              <div>
                <div className="audit-modal-subtitle">Municipal Invoice Audit &amp; Settlement</div>
                <h3>{activeInvoiceModal.id} — {activeInvoiceModal.title}</h3>
              </div>
              <div className="audit-modal-header-actions">
                {currentStatus === 'AUTHORIZED' && <span className="audit-badge-authorized">Authorized for Release ✓</span>}
                {currentStatus === 'PAID' && <span className="audit-badge-paid">Disbursed &amp; Settled ✓</span>}
                <button onClick={onCloseInvoice} className="audit-modal-close-btn">✕</button>
              </div>
            </div>

            {/* Body */}
            <div className="audit-modal-body">
              {/* 3-Way Summary */}
              <div className="three-way-check-grid">
                <div className="three-way-col">
                  <span className="three-way-label">1. Money Estimated</span>
                  <span className="three-way-val">₹{Number(activeInvoiceModal.estimateAmount || 0).toLocaleString('en-IN')}</span>
                  <span className="three-way-status">Approved Estimate ✓</span>
                </div>
                <div className="three-way-col">
                  <span className="three-way-label">2. RWA Verification</span>
                  <span className="three-way-val">{activeInvoiceModal.rwaVerified ? 'Confirmed' : 'Pending'}</span>
                  <span className="three-way-status">{activeInvoiceModal.rwaVerified ? 'Work Signed Off ✓' : 'Awaiting RWA'}</span>
                </div>
                <div className="three-way-col">
                  <span className="three-way-label">3. Money Used</span>
                  <span className="three-way-val">₹{Number(activeInvoiceModal.billedAmount || 0).toLocaleString('en-IN')}</span>
                  <span className={`three-way-status ${activeInvoiceModal.varianceAmount > 0 ? 'alert' : ''}`}>
                    {activeInvoiceModal.varianceAmount > 0
                      ? `Variance: +₹${Number(activeInvoiceModal.varianceAmount).toLocaleString('en-IN')}`
                      : '100% Price Matched ✓'}
                  </span>
                </div>
              </div>

              {/* Work Order Summary Bar */}
              <div className="wo-summary-bar">
                <div>
                  <strong>Work Order:</strong> {activeInvoiceModal.workOrderId} · Status: <strong>{activeInvoiceModal.workOrder?.status || 'COMPLETED'}</strong>
                </div>
                <div className="wo-summary-amounts">
                  <span><strong>Money Estimated:</strong> <span className="wo-est-text">₹{Number(activeInvoiceModal.estimateAmount || 0).toLocaleString('en-IN')}</span></span>
                  <span><strong>Money Used:</strong> <span className="wo-used-text">₹{Number(activeInvoiceModal.billedAmount || 0).toLocaleString('en-IN')}</span></span>
                </div>
              </div>

              {/* Reconciliation Banner */}
              {reconciliationReport && (() => {
                const isMatch = reconciliationReport.compliance?.reconciliationStatus === 'MATCH'
                return (
                  <div className={`reconciliation-banner ${isMatch ? 'match' : 'warning'}`}>
                    <div className="reconciliation-banner-content">
                      <span className="reconciliation-icon">{isMatch ? '✓' : '⚠️'}</span>
                      <div>
                        <strong className={`reconciliation-title ${isMatch ? 'match' : 'warning'}`}>
                          Reconciliation Status: {isMatch ? '100% MATCH' : reconciliationReport.compliance?.reconciliationStatus}
                        </strong>
                        <div className="reconciliation-desc">{reconciliationReport.compliance?.message}</div>
                      </div>
                    </div>
                    <span className={`reconciliation-badge ${reconciliationReport.compliance?.rateCardMatch ? 'compliant' : 'mismatch'}`}>
                      {reconciliationReport.compliance?.rateCardMatch ? 'Rate Card Compliant ✓' : 'Rate Card Mismatch'}
                    </span>
                  </div>
                )
              })()}

              {/* Payment Release Card */}
              {currentStatus === 'AUTHORIZED' && (
                <div className="payout-card">
                  <div className="payout-card-header">
                    <div>
                      <h4 className="payout-card-title">Release Payment</h4>
                      <p className="payout-card-subtitle">
                        To <strong>{activeInvoiceModal.contractor?.name || 'Empanelled Contractor'}</strong> · Bank A/C <code>{activeInvoiceModal.contractor?.accountNumber || 'HDFC0004928192831'}</code>
                      </p>
                    </div>
                    <div className="payout-card-amount">₹{Number(activeInvoiceModal.billedAmount || 0).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="payout-card-controls">
                    <div className="payout-control-group">
                      <label className="payout-label">Payment Method</label>
                      <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="payout-select">
                        <option value="NEFT / Bank Transfer">NEFT / Bank Transfer</option>
                        <option value="RTGS / Township Escrow">RTGS / Township Escrow</option>
                        <option value="Direct Treasury Wire">Direct Treasury Wire</option>
                      </select>
                    </div>
                    <div className="payout-control-group payout-control-grow">
                      <label className="payout-label">Transaction Ref (UTR)</label>
                      <input
                        type="text"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="UTR Reference Number"
                        className="payout-input"
                      />
                    </div>
                    <div className="payout-action-group">
                      <button onClick={handleDisbursePaymentClick} disabled={isReleasing} className="btn-payout-release">
                        {isReleasing ? 'Releasing...' : 'Release Payment →'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Voucher */}
              {currentStatus === 'PAID' && (
                <div className="voucher-container">
                  <div className="voucher-top-bar">
                    <div>
                      <div className="voucher-tag">Official Municipal Disbursement Voucher</div>
                      <h4 className="voucher-id">VOUCH-{activeInvoiceModal.id}</h4>
                    </div>
                    <div className="voucher-amount-box">
                      <div className="voucher-amount-label">Settled in Escrow</div>
                      <div className="voucher-amount-val">₹{Number(activeInvoiceModal.billedAmount || 0).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                  <div className="voucher-meta-grid">
                    <div><strong>Beneficiary Vendor:</strong> {activeInvoiceModal.contractor?.name || 'Contractor'}</div>
                    <div><strong>Department:</strong> {activeInvoiceModal.department}</div>
                    <div><strong>Payment Mode:</strong> {activeInvoiceModal.paymentMode || paymentMode}</div>
                    <div><strong>Bank UTR:</strong> <span className="voucher-utr-mono">{activeInvoiceModal.paymentReference || activeInvoiceModal.bankReference || paymentReference}</span></div>
                  </div>
                  <div className="voucher-settlement-alert">
                    🔒 <strong>Settlement Confirmation:</strong> Funds cleared and settled directly into vendor&apos;s registered bank account. Linked Work Order marked CLOSED.
                  </div>
                </div>
              )}

              {/* Contractor & AMC Info */}
              <div className="contractor-amc-bar">
                <div>
                  <strong>Contractor:</strong>{' '}
                  {activeInvoiceModal.contractor?.name || activeInvoiceModal.contractor?.company_name || 'Authorized Contractor'} ·{' '}
                  <span className="contractor-amc-code">{activeInvoiceModal.contractor?.amcContractId || 'AMC-GEN'}</span>
                </div>
                <div>
                  <strong>GSTIN:</strong>{' '}
                  <span className="contractor-gstin-code">{activeInvoiceModal.contractor?.gstin || 'N/A'}</span>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h4 className="line-items-header">Contractual Rate Card Itemization</h4>
                <table className="line-items-table">
                  <thead>
                    <tr>
                      <th>Service / Item</th>
                      <th>Unit</th>
                      <th>Contract AMC Rate</th>
                      <th>Est. Qty</th>
                      <th>Billed Qty</th>
                      <th className="text-right">Total Billed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reconciliationReport?.itemsBreakdown || activeInvoiceModal.items || []).map((item, idx) => {
                      const rate = Number(item.amcRate ?? item.rate ?? 0)
                      const estQty = Number(item.estimatedQty ?? item.quantity ?? 1)
                      const billedQty = Number(item.billedQty ?? item.quantity ?? 1)
                      const total = Number(item.total ?? item.amount ?? rate * billedQty ?? 0)
                      const isVerified = item.rateCardVerified !== false
                      return (
                        <tr key={idx}>
                          <td className="item-service-title">
                            {item.description || 'Maintenance Service'}
                            {item.rateCardVerified !== undefined && (
                              <span className={`item-rate-badge ${isVerified ? 'match' : 'over'}`}>
                                {isVerified ? 'AMC Match ✓' : 'Rate Over Ceiling ⚠️'}
                              </span>
                            )}
                          </td>
                          <td>{item.unit || 'job'}</td>
                          <td className="item-mono-cell">₹{rate.toLocaleString('en-IN')}</td>
                          <td className="item-qty-cell">{estQty}</td>
                          <td className={`item-qty-cell ${billedQty > estQty ? 'exceeded' : ''}`}>{billedQty} {billedQty > estQty && '⚠️'}</td>
                          <td className="item-total-cell">₹{total.toLocaleString('en-IN')}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Variance Note */}
              {currentStatus === 'VARIANCE_FLAGGED' && activeInvoiceModal.varianceReason && (
                <div className="variance-note-box">
                  <strong>⚠️ Variance Flag Note:</strong> {activeInvoiceModal.varianceReason}
                </div>
              )}

              {/* Flag Variance Form */}
              {showVarianceForm && (
                <form onSubmit={handleFlagClick} className="variance-flag-form">
                  <label className="variance-form-label">Describe Variance / Investigation Reason:</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Quantity billed exceeds estimate by 4 units without prior Dept Head authorization..."
                    value={varianceReasonInput}
                    onChange={(e) => setVarianceReasonInput(e.target.value)}
                    className="variance-form-textarea"
                  />
                  <div className="variance-form-actions">
                    <button type="button" onClick={() => setShowVarianceForm(false)} className="btn-variance-cancel">Cancel</button>
                    <button type="submit" className="btn-variance-confirm">Confirm Variance Flag</button>
                  </div>
                </form>
              )}

              {/* RWA Pending Alert */}
              {currentStatus === 'PENDING_AUDIT' && activeInvoiceModal.rwaVerified === false && (
                <div className="rwa-pending-alert">
                  <span className="rwa-pending-icon">⚠️</span>
                  <div>
                    <strong>RWA Verification Pending:</strong> Physical on-ground inspection and confirmation by the RWA Representative is mandatory. Payment authorization is locked until RWA verifies the fix.
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="audit-modal-footer">
              <button onClick={onCloseInvoice} className="btn-modal-close">Close View</button>
              {currentStatus === 'PENDING_AUDIT' && !showVarianceForm && (
                <>
                  <button onClick={() => setShowVarianceForm(true)} className="btn-modal-flag">Flag Variance Discrepancy</button>
                  <button
                    onClick={() => handleAuthorizeClick(activeInvoiceModal, true)}
                    disabled={activeInvoiceModal.rwaVerified === false}
                    className={`btn-audit-action btn-modal-auth ${activeInvoiceModal.rwaVerified === false ? 'locked' : ''}`}
                    title={activeInvoiceModal.rwaVerified === false ? 'Locked: Awaiting RWA Ground Verification' : 'Authorize payment and open payment release'}
                  >
                    {activeInvoiceModal.rwaVerified === false
                      ? '🔒 Locked (Awaiting RWA)'
                      : `Authorize Payment (₹${Number(activeInvoiceModal.billedAmount || 0).toLocaleString('en-IN')}) ✓`}
                  </button>
                </>
              )}
              {currentStatus === 'PAID' && (
                <button
                  onClick={() => alert(`Municipal Voucher VOUCH-${activeInvoiceModal.id} downloaded successfully.`)}
                  className="btn-modal-download"
                >
                  📥 Download Voucher PDF
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
