import { useState, useMemo, useEffect } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import './styles/AmcEstimateBuilder.css'

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

  // Line items state - starts empty; contractor adds items manually per inspection
  const [lineItems, setLineItems] = useState(() => {
    if (selectedJob?.estimate?.items && selectedJob.estimate.items.length > 0) {
      return selectedJob.estimate.items
    }
    return []
  })

  const [justification, setJustification] = useState('')
  const [submittedMessage, setSubmittedMessage] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [touched, setTouched] = useState(false)

  // Validation function
  function validateForm(items = lineItems, just = justification) {
    const errors = {}

    if (!items || items.length === 0) {
      errors.items = 'Please add at least one contractual AMC line item to build the estimate.'
    } else {
      const hasInvalidQty = items.some((it) => !it.qty || Number(it.qty) <= 0 || isNaN(Number(it.qty)))
      if (hasInvalidQty) {
        errors.quantity = 'Every item must have a valid quantity / hour count of at least 1.'
      }
    }

    if (!just || just.trim().length < 10) {
      errors.justification = 'Technical justification & scope remarks are required (minimum 10 characters).'
    }

    return errors
  }

  // Sync if job has existing estimate or revision details
  useEffect(() => {
    if (currentJob?.estimate?.items && currentJob.estimate.items.length > 0) {
      setLineItems(currentJob.estimate.items)
      setJustification(currentJob.estimate.justification || '')
    } else {
      // Start empty - contractor adds items manually
      setLineItems([])
      setJustification('')
    }
    setFormErrors({})
    setSubmittedMessage(null)
    setTouched(false)
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
      if (touched) {
        setFormErrors(validateForm(copy, justification))
      }
      return copy
    })
  }

  // Handle changing quantity
  function handleQtyChange(index, val) {
    const num = val === '' ? '' : parseInt(val, 10)
    setLineItems((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], qty: num }
      if (touched) {
        setFormErrors(validateForm(copy, justification))
      }
      return copy
    })
  }

  // Add new row with first available rate card
  function handleAddRow() {
    const firstAvailable = availableRateCards[0] || amcRateCards[0] || {
      id: 'rate-01',
      service: 'General Labour',
      unit: 'Hour',
      rate: 300,
    }
    const newItems = [
      ...lineItems,
      {
        rateCardId: firstAvailable.id,
        service: firstAvailable.service,
        unit: firstAvailable.unit,
        rate: firstAvailable.rate,
        qty: 1,
      },
    ]
    setLineItems(newItems)
    if (touched) {
      setFormErrors(validateForm(newItems, justification))
    }
  }

  // Remove row
  function handleRemoveRow(index) {
    const next = lineItems.filter((_, i) => i !== index)
    setLineItems(next)
    if (touched) {
      setFormErrors(validateForm(next, justification))
    }
  }

  function handleJustificationChange(e) {
    const val = e.target.value
    setJustification(val)
    if (touched) {
      setFormErrors(validateForm(lineItems, val))
    }
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
    if (calculatedItems.length === 0) return '0 items selected (click + Add Item to begin)'
    return calculatedItems.map((i) => `${i.qty || 0}×₹${i.rate}`).join(' + ') + ` = ₹${totalEstimate.toLocaleString('en-IN')}`
  }, [calculatedItems, totalEstimate])

  const exceedsThreshold = totalEstimate > 10000

  // Form submit
  function handleSubmit(e) {
    e.preventDefault()
    if (!currentJob) return

    setTouched(true)
    const errors = validateForm(lineItems, justification)
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setFormErrors({})

    const estimateData = {
      items: calculatedItems,
      total: totalEstimate,
      justification: justification.trim(),
      submittedAt: new Date().toISOString(),
      status: exceedsThreshold ? 'PENDING_APPROVAL' : 'APPROVED',
    }

    const nextStatus = exceedsThreshold ? 'AWAITING_DEPT_HEAD' : 'IN_PROGRESS'
    onSubmitEstimate(currentJob.id, estimateData, nextStatus)

    setSubmittedMessage(
      `Estimate of ₹${totalEstimate.toLocaleString('en-IN')} submitted for ${currentJob.workOrderId || currentJob.id}. ${exceedsThreshold
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
      <div className="contractor-card estimate-empty-card">
        <h3>No Work Order Selected</h3>
        <p className="estimate-sub">Please select a job from the Work Orders tab.</p>
        <button onClick={() => onNavigate('workorders')} className="btn-contractor-primary" style={{ marginTop: 16 }}>
          View Work Orders &rarr;
        </button>
      </div>
    )
  }

  return (
    <div className="estimate-builder-root">
      {/* Header */}
      <div className="estimate-header">
        <div>
          <button
            onClick={() => onNavigate('workorders')}
            className="btn-contractor-ghost"
            style={{ padding: 0, marginBottom: 4 }}
          >
            &larr; Back to Work Orders
          </button>
          <h1 className="estimate-title">
            AMC Contractual Estimate Builder
          </h1>
          <p className="estimate-sub">
            Select empanelled AMC rate items — automatic quantity × contractual rate computation.
          </p>
        </div>

        {/* Work Order Switcher */}
        <div className="estimate-switcher">
          <label className="estimate-switcher-label">Job:</label>
          <select
            value={currentJob.id}
            onChange={(e) => {
              setActiveJobId(e.target.value)
              const sel = jobs.find((j) => j.id === e.target.value)
              if (sel) onSelectJob(sel)
            }}
            className="estimate-rate-select"
            style={{ width: 'auto', minWidth: 200 }}
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
        <div className="estimate-success-alert">
          ✓ {submittedMessage}
        </div>
      )}

      {/* Dept Head Revision Alert if in revision status */}
      {currentJob.status === 'REVISION_REQUESTED' && (
        <div className="estimate-threshold-warning exceeded" style={{ padding: '16px 20px', marginBottom: 20 }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14.5 }}>
              Department Head Revision Notice
            </div>
            <div style={{ fontSize: 13.5, marginTop: 3 }}>
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
            onClick={() => onNavigate('inspection')}
            className="btn-contractor-secondary"
            style={{ fontSize: 12.5 }}
          >
            🔍 View Inspection Data
          </button>
        </div>
      </div>

      {/* Main AMC Line Items Form Card */}
      <div className="contractor-card" style={{ border: '1.5px solid var(--line-strong)' }}>
        <form onSubmit={handleSubmit} noValidate>
          {/* Validation Errors Summary Banner */}
          {touched && Object.keys(formErrors).length > 0 && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                background: '#fef2f2',
                border: '1.5px solid #fca5a5',
                color: '#991b1b',
                fontSize: 13,
                marginBottom: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <span>Please resolve the following before submitting the estimate:</span>
              </div>
              <ul style={{ margin: '4px 0 0 24px', padding: 0, fontSize: 12.5, lineHeight: 1.5 }}>
                {formErrors.items && <li>{formErrors.items}</li>}
                {formErrors.quantity && <li>{formErrors.quantity}</li>}
                {formErrors.justification && <li>{formErrors.justification}</li>}
              </ul>
            </div>
          )}

          <div className="estimate-card-header">
            <div>
              <h3 className="estimate-card-title">
                Contractual Line Items
              </h3>
              <p className="estimate-card-sub">
                Unit and rate are locked by the empanelled AMC Agreement ({currentJob.category || 'Electrical'} Schedule)
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddRow}
              className="btn-contractor-primary"
              style={{ fontSize: 13, padding: '7px 16px' }}
            >
              + Add Item
            </button>
          </div>

          {/* Table of Line Items */}
          <div className="contractor-table-wrap" style={{ marginBottom: 20 }}>
            <table className="contractor-table estimate-items-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>AMC Service / Material Item</th>
                  <th style={{ width: '15%' }}>Unit</th>
                  <th style={{ width: '15%' }}>Contractual Rate</th>
                  <th style={{ width: '15%' }}>Quantity / Hours</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>Subtotal (₹)</th>
                  <th style={{ width: '5%', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '36px 20px', background: '#f8fafc' }}>
                      <div style={{ fontSize: 26, marginBottom: 6 }}>📋</div>
                      <strong style={{ display: 'block', fontSize: 14.5, color: 'var(--text)', marginBottom: 4 }}>
                        No AMC Line Items Added
                      </strong>
                      <p style={{ fontSize: 12.5, color: 'var(--text-soft)', margin: '0 0 14px' }}>
                        Line items are not pre-filled. Add required contractual services and materials for this job.
                      </p>
                      <button
                        type="button"
                        onClick={handleAddRow}
                        className="btn-contractor-primary"
                        style={{ fontSize: 13, padding: '7px 18px' }}
                      >
                        + Add First Item
                      </button>
                    </td>
                  </tr>
                ) : (
                  calculatedItems.map((item, idx) => {
                    const isQtyInvalid = touched && (!item.qty || Number(item.qty) <= 0 || isNaN(Number(item.qty)))
                    return (
                      <tr key={idx}>
                        <td>
                          <select
                            value={item.rateCardId}
                            onChange={(e) => handleRateCardChange(idx, e.target.value)}
                            className="estimate-rate-select"
                          >
                            {amcRateCards.map((rc) => (
                              <option key={rc.id} value={rc.id}>
                                {rc.service} ({rc.department}) — ₹{rc.rate}/{rc.unit}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>
                          <span className="contractor-category-tag">
                            {item.unit}
                          </span>
                        </td>

                        <td>
                          <strong className="estimate-rate-val">
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
                            className="estimate-qty-input"
                            style={{
                              borderColor: isQtyInvalid ? '#ef4444' : undefined,
                              backgroundColor: isQtyInvalid ? '#fff5f5' : undefined,
                            }}
                          />
                          {isQtyInvalid && (
                            <span style={{ display: 'block', color: '#dc2626', fontSize: 11, marginTop: 2 }}>
                              Min 1
                            </span>
                          )}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <strong className="estimate-subtotal-val">
                            ₹{item.subtotal.toLocaleString('en-IN')}
                          </strong>
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="estimate-del-btn"
                            title="Remove row"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Automatic Calculation Callout */}
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
          <div className={`estimate-threshold-warning ${exceedsThreshold ? 'exceeded' : ''}`} style={{ marginBottom: 20 }}>
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
          <div className="estimate-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="estimate-label">
                Technical Estimate Justification &amp; Scope Remarks <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: justification.trim().length >= 10 ? '#16a34a' : (touched ? '#dc2626' : '#64748b'),
                }}
              >
                {justification.trim().length} / 10 min chars
              </span>
            </div>
            <textarea
              rows={3}
              value={justification}
              onChange={handleJustificationChange}
              placeholder="Provide technical reason for replacement and scope adherence (minimum 10 characters)..."
              className="estimate-textarea"
              style={{
                borderColor: (touched && formErrors.justification) ? '#ef4444' : undefined,
                backgroundColor: (touched && formErrors.justification) ? '#fff5f5' : undefined,
              }}
            />
            {touched && formErrors.justification && (
              <span className="estimate-validation-error">
                ⚠️ {formErrors.justification}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="estimate-actions-row">
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
              Submit AMC Estimate {totalEstimate > 0 ? `(₹${totalEstimate.toLocaleString('en-IN')})` : ''} &rarr;
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
