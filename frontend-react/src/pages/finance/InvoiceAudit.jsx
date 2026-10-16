import React, { useState } from 'react'
import './styles/InvoiceAudit.css'

export default function InvoiceAudit({
  invoices = [],
  onOpenInvoice,
  onAuthorizeInvoice,
}) {
  const [selectedDept, setSelectedDept] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

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

  async function handleAuthorizeClick(invoice) {
    if (invoice.rwaVerified === false) {
      alert('Cannot authorize payment: RWA / Citizen on-ground verification is mandatory prior to financial payment authorization.')
      return
    }
    if (onAuthorizeInvoice) await onAuthorizeInvoice(invoice.rawId || invoice.id, false)
  }

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
                          : <button onClick={() => handleAuthorizeClick(inv)} className="btn-audit-action">Authorize</button>
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
    </div>
  )
}
