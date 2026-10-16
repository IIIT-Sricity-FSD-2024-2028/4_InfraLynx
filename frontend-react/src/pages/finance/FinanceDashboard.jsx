import React from 'react'
import './styles/FinanceDashboard.css'

export default function FinanceDashboard({ invoices = [], onNavigate, onOpenInvoice }) {
  const pendingInvoices = invoices.filter((i) => i.auditStatus === 'PENDING_AUDIT')
  const flaggedInvoices = invoices.filter((i) => i.auditStatus === 'VARIANCE_FLAGGED')
  const authorizedInvoices = invoices.filter((i) => i.auditStatus === 'AUTHORIZED' || i.auditStatus === 'PAID')
  const totalBilledMTD = invoices.reduce((acc, i) => acc + (i.billedAmount || 0), 0)
  const totalVarianceAmount = invoices.reduce((acc, i) => acc + (i.varianceAmount || 0), 0)
  const totalAuthorized = authorizedInvoices.reduce((acc, i) => acc + (i.billedAmount || 0), 0)

  const MetricCard = ({ color, label, badge, value, caption }) => (
    <div className={`finance-metric-card ${color}`}>
      <div className="metric-header">
        <span className="metric-label">{label}</span>
        <span className={`metric-badge ${color}`}>{badge}</span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-caption">{caption}</div>
    </div>
  )

  return (
    <div className="finance-dashboard-root">
      <div className="finance-welcome-card">
        <div className="finance-welcome-info">
          <h2>AMC Billing &amp; Financial Audit Command</h2>
          <p>Township Municipal Accounts · Fiscal Year 2025–26 · 3-Way Rate Card Reconciliation</p>
        </div>
        <div className="finance-quick-actions">
          <button onClick={() => onNavigate('audit')} className="btn-audit-now">Audit Pending Invoices ({pendingInvoices.length}) →</button>
          <button onClick={() => onNavigate('rates')} className="btn-view-rates">📋 AMC Rate Cards</button>
        </div>
      </div>

      <div className="finance-metrics-grid">
        <MetricCard color="amber" label="Pending Invoices" badge="Requires Audit"
          value={pendingInvoices.length}
          caption={`₹${pendingInvoices.reduce((a, b) => a + (b.billedAmount || 0), 0).toLocaleString('en-IN')} in queue`}
        />
        <MetricCard color="red" label="Variance Discrepancies" badge="Over Budget"
          value={flaggedInvoices.length}
          caption={`+₹${totalVarianceAmount.toLocaleString('en-IN')} flagged variance`}
        />
        <MetricCard color="emerald" label="Authorized Releases" badge="Verified ✓"
          value={`₹${(totalAuthorized / 100000).toFixed(2)}L`}
          caption={`${authorizedInvoices.length} invoices cleared for payment`}
        />
        <MetricCard color="blue" label="Total MTD Billed" badge="3 Departments"
          value={`₹${(totalBilledMTD / 100000).toFixed(2)}L`}
          caption="Under 3 empanelled AMC contracts"
        />
      </div>

      <div className="finance-split-grid">
        <div className="finance-panel-card">
          <div className="panel-title-bar">
            <h3>Recent Invoices Awaiting Audit &amp; Verification</h3>
            <button onClick={() => onNavigate('audit')} className="panel-link">View All Invoices ({invoices.length}) →</button>
          </div>
          <div className="pending-invoices-list">
            {invoices.slice(0, 3).map((inv) => {
              const isPending = inv.auditStatus === 'PENDING_AUDIT'
              const isFlagged = inv.auditStatus === 'VARIANCE_FLAGGED'
              return (
                <div key={inv.id} className="invoice-item-row">
                  <div>
                    <div className="inv-meta-group">
                      <span className="inv-code">{inv.id}</span>
                      <span className="inv-dept-pill">{inv.department}</span>
                      <span className="inv-linked-wo">Linked: {inv.workOrderId}</span>
                    </div>
                    <div className="inv-title">{inv.title}</div>
                    <div className="inv-contractor">
                      Contractor: <strong>{inv.contractor?.name || inv.contractor?.company_name || 'Authorized Contractor'}</strong> ({inv.contractor?.amcContractId || 'AMC-GEN'})
                    </div>
                  </div>
                  <div className="inv-actions-group">
                    <div className="inv-amount-box">
                      <div className="inv-amount">₹{Number(inv.billedAmount || 0).toLocaleString('en-IN')}</div>
                      <div className={`inv-variance-tag ${isFlagged ? 'flagged' : 'zero'}`}>
                        {inv.varianceAmount > 0 ? `+₹${Number(inv.varianceAmount || 0).toLocaleString('en-IN')} (${inv.variancePercent || 0}%) Variance` : '100% Rate Card Matched ✓'}
                      </div>
                    </div>
                    <button onClick={() => onOpenInvoice(inv)} className={`${isPending ? 'btn-audit-now' : 'btn-view-rates'} btn-compact`}>
                      {isPending ? 'Audit 3-Way' : 'View Details'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
