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
  const { complaints, contractors, currentUser, refreshComplaints, refreshMasterData, updateComplaintStatus } = useTIMS()

  useEffect(() => {
    if (typeof refreshMasterData === 'function') {
      refreshMasterData()
    }
  }, [refreshMasterData])

  // Live-sync selected complaint
  const active = useMemo(() => {
    if (!selectedComplaint) return null
    return complaints.find(c => c.id === selectedComplaint.id) || selectedComplaint
  }, [complaints, selectedComplaint])

  const [selectedContractorId, setSelectedContractorId] = useState('')
  const [priority,             setPriority]             = useState('Medium')
  const [specialInstructions,  setSpecialInstructions]  = useState('')
  const [isSubmitting,         setIsSubmitting]         = useState(false)

  // Filter contractors by complaint category with intelligent category matching & safe fallback
  const filteredContractors = useMemo(() => {
    if (!contractors || contractors.length === 0) return []
    if (!active || !active.category) return contractors

    const cat = (active.category || '').toLowerCase()
    const matches = contractors.filter(c => {
      if (!c.departments || !Array.isArray(c.departments) || c.departments.length === 0) {
        return true
      }
      return c.departments.some(deptName => {
        const d = (deptName || '').toLowerCase()
        if (d === cat || d.includes(cat) || cat.includes(d)) return true
        // Category synonyms
        if ((cat.includes('civil') || cat.includes('road') || cat.includes('pothole')) && (d.includes('civil') || d.includes('road'))) return true
        if ((cat.includes('elect') || cat.includes('power') || cat.includes('light')) && (d.includes('elect') || d.includes('power'))) return true
        if ((cat.includes('water') || cat.includes('drain') || cat.includes('sanitat') || cat.includes('plumb') || cat.includes('sewage')) && (d.includes('water') || d.includes('sanitat') || d.includes('drain'))) return true
        if ((cat.includes('waste') || cat.includes('hortic') || cat.includes('garb') || cat.includes('clean')) && (d.includes('waste') || d.includes('hortic') || d.includes('clean'))) return true
        return false
      })
    })

    // If specific filter found matches, use them; otherwise fallback to all active contractors so workflow never dead-ends
    return matches.length > 0 ? matches : contractors
  }, [contractors, active])

  // Auto-select contractor: prefer the one assigned during verification, or first match
  useEffect(() => {
    if (active?.assignedContractor?.id) {
      setSelectedContractorId(active.assignedContractor.id)
    } else if (filteredContractors.length > 0 && !selectedContractorId) {
      setSelectedContractorId(filteredContractors[0].id)
    }
  }, [filteredContractors, active, selectedContractorId])

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
        complaint_id: active.id,
        complaintId: active.id,
        contractor_id: selectedContractorId,
        contractorId: selectedContractorId,
        priority: priority.toUpperCase(),
        special_instructions: specialInstructions,
        specialInstructions,
      })

      const woData = res?.data
      const woCode = woData?.work_order_number || `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      const assignedContractor = woData?.contractor || contractor

      // 2. Fetch updated complaints from database
      const freshComplaints = await refreshComplaints()
      const updatedComplaint = freshComplaints.find(c => c.id === active.id) || {
        ...active,
        status: newStatus,
        work_order_number: woCode,
        workOrderId: woCode,
        work_order_code: woCode,
        assigned_contractor: assignedContractor,
        assignedContractor,
        assigned_contractor_id: selectedContractorId,
        contractor_id: selectedContractorId,
        assigned_contractor_name: assignedContractor?.name,
        priority,
        special_instructions: specialInstructions,
        specialInstructions,
        created_at: new Date().toISOString(),
      }

      // 3. Complete dispatch callback
      onWorkOrderCreated(updatedComplaint)
    } catch (err) {
      console.error('[WorkOrderCreate] Error creating work order:', err)
      const fallbackWoCode = `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      const note = `Work Order ${fallbackWoCode} assigned to ${contractor?.name || 'contractor'}. Priority: ${priority}. Ready for on-site inspection.`

      const fallbackPayload = {
        status: newStatus,
        work_order_number: fallbackWoCode,
        workOrderId: fallbackWoCode,
        work_order_code: fallbackWoCode,
        assigned_contractor: contractor,
        assignedContractor: contractor,
        assigned_contractor_id: selectedContractorId,
        contractor_id: selectedContractorId,
        assigned_contractor_name: contractor?.name,
        priority,
        special_instructions: specialInstructions,
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
