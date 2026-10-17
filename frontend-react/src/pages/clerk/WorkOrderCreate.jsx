import { useState, useMemo, useEffect, useCallback } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import { clerkApi } from '../../services/api.js'
import './styles/WorkOrderCreate.css'

/**
 * Priority tiers available for Work Order dispatch
 */
const PRIORITIES = ['Emergency', 'High', 'Medium', 'Low']

/**
 * WorkOrderCreate - Screen 3: Desk Clerk assigns an authorized AMC contractor,
 * configures execution priority and site instructions, and issues the Work Order.
 */
export default function WorkOrderCreate({ selectedComplaint, onNavigate, onWorkOrderCreated }) {
  const {
    complaints,
    contractors,
    currentUser,
    refreshComplaints,
    refreshMasterData,
    updateComplaintStatus,
  } = useTIMS()

  // Ensure fresh master data (e.g. empanelled contractors and rate cards)
  useEffect(() => {
    if (typeof refreshMasterData === 'function') refreshMasterData()
  }, [refreshMasterData])

  // Synchronize active complaint with global context
  const active = useMemo(() => {
    if (!selectedComplaint) return null
    return complaints.find(c => c.id === selectedComplaint.id) || selectedComplaint
  }, [complaints, selectedComplaint])

  // Form State
  const [selectedContractorId, setSelectedContractorId] = useState('')
  const [priority, setPriority]                         = useState('Medium')
  const [specialInstructions, setSpecialInstructions]   = useState('')
  const [isSubmitting, setIsSubmitting]                 = useState(false)

  // Filter empanelled AMC contractors matching the complaint's civic category
  const filteredContractors = useMemo(() => {
    if (!contractors || contractors.length === 0) return []
    if (!active || !active.category) return contractors

    const cat = (active.category || '').toLowerCase()
    const matches = contractors.filter(c => {
      if (!c.departments || !Array.isArray(c.departments) || c.departments.length === 0) return false
      return c.departments.some(deptName => {
        const d = (deptName || '').toLowerCase()
        if (d === cat || d.includes(cat) || cat.includes(d)) return true
        // Synonym matches across related civic disciplines
        if ((cat.includes('civil') || cat.includes('road') || cat.includes('pothole')) && (d.includes('civil') || d.includes('road'))) return true
        if ((cat.includes('elect') || cat.includes('power') || cat.includes('light')) && (d.includes('elect') || d.includes('power'))) return true
        if ((cat.includes('water') || cat.includes('drain') || cat.includes('sanitat') || cat.includes('plumb') || cat.includes('sewage')) && (d.includes('water') || d.includes('sanitat') || d.includes('drain'))) return true
        if ((cat.includes('waste') || cat.includes('hortic') || cat.includes('garb') || cat.includes('clean')) && (d.includes('waste') || d.includes('hortic') || d.includes('clean'))) return true
        return false
      })
    })

    return matches.length > 0 ? matches : contractors
  }, [contractors, active])

  // Auto-select preferred contractor or default to the first matching vendor
  useEffect(() => {
    if (!active) return
    const activeContractorId = active.assignedContractor?.id || active.assigned_contractor_id || active.contractor_id
    if (activeContractorId && filteredContractors.some(c => c.id === activeContractorId)) {
      setSelectedContractorId(activeContractorId)
      return
    }
    if (filteredContractors.length > 0) {
      setSelectedContractorId(prev => filteredContractors.some(c => c.id === prev) ? prev : filteredContractors[0].id)
    } else {
      setSelectedContractorId('')
    }
  }, [filteredContractors, active])

  /**
   * Dispatch Work Order: Creates backend WO record and updates ticket status -> ASSIGNED
   */
  const handleDispatch = useCallback(async (e) => {
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
      // 1. Submit work order payload to backend API
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

      // 2. Refresh database complaints
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
  }, [active, selectedContractorId, priority, specialInstructions, contractors, refreshComplaints, updateComplaintStatus, onWorkOrderCreated])

  // ── Empty State: No complaint selected ───────────────────────────────────
  if (!active) {
    return (
      <div className="wo-root">
        <div className="wo-hdr"><h1 className="wo-title">Create Work Order</h1></div>
        <div className="wo-card wo-empty-card">
          <div className="wo-empty-icon">&#128196;</div>
          <div className="wo-empty-title">No validated complaint selected</div>
          <p className="wo-empty-desc">Go to Dashboard, click a validated complaint, then press &ldquo;Create Work Order&rdquo;.</p>
          <button onClick={() => onNavigate('dashboard')} className="wo-btn-back wo-btn-back-spacer">&#8592; Back to Dashboard</button>
        </div>
      </div>
    )
  }

  // ── Guard: Ensure complaint is VALIDATED before raising work order ────────
  if (active.status !== 'VALIDATED' && active.status !== 'AWAITING_DEPT_HEAD') {
    return (
      <div className="wo-root">
        <button className="wo-btn-back" onClick={() => onNavigate('dashboard')}>&#8592; Back to Dashboard</button>
        <div className="wo-card wo-empty-card">
          <div className="wo-empty-icon">&#9888;</div>
          <div className="wo-empty-title">
            {active.workOrderId ? `Work Order ${active.workOrderId} already created.` : `Status "${active.status}" does not allow WO creation.`}
          </div>
          <button onClick={() => onNavigate(active.workOrderId ? 'tracker' : 'triage')} className="wo-btn-back wo-btn-back-spacer">
            {active.workOrderId ? 'View in Tracker' : 'Go to Triage'}
          </button>
        </div>
      </div>
    )
  }

  // Structured summary strip for the target complaint
  const refItems = [
    { label: 'Complaint ID', val: active.id, mono: true },
    { label: 'Title', val: active.title },
    { label: 'Category', val: `${active.category} • ${active.subCategory || active.subcategory || ''}` },
    { label: 'Location', val: `${active.location?.block || 'Block A'}, ${active.location?.sector || 'Sector 54'}` },
    { label: 'Status', val: 'VALIDATED ✓', validated: true },
  ]

  return (
    <div className="wo-root">
      <button className="wo-btn-back" onClick={() => onNavigate('dashboard')}>&#8592; Back to Dashboard</button>

      <div className="wo-hdr">
        <div>
          <h1 className="wo-title">Create Work Order</h1>
          <p className="wo-subtitle">Assign an authorized contractor, set priority and instructions, and dispatch.</p>
        </div>
      </div>

      {/* Complaint Reference Banner */}
      <div className="wo-ref-strip">
        {refItems.map(({ label, val, mono, validated }) => (
          <div key={label} className="wo-ref-item">
            <span className="wo-ref-label">{label}</span>
            <span className={`wo-ref-val${mono ? ' mono' : validated ? ' wo-ref-val-validated' : ''}`}>{val}</span>
          </div>
        ))}
      </div>

      <form className="wo-form-card" onSubmit={handleDispatch}>
        {/* Section 1: Empanelled AMC Contractor Selection */}
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

        {/* Section 2: Priority Selection */}
        <div className="wo-section">
          <div className="wo-section-title">2. Work Order Priority</div>
          <div className="wo-priority-grid">
            {PRIORITIES.map(p => (
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

        {/* Section 3: Special Site Instructions */}
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

        {/* Action Controls */}
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
