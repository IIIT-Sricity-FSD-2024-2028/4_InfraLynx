import { useState, useMemo, useEffect } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import { clerkApi } from '../../services/api.js'
import './styles/WorkOrderCreate.css'

/** Estimate above this requires Dept Head approval before contractor dispatch */
const DEPT_HEAD_THRESHOLD = 10000

/**
 * WorkOrderCreate - Screen 3: Build AMC line-item WO and dispatch.
 *
 * Props:
 *   selectedComplaint             - validated complaint (null -> empty state)
 *   onNavigate(screen)            - navigate to another screen
 *   onWorkOrderCreated(complaint) - callback after dispatch; receives enriched complaint
 *
 * Context:
 *   complaints, contractors, amcRateCards, currentUser, updateComplaintStatus
 *
 * Local state:
 *   selectedContractorId - chosen contractor (auto-defaults to first match)
 *   lineItems            - [{ rateCardId, qty }] AMC line items
 *   priority             - 'Emergency' | 'High' | 'Medium' | 'Low'
 *   specialInstructions  - free-text for contractor
 *
 * Derived:
 *   filteredContractors - contractors matching complaint category
 *   filteredRateCards   - rate cards matching complaint category
 *   estimateTotal       - sum of all line-item costs
 *   requiresDeptHead    - estimateTotal > DEPT_HEAD_THRESHOLD
 *
 * On dispatch:
 *   - generates workOrderId: WO-YYYY-NNNN
 *   - calls updateComplaintStatus -> WORK_ORDER_CREATED or AWAITING_DEPT_HEAD
 *   - calls onWorkOrderCreated with enriched complaint object (for toast)
 */
