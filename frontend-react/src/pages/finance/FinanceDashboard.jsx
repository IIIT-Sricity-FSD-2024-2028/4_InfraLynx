import React from 'react'
import { DEPARTMENT_BUDGETS } from './mockFinanceData.js'
import './styles/FinanceDashboard.css'

export default function FinanceDashboard({
  invoices,
  onNavigate,
  onOpenInvoice,
  onAuthorizeInvoice,
}) {
  // Calculate key financial metrics from active state
  const pendingInvoices = invoices.filter((i) => i.auditStatus === 'PENDING_AUDIT')
  const flaggedInvoices = invoices.filter((i) => i.auditStatus === 'VARIANCE_FLAGGED')
  const authorizedInvoices = invoices.filter((i) => i.auditStatus === 'AUTHORIZED' || i.auditStatus === 'PAID')

  const totalBilledMTD = invoices.reduce((acc, curr) => acc + curr.billedAmount, 0)
  const totalVarianceAmount = invoices.reduce((acc, curr) => acc + curr.varianceAmount, 0)
  const totalAuthorized = authorizedInvoices.reduce((acc, curr) => acc + curr.billedAmount, 0)

  return (
    <div className="finance-dashboard-root">
      {/* Welcome Banner */}
      <div className="finance-welcome-card">
        <div className="finance-welcome-info">
          <h2>AMC Billing & Financial Audit Command</h2>
          <p>
            Township Municipal Accounts · Fiscal Year 2025–26 · 3-Way Rate Card Reconciliation
          </p>
        </div>
        <div className="finance-quick-actions">
          <button
            onClick={() => onNavigate('audit')}
            className="btn-audit-now"
          >
            Audit Pending Invoices ({pendingInvoices.length}) →
          </button>
          <button
            onClick={() => onNavigate('rates')}
            className="btn-view-rates"
          >
            📋 AMC Rate Cards
          </button>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div className="finance-metrics-grid">
        <div className="finance-metric-card amber">
          <div className="metric-header">
            <span className="metric-label">Pending Invoices</span>
            <span className="metric-badge" style={{ background: '#fef3c7', color: '#b45309' }}>
              Requires Audit
            </span>
          </div>
          <div className="metric-value">{pendingInvoices.length}</div>
          <div className="metric-caption">
            ₹{pendingInvoices.reduce((a, b) => a + b.billedAmount, 0).toLocaleString('en-IN')} in queue
          </div>
        </div>

        <div className="finance-metric-card red">
          <div className="metric-header">
            <span className="metric-label">Variance Discrepancies</span>
            <span className="metric-badge" style={{ background: '#fee2e2', color: 'var(--accent-red)' }}>
              Over Budget
            </span>
          </div>
          <div className="metric-value">{flaggedInvoices.length}</div>
          <div className="metric-caption">
            +₹{totalVarianceAmount.toLocaleString('en-IN')} flagged variance
          </div>
        </div>

        <div className="finance-metric-card emerald">
          <div className="metric-header">
            <span className="metric-label">Authorized Releases</span>
            <span className="metric-badge" style={{ background: 'var(--primary-subtle)', color: 'var(--primary-darker)' }}>
              Verified ✓
            </span>
          </div>
          <div className="metric-value">₹{(totalAuthorized / 100000).toFixed(2)}L</div>
          <div className="metric-caption">
            {authorizedInvoices.length} invoices cleared for payment
          </div>
        </div>

        <div className="finance-metric-card blue">
          <div className="metric-header">
            <span className="metric-label">Total MTD Billed</span>
            <span className="metric-badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
              3 Departments
            </span>
          </div>
          <div className="metric-value">₹{(totalBilledMTD / 100000).toFixed(2)}L</div>
          <div className="metric-caption">Under 3 empanelled AMC contracts</div>
        </div>
      </div>

      {/* Split Section: Invoices Queue + Department Budgets */}
      <div className="finance-split-grid">
        {/* Left: Pending Invoices Awaiting Audit */}
        <div className="finance-panel-card">
          <div className="panel-title-bar">
            <h3>Recent Invoices Awaiting Audit & Verification</h3>
            <button
              onClick={() => onNavigate('audit')}
              className="panel-link"
            >
              View All Invoices ({invoices.length}) →
            </button>
          </div>

          <div className="pending-invoices-list">
            {invoices.slice(0, 3).map((inv) => {
              const isFlagged = inv.auditStatus === 'VARIANCE_FLAGGED'
              const isPending = inv.auditStatus === 'PENDING_AUDIT'

              return (
                <div key={inv.id} className="invoice-item-row">
                  <div>
                    <div className="inv-meta-group">
                      <span className="inv-code">{inv.id}</span>
                      <span className="inv-dept-pill">{inv.department}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-soft)' }}>
                        Linked: {inv.workOrderId}
                      </span>
                    </div>
                    <div className="inv-title">{inv.title}</div>
                    <div className="inv-contractor">
                      Contractor: <strong>{inv.contractor.name}</strong> ({inv.contractor.amcContractId})
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div className="inv-amount-box">
                      <div className="inv-amount">₹{inv.billedAmount.toLocaleString('en-IN')}</div>
                      <div className={`inv-variance-tag ${isFlagged ? 'flagged' : 'zero'}`}>
                        {inv.varianceAmount > 0
                          ? `+₹${inv.varianceAmount.toLocaleString('en-IN')} (${inv.variancePercent}%) Variance`
                          : '100% Rate Card Matched ✓'}
                      </div>
                    </div>

                    {isPending ? (
                      <button
                        onClick={() => onOpenInvoice(inv)}
                        className="btn-audit-now"
                        style={{ padding: '7px 12px', fontSize: '12.5px' }}
                      >
                        Audit 3-Way
                      </button>
                    ) : (
                      <button
                        onClick={() => onOpenInvoice(inv)}
                        className="btn-view-rates"
                        style={{ padding: '7px 12px', fontSize: '12.5px' }}
                      >
                        View Details
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Department Budget Utilization */}
        <div className="finance-panel-card">
          <div className="panel-title-bar">
            <h3>Department Budget Caps</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-soft)' }}>FY 2025–26</span>
          </div>

          <div className="budget-progress-list">
            {Object.entries(DEPARTMENT_BUDGETS).map(([dept, budget]) => {
              const percentUsed = Math.round((budget.spent / budget.allocated) * 100)
              const colorClass = dept.toLowerCase()

              return (
                <div key={dept} className="dept-budget-item">
                  <div className="dept-budget-head">
                    <span>{dept} Infrastructure</span>
                    <span>{percentUsed}% Used</span>
                  </div>
                  <div className="progress-bar-track">
                    <div
                      className={`progress-bar-fill ${colorClass}`}
                      style={{ width: `${percentUsed}%` }}
                    />
                  </div>
                  <div className="dept-budget-numbers">
                    <span>Spent: ₹{(budget.spent / 100000).toFixed(1)}L</span>
                    <span>Cap: ₹{(budget.allocated / 100000).toFixed(1)}L</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Notice */}
          <div
            style={{
              marginTop: '20px',
              padding: '12px 14px',
              background: '#f8faf8',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line)',
              fontSize: '12px',
              color: 'var(--text-soft)',
              lineHeight: '1.5',
            }}
          >
            💡 <strong>Section 13 Financial Policy:</strong> All work order estimates exceeding
            ₹2,00,000 mandate joint sign-off with Township COO before invoice processing.
          </div>
        </div>
      </div>
    </div>
  )
}
