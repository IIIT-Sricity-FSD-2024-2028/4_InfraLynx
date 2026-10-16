import React, { useState } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import './styles/RateCardViewer.css'

export default function RateCardViewer() {
  const { contractors = [], amcRateCards = [] } = useTIMS()
  const [selectedDept, setSelectedDept] = useState('ALL')

  const filteredRateCards = selectedDept === 'ALL' ? amcRateCards : amcRateCards.filter((rc) => rc.department === selectedDept)

  return (
    <div className="rate-card-root">
      <div>
        <div className="section-header-group">
          <h2 className="section-main-title">Active Annual Maintenance Contracts (AMCs)</h2>
          <p className="section-sub-title">Empanelled vendor agreements with verified contractual rate schedules.</p>
        </div>
        <div className="contracts-grid">
          {contractors.map((c) => {
            const domainText = Array.isArray(c.departments) ? c.departments.join(', ') : c.department || c.service || 'Municipal Infrastructure'
            return (
              <div key={c.id} className="contract-card">
                <div className="contract-header">
                  <div>
                    <div className="contract-vendor-name">{c.name || c.company_name}</div>
                    <div className="contract-lead-info">Lead: {c.lead || c.contact_person || 'Field Lead'} · {c.phone || c.email || 'N/A'}</div>
                  </div>
                  <span className="contract-id-badge">{c.amcContractId || c.contract_number || 'AMC-ACTIVE'}</span>
                </div>
                <div className="contract-meta-list">
                  <div className="contract-meta-row">
                    <span>Authorized Domain:</span>
                    <span className="contract-meta-val">{domainText}</span>
                  </div>
                  <div className="contract-meta-row">
                    <span>Contract Status:</span>
                    <span className="contract-meta-val active">● {c.status || 'Active'}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rate-table-panel">
        <div className="rate-table-header-bar">
          <div className="rate-table-header-title">
            <h3>Master AMC Schedule of Rates</h3>
            <p>Mandatory ceiling rates used by Field Contractors for estimates and Finance for invoice audits.</p>
          </div>
          <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="rate-dept-select">
            <option value="ALL">All Departments</option>
            <option value="Electrical">Electrical</option>
            <option value="Civil">Civil</option>
            <option value="Water">Water</option>
          </select>
        </div>
        <table className="rates-master-table">
          <thead>
            <tr>
              <th>Item ID</th>
              <th>Service / Material Scope</th>
              <th>Department</th>
              <th>Billing Unit</th>
              <th className="text-right">Agreed AMC Rate</th>
            </tr>
          </thead>
          <tbody>
            {filteredRateCards.map((rc) => (
              <tr key={rc.id}>
                <td className="rate-item-id">{rc.id}</td>
                <td className="rate-service-title">{rc.service || rc.item_name || rc.itemName || 'Service Item'}</td>
                <td><span className="rate-dept-badge">{rc.department || 'General'}</span></td>
                <td className="rate-unit-text">Per {rc.unit}</td>
                <td className="rate-amount-val">₹{Number(rc.rate || 0).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
