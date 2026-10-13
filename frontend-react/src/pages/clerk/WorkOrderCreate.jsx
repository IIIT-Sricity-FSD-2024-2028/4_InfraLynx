import { useState, useMemo, useEffect } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import { clerkApi } from '../../services/api.js'
import './styles/WorkOrderCreate.css'

/**
 * WorkOrderCreate - Screen 3: Assign contractor, set priority & instructions, and dispatch.
 *
 * Props:
 *   selectedComplaint             - validated complaint (null -> empty state)
 *   onNavigate(screen)            - navigate to another screen
 *   onWorkOrderCreated(complaint) - callback after dispatch; receives enriched complaint
 *
 * Context:
 *   complaints, contractors, currentUser, refreshComplaints, updateComplaintStatus
 *
 * Local state:
 *   selectedContractorId - chosen contractor (auto-defaults to first match)
 *   priority             - 'Emergency' | 'High' | 'Medium' | 'Low'
 *   specialInstructions  - free-text for contractor
 *
 * On dispatch:
 *   - generates workOrderId: WO-YYYY-NNNN
 *   - calls clerkApi.createWorkOrder
 *   - transitions complaint status -> ASSIGNED
 *   - calls onWorkOrderCreated with enriched complaint object (for toast)
 */
export default function WorkOrderCreate({ selectedComplaint, onNavigate, onWorkOrderCreated }) {
  const { complaints, contractors, currentUser, refreshComplaints, updateComplaintStatus } = useTIMS()

  // Live-sync selected complaint
  const active = useMemo(() => {
    if (!selectedComplaint) return null
    return complaints.find(c => c.id === selectedComplaint.id) || selectedComplaint
  }, [complaints, selectedComplaint])

  const [selectedContractorId, setSelectedContractorId] = useState('')
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

  // Auto-select contractor: prefer the one assigned during verification, or first match
  useEffect(() => {
    if (active?.assignedContractor?.id) {
      setSelectedContractorId(active.assignedContractor.id)
    } else if (filteredContractors.length > 0 && !selectedContractorId) {
      setSelectedContractorId(filteredContractors[0].id)
    }
  }, [filteredContractors, active])

  /**
   * handleDispatch - creates Work Order and assigns contractor in backend, transitions complaint status.
   */
  async function handleDispatch(e) {
    e.preventDefault()
    if (!active) return
    if (!selectedContractorId) {
      alert('Please select an authorized contractor.')
      return
    }

    const contractor = contractors.find(c => c.id === selectedContractorId)
    const newStatus = 'ASSIGNED'

    setIsSubmitting(true)
    try {
      // 1. Create work order in backend
      const res = await clerkApi.createWorkOrder({
        complaintId: active.id,
        contractorId: selectedContractorId,
        priority: priority.toUpperCase(),
        specialInstructions,
      })

      const woData = res?.data
      const woCode = woData?.workOrderCode || woData?.work_order_number || `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      const assignedContractor = woData?.contractor || contractor

      // 2. Fetch updated complaints from database
      const freshComplaints = await refreshComplaints()
      const updatedComplaint = freshComplaints.find(c => c.id === active.id) || {
        ...active,
        status: newStatus,
        workOrderId: woCode,
        work_order_code: woCode,
        assignedContractor,
        assigned_contractor_id: selectedContractorId,
        assigned_contractor_name: assignedContractor?.name,
        priority,
        specialInstructions,
        workOrderCreatedAt: new Date().toISOString(),
        workOrderCreatedBy: `${currentUser?.name || 'Desk Clerk'} (Desk Clerk)`,
      }

      // 3. Complete dispatch callback
      onWorkOrderCreated(updatedComplaint)
    } catch (err) {
      console.error('[WorkOrderCreate] Error creating work order:', err)
      const fallbackWoCode = `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      const note = `Work Order ${fallbackWoCode} assigned to ${contractor?.name || 'contractor'}. Priority: ${priority}. Ready for on-site inspection.`

      const fallbackPayload = {
        status: newStatus,
        workOrderId: fallbackWoCode,
        work_order_code: fallbackWoCode,
        assignedContractor: contractor,
        assigned_contractor_id: selectedContractorId,
        assigned_contractor_name: contractor?.name,
        priority,
        specialInstructions,
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
        <div className="wo-card wo-empty-card">
          <div className="wo-empty-icon">&#128196;</div>
          <div className="wo-empty-title">No validated complaint selected</div>
          <p className="wo-empty-desc">
            Go to Dashboard, click a validated complaint, then press &ldquo;Create Work Order&rdquo;.
          </p>
          <button onClick={() => onNavigate('dashboard')} className="wo-btn-back wo-btn-back-spacer">
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
        <div className="wo-card wo-empty-card">
          <div className="wo-empty-icon">&#9888;</div>
          <div className="wo-empty-title">
            {active.workOrderId
              ? `Work Order ${active.workOrderId} already created.`
              : `Status "${active.status}" does not allow WO creation.`}
          </div>
          <button
            onClick={() => onNavigate(active.workOrderId ? 'tracker' : 'triage')}
            className="wo-btn-back wo-btn-back-spacer"
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
          <p className="wo-subtitle">Assign an authorized contractor, set priority and instructions, and dispatch.</p>
        </div>
      </div>

      {/* Complaint reference strip */}
      <div className="wo-ref-strip">
        <div className="wo-ref-item"><span className="wo-ref-label">Complaint ID</span><span className="wo-ref-val mono">{active.id}</span></div>
        <div className="wo-ref-item"><span className="wo-ref-label">Title</span><span className="wo-ref-val">{active.title}</span></div>
        <div className="wo-ref-item"><span className="wo-ref-label">Category</span><span className="wo-ref-val">{active.category} &bull; {active.subCategory || active.subcategory || ''}</span></div>
        <div className="wo-ref-item"><span className="wo-ref-label">Location</span><span className="wo-ref-val">{active.location?.block || 'Block A'}, {active.location?.sector || 'Sector 54'}</span></div>
        <div className="wo-ref-item"><span className="wo-ref-label">Status</span><span className="wo-ref-val wo-ref-val-validated">VALIDATED &#10003;</span></div>
      </div>

      <form className="wo-form-card" onSubmit={handleDispatch}>

        {/* Section 1: Contractor Assignment */}
        <div className="wo-section">
          <div className="wo-section-title">1. Contractor Assignment</div>
          {filteredContractors.length === 0 ? (
            <p className="wo-no-contractors">No contractors available for {active.category}.</p>
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

        {/* Section 2: Priority */}
        <div className="wo-section">
          <div className="wo-section-title">2. Work Order Priority</div>
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

        {/* Section 3: Special Instructions */}
        <div className="wo-section">
          <div className="wo-section-title">3. Special Instructions for Contractor</div>
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
            {isSubmitting ? 'Dispatching...' : 'Dispatch Work Order ✉'}
          </button>
        </div>
      </form>
    </div>
  )
}
