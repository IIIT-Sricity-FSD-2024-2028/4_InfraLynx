import { useState, useMemo, useEffect } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'

export default function AmcEstimateBuilder({
  jobs = [],
  selectedJob,
  onSelectJob,
  onSubmitEstimate,
  onNavigate,
}) {
  const { amcRateCards = [] } = useTIMS()

  const [activeJobId, setActiveJobId] = useState(selectedJob ? selectedJob.id : (jobs[0]?.id || ''))
  const currentJob = jobs.find((j) => j.id === activeJobId) || selectedJob || jobs[0]

  // Filter rate cards matching the job category (or all if general)
  const availableRateCards = useMemo(() => {
    if (!currentJob) return amcRateCards
    const cat = (currentJob.category || '').toLowerCase()
    const filtered = amcRateCards.filter(
      (r) => r.department?.toLowerCase() === cat || r.service?.toLowerCase().includes(cat)
    )
    return filtered.length > 0 ? filtered : amcRateCards
  }, [amcRateCards, currentJob])

  // Line items state
  // Default to the prompt's exact example: 2×₹500 + 3×₹300 + 10×₹150 = ₹3,400
  const [lineItems, setLineItems] = useState([
    { rateCardId: 'rate-01', service: 'Electrician', unit: 'Hour', rate: 500, qty: 2 },
    { rateCardId: 'rate-02', service: 'General Labour', unit: 'Hour', rate: 300, qty: 3 },
    { rateCardId: 'rate-03', service: 'Cable Work', unit: 'Meter', rate: 150, qty: 10 },
  ])

  const [justification, setJustification] = useState('')
  const [submittedMessage, setSubmittedMessage] = useState(null)

  // Sync if job has existing estimate or revision details
  useEffect(() => {
    if (currentJob?.estimate?.items && currentJob.estimate.items.length > 0) {
      setLineItems(currentJob.estimate.items)
      setJustification(currentJob.estimate.justification || '')
    } else {
      // Default initial line items
      setLineItems([
        { rateCardId: 'rate-01', service: 'Electrician', unit: 'Hour', rate: 500, qty: 2 },
        { rateCardId: 'rate-02', service: 'General Labour', unit: 'Hour', rate: 300, qty: 3 },
        { rateCardId: 'rate-03', service: 'Cable Work', unit: 'Meter', rate: 150, qty: 10 },
      ])
      setJustification('Work calculated strictly adhering to approved AMC Rate Card schedule.')
    }
  }, [currentJob])

  // Handle changing rate card selection for a row
  function handleRateCardChange(index, rateCardId) {
    const card = amcRateCards.find((r) => r.id === rateCardId)
    if (!card) return

    setLineItems((prev) => {
      const copy = [...prev]
      copy[index] = {
        rateCardId: card.id,
        service: card.service,
        unit: card.unit,
        rate: card.rate,
        qty: copy[index]?.qty || 1,
      }
      return copy
    })
  }

  // Handle changing quantity
  function handleQtyChange(index, val) {
    const num = Math.max(1, parseInt(val, 10) || 1)
    setLineItems((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], qty: num }
      return copy
    })
  }

  // Add new empty row
  function handleAddRow() {
    const firstAvailable = availableRateCards[0] || amcRateCards[0] || {
      id: 'rate-01',
      service: 'General Labour',
      unit: 'Hour',
      rate: 300,
    }
    setLineItems((prev) => [
      ...prev,
      {
        rateCardId: firstAvailable.id,
        service: firstAvailable.service,
        unit: firstAvailable.unit,
        rate: firstAvailable.rate,
        qty: 1,
      },
    ])
  }

  // Remove row
  function handleRemoveRow(index) {
    if (lineItems.length <= 1) return
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Reset to prompt example
  function handleLoadPromptExample() {
    setLineItems([
      { rateCardId: 'rate-01', service: 'Electrician', unit: 'Hour', rate: 500, qty: 2 },
      { rateCardId: 'rate-02', service: 'General Labour', unit: 'Hour', rate: 300, qty: 3 },
      { rateCardId: 'rate-03', service: 'Cable Work', unit: 'Meter', rate: 150, qty: 10 },
    ])
    setJustification('AMC Example Standard: 2×₹500 + 3×₹300 + 10×₹150 = ₹3,400')
  }

  // Calculations
  const calculatedItems = useMemo(() => {
    return lineItems.map((item) => ({
      ...item,
      subtotal: (Number(item.qty) || 0) * (Number(item.rate) || 0),
    }))
  }, [lineItems])

  const totalEstimate = useMemo(() => {
    return calculatedItems.reduce((acc, curr) => acc + curr.subtotal, 0)
  }, [calculatedItems])

  // Calculation formula string for the callout
  const formulaString = useMemo(() => {
    return calculatedItems.map((i) => `${i.qty}×₹${i.rate}`).join(' + ') + ` = ₹${totalEstimate.toLocaleString('en-IN')}`
  }, [calculatedItems, totalEstimate])

  const exceedsThreshold = totalEstimate > 10000

  // Form submit
  function handleSubmit(e) {
    e.preventDefault()
    if (!currentJob) return

    const estimateData = {
      items: calculatedItems,
      total: totalEstimate,
      justification,
      submittedAt: new Date().toISOString(),
      status: exceedsThreshold ? 'PENDING_APPROVAL' : 'APPROVED',
    }

    const nextStatus = exceedsThreshold ? 'AWAITING_DEPT_HEAD' : 'IN_PROGRESS'
    onSubmitEstimate(currentJob.id, estimateData, nextStatus)

    setSubmittedMessage(
      `Estimate of ₹${totalEstimate.toLocaleString('en-IN')} submitted for ${currentJob.workOrderId || currentJob.id}. ${
        exceedsThreshold
          ? 'Forwarded to Department Head (exceeds ₹10,000 threshold).'
          : 'Ready for work execution.'
      }`
    )

    setTimeout(() => {
      onSelectJob({ ...currentJob, estimate: estimateData, status: nextStatus })
      onNavigate('approvals')
    }, 1200)
  }

  if (!currentJob) {
    return (
      <div className="contractor-card" style={{ textAlign: 'center', padding: 48 }}>
        <h3>No Work Order Selected</h3>
        <p style={{ color: 'var(--text-soft)' }}>Please select a job from the Work Orders tab.</p>
        <button onClick={() => onNavigate('workorders')} className="btn-contractor-primary" style={{ marginTop: 16 }}>
          View Work Orders &rarr;
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <button
            onClick={() => onNavigate('workorders')}
            className="btn-contractor-ghost"
            style={{ padding: 0, marginBottom: 4 }}
          >
            &larr; Back to Work Orders
          </button>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            AMC Contractual Estimate Builder
          </h1>
          <p style={{ color: 'var(--text-soft)', fontSize: 13.5, margin: '2px 0 0' }}>
            Screen 4: Select empanelled AMC rate items — automatic quantity × contractual rate computation.
          </p>
        </div>

        {/* Work Order Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Job:</label>
          <select
            value={currentJob.id}
            onChange={(e) => {
              setActiveJobId(e.target.value)
              const sel = jobs.find((j) => j.id === e.target.value)
              if (sel) onSelectJob(sel)
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line-strong)',
              fontSize: 13,
              fontWeight: 600,
              background: '#ffffff',
            }}
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.workOrderId || j.id} — {j.title.slice(0, 32)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {submittedMessage && (
        <div
          style={{
            padding: '14px 18px',
            background: '#ecfdf5',
            border: '1.5px solid #10b981',
            borderRadius: 'var(--radius-md)',
            color: '#065f46',
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 20,
          }}
        >
          ✓ {submittedMessage}
        </div>
      )}

      {/* Dept Head Revision Alert if in revision status */}
      {currentJob.status === 'REVISION_REQUESTED' && (
        <div
          style={{
            background: '#fff7ed',
            border: '1.5px solid #fdba74',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 800, color: '#9a3412', fontSize: 14.5 }}>
              Department Head Revision Notice
            </div>
            <div style={{ fontSize: 13.5, color: '#7c2d12', marginTop: 3 }}>
              {currentJob.estimate?.revisionReason ||
                'Please adjust general labour or material quantities to align with municipal rate card ceilings.'}
            </div>
          </div>
        </div>
      )}

      {/* Job Context Overview Strip */}
      <div
        className="contractor-card"
        style={{
          padding: '14px 20px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          background: '#f8fafc',
        }}
      >
        <div>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            TARGET WORK ORDER
          </span>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
            {currentJob.workOrderId || currentJob.id} — {currentJob.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>
            Asset: {currentJob.location?.assetName} • Sector: {currentJob.location?.sector}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleLoadPromptExample}
            className="btn-contractor-secondary"
            style={{ fontSize: 12 }}
            title="Pre-populate 2×₹500 + 3×₹300 + 10×₹150 = ₹3,400"
          >
            ⚡ Load AMC Standard Preset (₹3,400)
          </button>
          <button
            type="button"
            onClick={() => onNavigate('inspection')}
            className="btn-contractor-secondary"
            style={{ fontSize: 12 }}
          >
            🔍 View Inspection Data
          </button>
        </div>
      </div>

      {/* Main AMC Line Items Form Card */}
      <div className="contractor-card" style={{ border: '1.5px solid var(--line-strong)' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                Contractual Line Items
              </h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-soft)', margin: '2px 0 0' }}>
                Unit and rate are locked by the empanelled AMC Agreement ({currentJob.category || 'Electrical'} Schedule)
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddRow}
              className="btn-contractor-secondary"
              style={{ fontSize: 12.5 }}
            >
              + Add Item
            </button>
          </div>

          {/* Table of Line Items */}
          <div className="contractor-table-wrap" style={{ marginBottom: 20 }}>
            <table className="contractor-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>AMC Service / Material Item</th>
                  <th style={{ width: '15%' }}>Unit</th>
                  <th style={{ width: '15%' }}>Contractual Rate</th>
                  <th style={{ width: '15%' }}>Quantity / Hours</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>Subtotal (₹)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {calculatedItems.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <select
                        value={item.rateCardId}
                        onChange={(e) => handleRateCardChange(idx, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--line-strong)',
                          fontSize: 13,
                          fontWeight: 600,
                          background: '#ffffff',
                        }}
                      >
                        {amcRateCards.map((rc) => (
                          <option key={rc.id} value={rc.id}>
                            {rc.service} ({rc.department}) — ₹{rc.rate}/{rc.unit}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <span
                        style={{
                          padding: '4px 8px',
                          background: '#f1f5f9',
                          borderRadius: 4,
                          fontSize: 12,
                          fontFamily: 'var(--font-mono)',
                          color: '#475569',
                          fontWeight: 600,
                        }}
                      >
                        {item.unit}
                      </span>
                    </td>

                    <td>
                      <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 13.5 }}>
                        ₹{item.rate}
                      </strong>
                    </td>

                    <td>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={item.qty}
                        onChange={(e) => handleQtyChange(idx, e.target.value)}
                        style={{
                          width: 80,
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--line-strong)',
                          fontSize: 13.5,
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                        }}
                      />
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <strong
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 14,
                          color: '#0369a1',
                        }}
                      >
                        ₹{item.subtotal.toLocaleString('en-IN')}
                      </strong>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={lineItems.length <= 1}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: lineItems.length <= 1 ? '#cbd5e1' : '#ef4444',
                          cursor: lineItems.length <= 1 ? 'not-allowed' : 'pointer',
                          fontSize: 16,
                          fontWeight: 700,
                        }}
                        title="Remove row"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Automatic Calculation Callout (Prompt Example Match) */}
          <div className="formula-callout">
            <div>
              <span style={{ fontSize: 11, textTransform: 'uppercase', display: 'block', color: '#166534', fontWeight: 700 }}>
                AMC CALCULATION BREAKDOWN
              </span>
              <strong style={{ fontSize: 15, letterSpacing: '0.02em' }}>{formulaString}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 11, textTransform: 'uppercase', display: 'block', color: '#166534', fontWeight: 700 }}>
                TOTAL ESTIMATE
              </span>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#15803d' }}>
                ₹{totalEstimate.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Threshold Notice Box */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: exceedsThreshold ? '#fff7ed' : '#f0f9ff',
              border: exceedsThreshold ? '1px solid #fdba74' : '1px solid #bae6fd',
              fontSize: 12.5,
              color: exceedsThreshold ? '#9a3412' : '#0369a1',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 18 }}>{exceedsThreshold ? 'ℹ️' : '✓'}</span>
            <span>
              {exceedsThreshold ? (
                <>
                  <strong>Requires Department Head Approval:</strong> Estimate exceeds the ₹10,000 threshold. Upon submission, it will be placed in the Department Head's Approval Queue.
                </>
              ) : (
                <>
                  <strong>Desk-Level Authority:</strong> Estimate is within standard threshold (≤ ₹10,000). Pre-authorized under AMC contract terms for immediate execution dispatch.
                </>
              )}
            </span>
          </div>

          {/* Scope & Justification Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              Technical Estimate Justification & Scope Remarks
            </label>
            <textarea
              rows={2}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="e.g. Standard rate card repair for blown driver, cable replacement and ground labour..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line-strong)',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => onNavigate('workorders')}
              className="btn-contractor-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-contractor-primary"
              style={{ padding: '11px 24px', fontSize: 14 }}
            >
              Submit AMC Estimate (₹{totalEstimate.toLocaleString('en-IN')}) &rarr;
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
