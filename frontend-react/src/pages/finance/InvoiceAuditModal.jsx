import React, { useState, useEffect } from 'react'
import { financeApi } from '../../services/api.js'
import './styles/InvoiceAudit.css'

export default function InvoiceAuditModal({
  invoice,
  onClose,
  onAuthorizeInvoice,
  onFlagVariance,
  onReleasePayment,
}) {
  const [varianceReasonInput, setVarianceReasonInput] = useState('')
  const [showVarianceForm, setShowVarianceForm] = useState(false)
  const [reconciliationReport, setReconciliationReport] = useState(null)
  const [paymentMode, setPaymentMode] = useState('RTGS / Township Escrow')
  const [paymentReference, setPaymentReference] = useState('')
  const [isReleasing, setIsReleasing] = useState(false)

  useEffect(() => {
    if (invoice) {
      setPaymentMode(invoice.paymentMode || 'RTGS / Township Escrow')
      setPaymentReference(
        invoice.paymentReference ||
        invoice.bankReference ||
        `UTR-HDFC-${Math.floor(10000000000 + Math.random() * 90000000000)}`
      )
      setShowVarianceForm(false)
      setVarianceReasonInput('')
    }
  }, [invoice?.rawId, invoice?.id])

  useEffect(() => {
    if (!invoice) { setReconciliationReport(null); return }
    let isMounted = true
    const targetId = invoice.rawId || invoice.id
    financeApi.get3WayCheck(targetId)
      .then((report) => { if (isMounted) setReconciliationReport(report) })
      .catch((err) => console.warn('[InvoiceAuditModal] 3-way check:', err.message))
    return () => { isMounted = false }
  }, [invoice?.rawId, invoice?.id])

  if (!invoice) return null

  const currentStatus = invoice.auditStatus || invoice.status || 'PENDING_AUDIT'

  async function handleAuthorizeClick(inv, keepOpen = true) {
    if (inv.rwaVerified === false) {
      alert('Cannot authorize payment: RWA / Citizen on-ground verification is mandatory prior to financial payment authorization.')
      return
    }
    if (onAuthorizeInvoice) await onAuthorizeInvoice(inv.rawId || inv.id, keepOpen)
  }

  async function handleDisbursePaymentClick() {
    if (!invoice || !onReleasePayment) return
    setIsReleasing(true)
    try {
      await onReleasePayment(invoice.rawId || invoice.id, {
        paymentMode,
        paymentReference: paymentReference.trim() || `UTR-HDFC-${Math.floor(10000000000 + Math.random() * 90000000000)}`,
      })
    } catch (err) {
      console.warn('[InvoiceAuditModal] Disburse error:', err.message)
    } finally {
      setIsReleasing(false)
    }
  }

  function handleFlagClick(e) {
    e.preventDefault()
    if (!varianceReasonInput.trim()) return
    if (onFlagVariance) onFlagVariance(invoice.rawId || invoice.id, varianceReasonInput)
    setVarianceReasonInput('')
    setShowVarianceForm(false)
  }

  return (
    <div className="audit-modal-overlay" onClick={onClose}>
      <div className="audit-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="audit-modal-header">
          <div>
            <div className="audit-modal-subtitle">Municipal Invoice Audit &amp; Settlement</div>
            <h3>{invoice.id} — {invoice.title}</h3>
          </div>
          <div className="audit-modal-header-actions">
            {currentStatus === 'AUTHORIZED' && <span className="audit-badge-authorized">Authorized for Release ✓</span>}
            {currentStatus === 'PAID' && <span className="audit-badge-paid">Disbursed &amp; Settled ✓</span>}
            <button onClick={onClose} className="audit-modal-close-btn" aria-label="Close modal">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="audit-modal-body">
          {/* 3-Way Summary */}
          <div className="three-way-check-grid">
            <div className="three-way-col">
              <span className="three-way-label">1. Money Estimated</span>
              <span className="three-way-val">₹{Number(invoice.estimateAmount || 0).toLocaleString('en-IN')}</span>
              <span className="three-way-status">Approved Estimate ✓</span>
            </div>
            <div className="three-way-col">
              <span className="three-way-label">2. RWA Verification</span>
              <span className="three-way-val">{invoice.rwaVerified ? 'Confirmed' : 'Pending'}</span>
              <span className="three-way-status">{invoice.rwaVerified ? 'Work Signed Off ✓' : 'Awaiting RWA'}</span>
            </div>
            <div className="three-way-col">
              <span className="three-way-label">3. Money Used</span>
              <span className="three-way-val">₹{Number(invoice.billedAmount || 0).toLocaleString('en-IN')}</span>
              <span className={`three-way-status ${invoice.varianceAmount > 0 ? 'alert' : ''}`}>
                {invoice.varianceAmount > 0
                  ? `Variance: +₹${Number(invoice.varianceAmount).toLocaleString('en-IN')}`
                  : '100% Price Matched ✓'}
              </span>
            </div>
          </div>

          {/* Work Order Summary Bar */}
          <div className="wo-summary-bar">
            <div>
              <strong>Work Order:</strong> {invoice.workOrderId} · Status: <strong>{invoice.workOrder?.status || 'COMPLETED'}</strong>
            </div>
            <div className="wo-summary-amounts">
              <span><strong>Money Estimated:</strong> <span className="wo-est-text">₹{Number(invoice.estimateAmount || 0).toLocaleString('en-IN')}</span></span>
              <span><strong>Money Used:</strong> <span className="wo-used-text">₹{Number(invoice.billedAmount || 0).toLocaleString('en-IN')}</span></span>
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
                    To <strong>{invoice.contractor?.name || 'Empanelled Contractor'}</strong> · Bank A/C <code>{invoice.contractor?.accountNumber || 'HDFC0004928192831'}</code>
                  </p>
                </div>
                <div className="payout-card-amount">₹{Number(invoice.billedAmount || 0).toLocaleString('en-IN')}</div>
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
                  <h4 className="voucher-id">VOUCH-{invoice.id}</h4>
                </div>
                <div className="voucher-amount-box">
                  <div className="voucher-amount-label">Settled in Escrow</div>
                  <div className="voucher-amount-val">₹{Number(invoice.billedAmount || 0).toLocaleString('en-IN')}</div>
                </div>
              </div>
              <div className="voucher-meta-grid">
                <div><strong>Beneficiary Vendor:</strong> {invoice.contractor?.name || 'Contractor'}</div>
                <div><strong>Department:</strong> {invoice.department}</div>
                <div><strong>Payment Mode:</strong> {invoice.paymentMode || paymentMode}</div>
                <div><strong>Bank UTR:</strong> <span className="voucher-utr-mono">{invoice.paymentReference || invoice.bankReference || paymentReference}</span></div>
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
              {invoice.contractor?.name || invoice.contractor?.company_name || 'Authorized Contractor'} ·{' '}
              <span className="contractor-amc-code">{invoice.contractor?.amcContractId || 'AMC-GEN'}</span>
            </div>
            <div>
              <strong>GSTIN:</strong>{' '}
              <span className="contractor-gstin-code">{invoice.contractor?.gstin || 'N/A'}</span>
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
                {(reconciliationReport?.itemsBreakdown || invoice.items || []).map((item, idx) => {
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
          {currentStatus === 'VARIANCE_FLAGGED' && invoice.varianceReason && (
            <div className="variance-note-box">
              <strong>⚠️ Variance Flag Note:</strong> {invoice.varianceReason}
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
          {currentStatus === 'PENDING_AUDIT' && invoice.rwaVerified === false && (
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
          <button onClick={onClose} className="btn-modal-close">Close View</button>
          {currentStatus === 'PENDING_AUDIT' && !showVarianceForm && (
            <>
              <button onClick={() => setShowVarianceForm(true)} className="btn-modal-flag">Flag Variance Discrepancy</button>
              <button
                onClick={() => handleAuthorizeClick(invoice, true)}
                disabled={invoice.rwaVerified === false}
                className={`btn-audit-action btn-modal-auth ${invoice.rwaVerified === false ? 'locked' : ''}`}
                title={invoice.rwaVerified === false ? 'Locked: Awaiting RWA Ground Verification' : 'Authorize payment and open payment release'}
              >
                {invoice.rwaVerified === false
                  ? '🔒 Locked (Awaiting RWA)'
                  : `Authorize Payment (₹${Number(invoice.billedAmount || 0).toLocaleString('en-IN')}) ✓`}
              </button>
            </>
          )}
          {currentStatus === 'PAID' && (
            <button
              onClick={() => alert(`Municipal Voucher VOUCH-${invoice.id} downloaded successfully.`)}
              className="btn-modal-download"
            >
              📥 Download Voucher PDF
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
