import React, { useState } from 'react'
import { INITIAL_DISBURSEMENTS } from './mockFinanceData.js'
import './styles/PaymentReleases.css'

export default function PaymentReleases({ invoices }) {
  const [disbursements, setDisbursements] = useState(INITIAL_DISBURSEMENTS)
  const [selectedDisbursement, setSelectedDisbursement] = useState(null)

  const authorizedInvoices = invoices.filter((i) => i.auditStatus === 'AUTHORIZED')

  function handleCreateBatch() {
    if (authorizedInvoices.length === 0) {
      alert('No authorized invoices available to create a disbursement batch.')
      return
    }

    const totalAmt = authorizedInvoices.reduce((a, b) => a + b.billedAmount, 0)
    const newDisb = {
      id: `DISB-2026-00${disbursements.length + 44}`,
      batchId: `BATCH-2026-09-B`,
      date: new Date().toISOString(),
      contractorName: 'Consolidated Municipal Batch',
      department: 'Multi-Department',
      invoiceCount: authorizedInvoices.length,
      totalAmount: totalAmt,
      paymentMode: 'RTGS / Township Escrow',
      bankReference: `UTR-HDFC-${Math.floor(10000000000 + Math.random() * 90000000000)}`,
      status: 'SCHEDULED',
    }

    setDisbursements([newDisb, ...disbursements])
    alert(`Disbursement Batch ${newDisb.batchId} scheduled for payout!`)
  }

  function handleProcessPayout(id) {
    setDisbursements(
      disbursements.map((d) => (d.id === id ? { ...d, status: 'DISBURSED' } : d))
    )
    alert('Bank RTGS transfer processed and disbursement marked as DISBURSED ✓')
  }

  return (
    <div className="payment-releases-root">
      {/* Top Banner */}
      <div className="releases-banner">
        <div className="releases-banner-info">
          <h2>Staged Payment Releases & Bank Disbursements</h2>
          <p>
            Audit-approved invoices batched for automated escrow and RTGS vendor releases.
          </p>
        </div>

        <button onClick={handleCreateBatch} className="btn-new-batch">
          + Create Payout Batch ({authorizedInvoices.length} Ready)
        </button>
      </div>

      {/* Disbursement Batches List */}
      <div className="disbursement-card-list">
        {disbursements.map((disb) => {
          const isDisbursed = disb.status === 'DISBURSED'

          return (
            <div key={disb.id} className="disbursement-card">
              <div className="disb-main-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="disb-batch-id">{disb.batchId}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
                    Ref: {disb.id}
                  </span>
                  <span
                    className={`disb-status-pill ${
                      isDisbursed ? 'disbursed' : 'scheduled'
                    }`}
                  >
                    {isDisbursed ? 'DISBURSED ✓' : 'SCHEDULED ESCROW'}
                  </span>
                </div>

                <div className="disb-contractor">{disb.contractorName}</div>
                <div className="disb-meta">
                  Department: <strong>{disb.department}</strong> · Invoices in Batch:{' '}
                  <strong>{disb.invoiceCount}</strong> · Mode: {disb.paymentMode}
                </div>
                <div style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-soft)', marginTop: '2px' }}>
                  Bank UTR Ref: {disb.bankReference}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="disb-amount-box">
                  <div className="disb-amount">
                    ₹{disb.totalAmount.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
                    {new Date(disb.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {!isDisbursed && (
                    <button
                      onClick={() => handleProcessPayout(disb.id)}
                      className="btn-audit-now"
                      style={{ padding: '7px 14px', fontSize: '12.5px' }}
                    >
                      Release Funds →
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedDisbursement(disb)}
                    className="btn-view-rates"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    View Voucher
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Digital Payment Voucher Modal */}
      {selectedDisbursement && (
        <div
          className="audit-modal-overlay"
          onClick={() => setSelectedDisbursement(null)}
        >
          <div
            className="audit-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '540px' }}
          >
            <div className="audit-modal-header">
              <h3>Municipal Payment Voucher</h3>
              <button
                onClick={() => setSelectedDisbursement(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div className="audit-modal-body" style={{ gap: '14px' }}>
              <div
                style={{
                  padding: '16px',
                  background: '#f8faf8',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>Voucher Ref</div>
                  <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                    {selectedDisbursement.id}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>Total Disbursed</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary-dark)' }}>
                    ₹{selectedDisbursement.totalAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div><strong>Beneficiary:</strong> {selectedDisbursement.contractorName}</div>
                <div><strong>Department:</strong> {selectedDisbursement.department}</div>
                <div><strong>Payment Gateway:</strong> {selectedDisbursement.paymentMode}</div>
                <div><strong>Bank UTR Reference:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedDisbursement.bankReference}</span></div>
                <div><strong>Status:</strong> {selectedDisbursement.status}</div>
              </div>
            </div>

            <div className="audit-modal-footer">
              <button
                onClick={() => {
                  alert('Voucher receipt downloaded (PDF).')
                  setSelectedDisbursement(null)
                }}
                className="btn-audit-now"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                📥 Download Voucher PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
