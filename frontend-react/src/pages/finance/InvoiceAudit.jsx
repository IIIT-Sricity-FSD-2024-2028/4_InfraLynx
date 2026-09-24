import React, { useState } from 'react'
import './styles/InvoiceAudit.css'

export default function InvoiceAudit({
  invoices,
  activeInvoiceModal,
  onOpenInvoice,
  onCloseInvoice,
  onAuthorizeInvoice,
  onFlagVariance,
}) {
  const [selectedDept, setSelectedDept] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [varianceReasonInput, setVarianceReasonInput] = useState('')
  const [showVarianceForm, setShowVarianceForm] = useState(false)

  // Filter invoices according to selected criteria
  const filteredInvoices = invoices.filter((inv) => {
    if (selectedDept !== 'ALL' && inv.department !== selectedDept) return false
    if (selectedStatus !== 'ALL' && inv.auditStatus !== selectedStatus) return false
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      const matchId = inv.id.toLowerCase().includes(q)
      const matchTitle = inv.title.toLowerCase().includes(q)
      const matchContractor = inv.contractor.name.toLowerCase().includes(q)
      const matchWo = inv.workOrderId.toLowerCase().includes(q)
      if (!matchId && !matchTitle && !matchContractor && !matchWo) return false
    }
    return true
  })

  function handleAuthorizeClick(invoiceId) {
    onAuthorizeInvoice(invoiceId)
  }

  function handleFlagClick(e) {
    e.preventDefault()
    if (!varianceReasonInput.trim()) return
    onFlagVariance(activeInvoiceModal.id, varianceReasonInput)
    setVarianceReasonInput('')
    setShowVarianceForm(false)
  }

  return (
    <div className="invoice-audit-root">
      {/* Top Filter Controls */}
      <div className="audit-controls-bar">
        <div className="audit-filter-group">
          <input
            type="text"
            placeholder="Search by Invoice ID, WO#, Contractor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="audit-search-input"
          />

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="audit-select-filter"
          >
            <option value="ALL">All Departments</option>
            <option value="Civil">Civil Infrastructure</option>
            <option value="Electrical">Electrical Systems</option>
            <option value="Water">Water & Sanitation</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="audit-select-filter"
          >
            <option value="ALL">All Audit Statuses</option>
            <option value="PENDING_AUDIT">Pending Audit</option>
            <option value="VARIANCE_FLAGGED">Variance Flagged</option>
            <option value="AUTHORIZED">Payment Authorized</option>
            <option value="PAID">Disbursed / Paid</option>
          </select>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-soft)', fontWeight: 600 }}>
          Showing <strong>{filteredInvoices.length}</strong> of {invoices.length} invoices
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="audit-table-wrapper">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Invoice / Work Order</th>
              <th>Task & Contractor</th>
              <th>Estimate vs Billed</th>
              <th>Variance</th>
              <th>Audit Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-soft)' }}>
                  No invoices match the selected filter criteria.
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => {
                const isFlagged = inv.auditStatus === 'VARIANCE_FLAGGED'
                const isPending = inv.auditStatus === 'PENDING_AUDIT'
                const isAuthorized = inv.auditStatus === 'AUTHORIZED' || inv.auditStatus === 'PAID'

                return (
                  <tr key={inv.id}>
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--primary-darker)' }}>
                        {inv.id}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-soft)', marginTop: '2px' }}>
                        WO: {inv.workOrderId}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-soft)' }}>
                        Doc: {inv.invoiceNumber}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{inv.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '2px' }}>
                        {inv.contractor.name} ({inv.department})
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 800, fontSize: '14.5px', color: 'var(--text)' }}>
                        ₹{inv.billedAmount.toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-soft)', marginTop: '2px' }}>
                        Est: ₹{inv.estimateAmount.toLocaleString('en-IN')}
                      </div>
                    </td>

                    <td>
                      {inv.varianceAmount === 0 ? (
                        <span style={{ fontSize: '12px', color: 'var(--primary-dark)', fontWeight: 700 }}>
                          ₹0 (0%) ✓
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--accent-red)', fontWeight: 700 }}>
                          +₹{inv.varianceAmount.toLocaleString('en-IN')} (+{inv.variancePercent}%)
                        </span>
                      )}
                    </td>

                    <td>
                      {inv.auditStatus === 'PENDING_AUDIT' && (
                        <span className="status-badge pending">Pending Audit</span>
                      )}
                      {inv.auditStatus === 'VARIANCE_FLAGGED' && (
                        <span className="status-badge flagged">Variance Flagged</span>
                      )}
                      {inv.auditStatus === 'AUTHORIZED' && (
                        <span className="status-badge authorized">Authorized ✓</span>
                      )}
                      {inv.auditStatus === 'PAID' && (
                        <span className="status-badge paid">Disbursed</span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => onOpenInvoice(inv)}
                          className="btn-audit-details"
                        >
                          3-Way Check
                        </button>

                        {isPending && (
                          <button
                            onClick={() => handleAuthorizeClick(inv.id)}
                            className="btn-audit-action"
                          >
                            Authorize
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 3-Way Reconciliation Verification Modal */}
      {activeInvoiceModal && (
        <div className="audit-modal-overlay" onClick={onCloseInvoice}>
          <div className="audit-modal-box" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="audit-modal-header">
              <div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-soft)', textTransform: 'uppercase', fontWeight: 700 }}>
                  3-Way Financial Reconciliation Audit
                </div>
                <h3>{activeInvoiceModal.id} — {activeInvoiceModal.title}</h3>
              </div>
              <button
                onClick={onCloseInvoice}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: 'var(--text-soft)',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="audit-modal-body">
              {/* 3-Way Summary Grid */}
              <div className="three-way-check-grid">
                <div className="three-way-col">
                  <span className="three-way-label">1. Approved Estimate</span>
                  <span className="three-way-val">₹{activeInvoiceModal.estimateAmount.toLocaleString('en-IN')}</span>
                  <span className="three-way-status">Approved by Dept Head ✓</span>
                </div>

                <div className="three-way-col">
                  <span className="three-way-label">2. RWA Verification</span>
                  <span className="three-way-val">{activeInvoiceModal.rwaVerified ? 'Confirmed' : 'Pending'}</span>
                  <span className="three-way-status">
                    {activeInvoiceModal.rwaVerified ? 'Work Signed Off ✓' : 'Awaiting RWA'}
                  </span>
                </div>

                <div className="three-way-col">
                  <span className="three-way-label">3. Billed Invoice</span>
                  <span className="three-way-val">₹{activeInvoiceModal.billedAmount.toLocaleString('en-IN')}</span>
                  <span className={`three-way-status ${activeInvoiceModal.varianceAmount > 0 ? 'alert' : ''}`}>
                    {activeInvoiceModal.varianceAmount > 0
                      ? `Variance: +₹${activeInvoiceModal.varianceAmount.toLocaleString('en-IN')}`
                      : '100% Price Matched ✓'}
                  </span>
                </div>
              </div>

              {/* Contractor & AMC Info */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: '#f8faf8',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--line)',
                  fontSize: '13px',
                }}
              >
                <div>
                  <strong>Contractor:</strong> {activeInvoiceModal.contractor.name} ·{' '}
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{activeInvoiceModal.contractor.amcContractId}</span>
                </div>
                <div>
                  <strong>GSTIN:</strong>{' '}
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{activeInvoiceModal.contractor.gstin}</span>
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <h4 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text)' }}>
                  Contractual Rate Card Itemization
                </h4>
                <table className="line-items-table">
                  <thead>
                    <tr>
                      <th>Service / Item</th>
                      <th>Unit</th>
                      <th>Contract AMC Rate</th>
                      <th>Est. Qty</th>
                      <th>Billed Qty</th>
                      <th style={{ textAlign: 'right' }}>Total Billed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeInvoiceModal.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{item.description}</td>
                        <td>{item.unit}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>₹{item.amcRate}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{item.estimatedQty}</td>
                        <td
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: item.billedQty > item.estimatedQty ? 800 : 500,
                            color: item.billedQty > item.estimatedQty ? 'var(--accent-red)' : 'inherit',
                          }}
                        >
                          {item.billedQty} {item.billedQty > item.estimatedQty && '⚠️'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          ₹{item.total.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Variance details if flagged */}
              {activeInvoiceModal.varianceReason && (
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    color: '#991b1b',
                  }}
                >
                  <strong>⚠️ Variance Flag Note:</strong> {activeInvoiceModal.varianceReason}
                </div>
              )}

              {/* Flag Discrepancy Form */}
              {showVarianceForm ? (
                <form
                  onSubmit={handleFlagClick}
                  style={{
                    padding: '14px',
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#92400e' }}>
                    Describe Variance / Investigation Reason:
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Quantity billed exceeds estimate by 4 units without prior Dept Head authorization..."
                    value={varianceReasonInput}
                    onChange={(e) => setVarianceReasonInput(e.target.value)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #d97706',
                      fontSize: '13px',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setShowVarianceForm(false)}
                      style={{ padding: '6px 12px', fontSize: '12.5px', background: '#fff', border: '1px solid var(--line)', borderRadius: '4px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: '6px 14px',
                        fontSize: '12.5px',
                        background: '#dc2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Confirm Variance Flag
                    </button>
                  </div>
                </form>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="audit-modal-footer">
              <button
                onClick={onCloseInvoice}
                style={{
                  padding: '9px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--line-strong)',
                  background: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close View
              </button>

              {activeInvoiceModal.auditStatus === 'PENDING_AUDIT' && !showVarianceForm && (
                <>
                  <button
                    onClick={() => setShowVarianceForm(true)}
                    style={{
                      padding: '9px 16px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--accent-red)',
                      background: '#ffffff',
                      color: 'var(--accent-red)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Flag Variance Discrepancy
                  </button>

                  <button
                    onClick={() => handleAuthorizeClick(activeInvoiceModal.id)}
                    className="btn-audit-action"
                    style={{ padding: '9px 18px', fontSize: '13px' }}
                  >
                    Authorize Payment (₹{activeInvoiceModal.billedAmount.toLocaleString('en-IN')}) ✓
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
