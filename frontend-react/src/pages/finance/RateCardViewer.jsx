import React, { useState } from 'react'
import { INITIAL_CONTRACTORS, INITIAL_AMC_RATE_CARDS } from '../../context/initialData.js'
import './styles/RateCardViewer.css'

export default function RateCardViewer() {
  const [selectedDept, setSelectedDept] = useState('ALL')
  const [calcService, setCalcService] = useState('rate-01')
  const [calcQuantity, setCalcQuantity] = useState(4)

  const filteredRateCards = INITIAL_AMC_RATE_CARDS.filter((rc) => {
    if (selectedDept !== 'ALL' && rc.department !== selectedDept) return false
    return true
  })

  const selectedRateItem = INITIAL_AMC_RATE_CARDS.find((r) => r.id === calcService) || INITIAL_AMC_RATE_CARDS[0]
  const calculatedTotal = selectedRateItem.rate * (Number(calcQuantity) || 0)

  return (
    <div className="rate-card-root">
      {/* Empanelled AMC Contractors Grid */}
      <div>
        <div style={{ marginBottom: '14px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
            Active Annual Maintenance Contracts (AMCs)
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-soft)', marginTop: '2px' }}>
            Empanelled vendor agreements with verified contractual rate schedules.
          </p>
        </div>

        <div className="contracts-grid">
          {INITIAL_CONTRACTORS.map((c) => (
            <div key={c.id} className="contract-card">
              <div className="contract-header">
                <div>
                  <div className="contract-vendor-name">{c.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '2px' }}>
                    Lead: {c.lead} · {c.phone}
                  </div>
                </div>
                <span className="contract-id-badge">{c.amcContractId}</span>
              </div>

              <div className="contract-meta-list">
                <div className="contract-meta-row">
                  <span>Authorized Domain:</span>
                  <span className="contract-meta-val">{c.departments.join(', ')}</span>
                </div>
                <div className="contract-meta-row">
                  <span>Contract Status:</span>
                  <span className="contract-meta-val" style={{ color: 'var(--primary-dark)' }}>
                    ● {c.status}
                  </span>
                </div>
                <div className="contract-meta-row">
                  <span>Vendor Rating:</span>
                  <span className="contract-meta-val">⭐ {c.rating} / 5.0</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contractual Rate Card Explorer */}
      <div className="rate-table-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>
              Master AMC Schedule of Rates
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-soft)' }}>
              Mandatory ceiling rates used by Field Contractors for estimates and Finance for invoice audits.
            </p>
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line-strong)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <option value="ALL">All Departments</option>
            <option value="Electrical">Electrical</option>
            <option value="Civil">Civil</option>
            <option value="Water">Water</option>
          </select>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
          <thead>
            <tr style={{ background: '#f8faf8', borderBottom: '1px solid var(--line)' }}>
              <th style={{ padding: '12px 16px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Item ID</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Service / Material Scope</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Department</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Billing Unit</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-soft)', textAlign: 'right' }}>Agreed AMC Rate</th>
            </tr>
          </thead>
          <tbody>
            {filteredRateCards.map((rc) => (
              <tr key={rc.id} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary-darker)' }}>
                  {rc.id}
                </td>
                <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text)' }}>
                  {rc.service}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'var(--primary-subtle)',
                      color: 'var(--primary-darker)',
                    }}
                  >
                    {rc.department}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', color: 'var(--text-soft)' }}>
                  Per {rc.unit}
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
                  ₹{rc.rate.toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Quick Rate Estimator Calculator */}
        <div className="rate-calc-box">
          <div>
            <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text)' }}>
              ⚡ Quick AMC Rate Calculator
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '2px' }}>
              Test estimate calculations against agreed AMC ceiling pricing.
            </div>
          </div>

          <div className="rate-calc-inputs">
            <select
              value={calcService}
              onChange={(e) => setCalcService(e.target.value)}
              className="calc-select"
            >
              {INITIAL_AMC_RATE_CARDS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.service} (₹{r.rate}/{r.unit})
                </option>
              ))}
            </select>

            <input
              type="number"
              min="1"
              max="999"
              value={calcQuantity}
              onChange={(e) => setCalcQuantity(e.target.value)}
              className="calc-input"
              style={{ width: '80px' }}
            />
            <span style={{ fontSize: '13px', color: 'var(--text-soft)' }}>
              {selectedRateItem.unit}s =
            </span>

            <span className="calc-result">
              ₹{calculatedTotal.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