export default function WorkOrderCreate({ selectedComplaint, onNavigate, onWorkOrderCreated }) {
  const { complaints, contractors, amcRateCards, currentUser, refreshComplaints, updateComplaint, updateComplaintStatus } = useTIMS()

  // Live-sync selected complaint
  const active = useMemo(() => {
    if (!selectedComplaint) return null
    return complaints.find(c => c.id === selectedComplaint.id) || selectedComplaint
  }, [complaints, selectedComplaint])

  const [selectedContractorId, setSelectedContractorId] = useState('')
  const [lineItems,            setLineItems]            = useState([{ rateCardId: '', qty: 1 }])
  const [priority,             setPriority]             = useState('Medium')
  const [specialInstructions,  setSpecialInstructions]  = useState('')
  const [isSubmitting,         setIsSubmitting]         = useState(false)

  // Filter contractors by complaint category
  const filteredContractors = useMemo(() => {
    if (!active) return contractors
    return contractors.filter(c =>
      c.departments.some(d => d.toLowerCase() === (active.category || '').toLowerCase())
    )
  }, [contractors, active])

  // Filter rate cards by complaint category
  const filteredRateCards = useMemo(() => {
    if (!active) return amcRateCards
    return amcRateCards.filter(r =>
      r.department.toLowerCase() === (active.category || '').toLowerCase()
    )
  }, [amcRateCards, active])

  // Auto-select contractor: prefer the one assigned during verification, or first match
  useEffect(() => {
    if (active?.assignedContractor?.id) {
      setSelectedContractorId(active.assignedContractor.id)
    } else if (filteredContractors.length > 0 && !selectedContractorId) {
      setSelectedContractorId(filteredContractors[0].id)
    }
  }, [filteredContractors, active])

  // Auto-fill first rate card into first empty line item
  useEffect(() => {
    if (filteredRateCards.length > 0 && lineItems[0] && lineItems[0].rateCardId === '') {
      setLineItems([{ rateCardId: filteredRateCards[0].id, qty: 1 }])
    }
  }, [filteredRateCards])

  // Compute total estimate
  const estimateTotal = useMemo(() => {
    return lineItems.reduce((sum, item) => {
      const card = amcRateCards.find(r => r.id === item.rateCardId)
      return card ? sum + card.rate * (Number(item.qty) || 0) : sum
    }, 0)
  }, [lineItems, amcRateCards])

  const requiresDeptHead = estimateTotal > DEPT_HEAD_THRESHOLD

  function addLineItem() {
    setLineItems(prev => [...prev, { rateCardId: filteredRateCards[0]?.id || '', qty: 1 }])
  }
  function removeLineItem(idx) {
    setLineItems(prev => prev.filter((_, i) => i !== idx))
  }
  function updateItem(idx, field, value) {
    setLineItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  /**
   * handleDispatch - persists WO and contractor in in-memory database, transitions complaint status.
   */
  async function handleDispatch(e) {
    e.preventDefault()
    if (!active)               return
    if (!selectedContractorId) { alert('Please select a contractor.'); return }
    if (lineItems.every(i => !i.rateCardId)) { alert('Please add at least one service item.'); return }

    const contractor  = contractors.find(c => c.id === selectedContractorId)
    const newStatus   = requiresDeptHead ? 'AWAITING_DEPT_HEAD' : 'WORK_ORDER_CREATED'

    // Build resolved line items with totals
    const resolvedLines = lineItems
      .filter(item => item.rateCardId)
      .map(item => {
        const card = amcRateCards.find(r => r.id === item.rateCardId)
        return {
          rateCardId:  item.rateCardId,
          description: card?.service || card?.item_name || 'Service Item',
          unit:        card?.unit    || 'Unit',
          unitCost:    card?.rate    || 0,
          qty:         Number(item.qty) || 1,
          total:       (card?.rate || 0) * (Number(item.qty) || 1),
        }
      })

    setIsSubmitting(true)
    try {
      // 1. Create work order in the in-memory database
      const res = await clerkApi.createWorkOrder({
        complaintId: active.id,
        contractorId: selectedContractorId,
        lineItems: resolvedLines,
        priority: priority.toUpperCase(),
        specialInstructions,
      })

      const woData = res?.data
      const woCode = woData?.workOrderCode || `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      const assignedContractor = woData?.contractor || contractor

      const note = requiresDeptHead
        ? `WO ${woCode} created, forwarded to Dept Head (estimate Rs.${estimateTotal.toLocaleString()} > Rs.${DEPT_HEAD_THRESHOLD.toLocaleString()}). Contractor: ${assignedContractor?.name || 'TBD'}.`
        : `WO ${woCode} dispatched to ${assignedContractor?.name || 'contractor'}. Estimate: Rs.${estimateTotal.toLocaleString()}. Priority: ${priority}.`

      // 2. Fetch updated complaints from the in-memory database
      const freshComplaints = await refreshComplaints()
      const updatedComplaint = freshComplaints.find(c => c.id === active.id) || {
        ...active,
        status: newStatus,
        workOrderId: woCode,
        work_order_code: woCode,
        assignedContractor,
        assigned_contractor_id: selectedContractorId,
        assigned_contractor_name: assignedContractor?.name,
        estimateAmount: estimateTotal,
        estimate_amount: estimateTotal,
        lineItems: resolvedLines,
        priority,
        requiresDeptHead,
        workOrderCreatedAt: new Date().toISOString(),
        workOrderCreatedBy: `${currentUser.name} (Desk Clerk)`,
      }

      // 3. Complete dispatch callback
      onWorkOrderCreated(updatedComplaint)
    } catch (err) {
      console.error('[WorkOrderCreate] Database error:', err)
      // Fallback in case of temporary offline state
      const fallbackWoCode = `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      const note = `WO ${fallbackWoCode} dispatched. Contractor: ${contractor?.name || 'contractor'}.`
      
      const fallbackPayload = {
        status: newStatus,
        workOrderId: fallbackWoCode,
        work_order_code: fallbackWoCode,
        assignedContractor: contractor,
        assigned_contractor_id: selectedContractorId,
        assigned_contractor_name: contractor?.name,
        estimateAmount: estimateTotal,
        lineItems: resolvedLines,
        priority,
        requiresDeptHead,
      }
      updateComplaintStatus(active.id, newStatus, note, fallbackPayload)
      onWorkOrderCreated({ ...active, ...fallbackPayload })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!active) {
    return (
      <div className="wo-root">
        <div className="wo-hdr"><h1 className="wo-title">Create Work Order</h1></div>
        <div className="wo-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>&#128196;</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>No validated complaint selected</div>
          <p style={{ color: 'var(--text-soft)', fontSize: 13, marginTop: 4 }}>
            Go to Dashboard, click a validated complaint, then press &ldquo;Create Work Order&rdquo;.
          </p>
          <button onClick={() => onNavigate('dashboard')} className="wo-btn-back" style={{ marginTop: 16 }}>
            &#8592; Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // ── Wrong status guard ─────────────────────────────────────────────────────
  if (active.status !== 'VALIDATED' && active.status !== 'AWAITING_DEPT_HEAD') {
    return (
      <div className="wo-root">
        <button className="wo-btn-back" onClick={() => onNavigate('dashboard')}>&#8592; Back to Dashboard</button>
        <div className="wo-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>&#9888;</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {active.workOrderId
              ? `Work Order ${active.workOrderId} already created.`
              : `Status "${active.status}" does not allow WO creation.`}
          </div>
          <button
            onClick={() => onNavigate(active.workOrderId ? 'tracker' : 'triage')}
            className="wo-btn-back"
            style={{ marginTop: 16 }}
          >
            {active.workOrderId ? 'View in Tracker' : 'Go to Triage'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="wo-root">
      <button className="wo-btn-back" onClick={() => onNavigate('dashboard')}>&#8592; Back to Dashboard</button>

      <div className="wo-hdr">
        <div>
          <h1 className="wo-title">Create Work Order</h1>
          <p className="wo-subtitle">Select contractor, add AMC line items, and dispatch.</p>
        </div>
      </div>

      {/* Complaint reference strip */}
      <div className="wo-ref-strip">
        <div className="wo-ref-item"><span className="wo-ref-label">Complaint ID</span><span className="wo-ref-val mono">{active.id}</span></div>
        <div className="wo-ref-item"><span className="wo-ref-label">Title</span><span className="wo-ref-val">{active.title}</span></div>
        <div className="wo-ref-item"><span className="wo-ref-label">Category</span><span className="wo-ref-val">{active.category} &bull; {active.subCategory}</span></div>
        <div className="wo-ref-item"><span className="wo-ref-label">Location</span><span className="wo-ref-val">{active.location.block}, {active.location.sector}</span></div>
        <div className="wo-ref-item"><span className="wo-ref-label">Status</span><span className="wo-ref-val" style={{ color: '#166534', fontWeight: 700 }}>VALIDATED &#10003;</span></div>
      </div>

      {/* Verified on-site inspection strip (from Contractor Verification) */}
      {active.inspection && (
        <div style={{
          background: '#f0fdf4',
          border: '1.5px solid #86efac',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
              ✓ Verified On-Site Inspection by {active.inspection.inspectedBy || active.assignedContractor?.name || 'Contractor'}
            </div>
            <div style={{ fontSize: 12.5, color: '#15803d', marginTop: 2 }}>
              Ground Findings: &ldquo;{active.inspection.observedProblem}&rdquo;
            </div>
            {active.inspection.requiredWork && (
              <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>
                Scope: {active.inspection.requiredWork}
              </div>
            )}
          </div>
          {active.inspection.inspectionPhoto && (
            <img
              src={active.inspection.inspectionPhoto}
              alt="Verified Inspection"
              style={{ width: 68, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #86efac' }}
            />
          )}
        </div>
      )}

      {/* Dept Head threshold warning */}
      {requiresDeptHead && (
        <div className="wo-depthead-banner">
          <span className="wo-depthead-icon">&#9888;</span>
          <div>
            <div className="wo-depthead-title">
              Dept Head Approval Required &mdash; Estimate Rs.{estimateTotal.toLocaleString()} exceeds Rs.{DEPT_HEAD_THRESHOLD.toLocaleString()} threshold
            </div>
            <div className="wo-depthead-desc">This WO will be forwarded to the Dept Head before contractor dispatch.</div>
          </div>
        </div>
      )}

      <form className="wo-form-card" onSubmit={handleDispatch}>

        {/* Section 1: Contractor */}
        <div className="wo-section">
          <div className="wo-section-title">1. Contractor Assignment</div>
          {filteredContractors.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>No contractors available for {active.category}.</p>
          ) : (
            <div className="wo-contractor-grid">
              {filteredContractors.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelectedContractorId(c.id)}
                  className={`wo-contractor-card${selectedContractorId === c.id ? ' selected' : ''}`}
                >
                  <div className="wo-c-name">{c.name}</div>
                  <div className="wo-c-meta">Lead: {c.lead}</div>
                  <div className="wo-c-meta">{c.phone}</div>
                  <div className="wo-c-amc">AMC: {c.amcContractId}</div>
                  <div className="wo-c-rating">&#9733; {c.rating} / 5.0</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: AMC Line Items */}
        <div className="wo-section">
          <div className="wo-section-title">2. AMC Rate Card Line Items</div>
          <div className="wo-line-items-hdr">
            <span>Service Item</span><span>Qty</span><span>Unit</span><span>Amount</span><span></span>
          </div>
          {lineItems.map((item, idx) => {
            const card = amcRateCards.find(r => r.id === item.rateCardId)
            const rowTotal = card ? card.rate * (Number(item.qty) || 0) : 0
            return (
              <div key={idx} className="wo-line-row">
                <select
                  value={item.rateCardId}
                  onChange={e => updateItem(idx, 'rateCardId', e.target.value)}
                  className="wo-line-select"
                >
                  <option value="">Select service...</option>
                  {filteredRateCards.map(r => (
                    <option key={r.id} value={r.id}>{r.service} (Rs.{r.rate}/{r.unit})</option>
                  ))}
                </select>
                <input
                  type="number" min="1" value={item.qty}
                  onChange={e => updateItem(idx, 'qty', e.target.value)}
                  className="wo-line-qty"
                />
                <span className="wo-line-unit">{card ? card.unit : '—'}</span>
                <span className="wo-line-total">{rowTotal > 0 ? `Rs.${rowTotal.toLocaleString()}` : '—'}</span>
                {lineItems.length > 1 && (
                  <button type="button" onClick={() => removeLineItem(idx)} className="wo-line-remove">&times;</button>
                )}
              </div>
            )
          })}
          <button type="button" onClick={addLineItem} className="wo-btn-add-line">+ Add Service Item</button>
          <div className="wo-estimate-bar">
            <span className="wo-estimate-label">Total Estimated Amount</span>
            <span className={`wo-estimate-val${requiresDeptHead ? ' exceeds' : ''}`}>
              Rs.{estimateTotal.toLocaleString()}
              {requiresDeptHead && <span style={{ fontSize: 12, marginLeft: 8, color: '#c2410c' }}>(Dept Head Required)</span>}
            </span>
          </div>
        </div>

        {/* Section 3: Priority */}
        <div className="wo-section">
          <div className="wo-section-title">3. Work Order Priority</div>
          <div className="wo-priority-grid">
            {['Emergency', 'High', 'Medium', 'Low'].map(p => (
              <div
                key={p}
                onClick={() => setPriority(p)}
                className={`wo-priority-card${priority === p ? ` selected-${p.toLowerCase()}` : ''}`}
              >
                {p}
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Special Instructions */}
        <div className="wo-section">
          <div className="wo-section-title">4. Special Instructions for Contractor</div>
          <textarea
            rows={3}
            value={specialInstructions}
            onChange={e => setSpecialInstructions(e.target.value)}
            placeholder="e.g., Work hours 8am–6pm. Safety barriers mandatory. Report to site supervisor first."
            className="wo-textarea"
          />
        </div>

        {/* Actions */}
        <div className="wo-form-actions">
          <button type="button" className="wo-btn-cancel" onClick={() => onNavigate('dashboard')}>Cancel</button>
          <button
            id="btn-dispatch-work-order"
            type="submit"
            className="wo-btn-dispatch"
            disabled={!selectedContractorId || isSubmitting}
          >
            {isSubmitting
              ? 'Dispatching...'
              : (requiresDeptHead ? 'Forward to Dept Head ↗' : 'Dispatch Work Order ✉')}
          </button>
        </div>
      </form>
    </div>
  )
}
