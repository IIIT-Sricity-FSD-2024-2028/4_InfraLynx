import { useMemo, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { useTIMS } from '../../context/TIMSContext.jsx'
import {
  createWorkOrder,
  fetchBids,
  openBidding,
  submitBid,
  autoSelectBid,
  setWoDispatchMode,
  setWoIsSubmitting,
  selectWorkOrderBids,
  selectBidsLoading,
  selectIsAutoSelecting,
  selectBiddingSuccessMsg,
  selectWoDispatchMode,
  selectWoIsSubmitting,
} from '../../store/clerk/workOrdersSlice.js'
import { selectAllClerkComplaints } from '../../store/clerk/complaintsSlice.js'
import './styles/WorkOrderCreate.css'

const PRIORITIES = ['Emergency', 'High', 'Medium', 'Low']

export default function WorkOrderCreate({
  selectedComplaint,
  onNavigate,
  onWorkOrderCreated,
}) {
  const dispatch = useDispatch()
  const {
    contractors = [],
    refreshMasterData,
  } = useTIMS()
  const complaints = useSelector(selectAllClerkComplaints)

  // Dispatch mode & UI state from Redux store ('DIRECT' | 'BIDDING')
  const dispatchMode      = useSelector(selectWoDispatchMode)

  // Bidding state from Redux store
  const bids              = useSelector(selectWorkOrderBids)
  const loadingBids       = useSelector(selectBidsLoading)
  const isAutoSelecting   = useSelector(selectIsAutoSelecting)
  const biddingSuccessMsg = useSelector(selectBiddingSuccessMsg)
  const isSubmitting      = useSelector(selectWoIsSubmitting)

  // React Hook Form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      contractorId: '',
      priority: 'Medium',
      specialInstructions: '',
    },
  })

  const selectedContractorId = watch('contractorId')
  const currentPriority = watch('priority')

  useEffect(() => {
    if (typeof refreshMasterData === 'function') refreshMasterData()
  }, [refreshMasterData])

  const active = useMemo(() => {
    if (!selectedComplaint) return null
    return complaints.find((c) => c.id === selectedComplaint.id) || selectedComplaint
  }, [complaints, selectedComplaint])

  // Filter empanelled AMC contractors matching category
  const filteredContractors = useMemo(() => {
    if (!contractors || contractors.length === 0) return []
    if (!active || !active.category) return contractors

    const cat = (active.category || '').toLowerCase()
    const matches = contractors.filter((c) => {
      if (!c.departments || !Array.isArray(c.departments) || c.departments.length === 0) return false
      return c.departments.some((deptName) => {
        const d = (deptName || '').toLowerCase()
        if (d === cat || d.includes(cat) || cat.includes(d)) return true
        if ((cat.includes('civil') || cat.includes('road') || cat.includes('pothole')) && (d.includes('civil') || d.includes('road'))) return true
        if ((cat.includes('elect') || cat.includes('power') || cat.includes('light')) && (d.includes('elect') || d.includes('power'))) return true
        if ((cat.includes('water') || cat.includes('drain') || cat.includes('sanitat') || cat.includes('plumb') || cat.includes('sewage')) && (d.includes('water') || d.includes('sanitat') || d.includes('drain'))) return true
        if ((cat.includes('waste') || cat.includes('hortic') || cat.includes('garb') || cat.includes('clean')) && (d.includes('waste') || d.includes('hortic') || d.includes('clean'))) return true
        return false
      })
    })

    return matches.length > 0 ? matches : contractors
  }, [contractors, active])

  useEffect(() => {
    if (!active) return
    const activeContractorId = active.assignedContractor?.id || active.assigned_contractor_id || active.contractor_id
    if (activeContractorId && filteredContractors.some((c) => c.id === activeContractorId)) {
      setValue('contractorId', activeContractorId)
      return
    }
    if (filteredContractors.length > 0) {
      setValue('contractorId', filteredContractors[0].id)
    }
  }, [filteredContractors, active, setValue])

  // Load existing bids via Redux thunk if this work order has bidding open
  const loadBids = useCallback(async (woId) => {
    if (!woId) return
    try {
      await dispatch(fetchBids(woId))
    } catch (err) {
      console.warn('[WorkOrderCreate] Could not load bids:', err?.message)
    }
  }, [dispatch])

  useEffect(() => {
    if (active?.workOrderId || active?.work_order_id) {
      const woId = active.backendWoId || active.work_order_id || active.workOrderId
      loadBids(woId)
    }
  }, [active, loadBids])

  // Dispatch Direct Work Order or Open for Bidding
  const onFormSubmit = async (formData) => {
    if (!active) return
    dispatch(setWoIsSubmitting(true))

    try {
      if (dispatchMode === 'DIRECT') {
        if (!formData.contractorId) {
          alert('Please select an authorized contractor.')
          dispatch(setWoIsSubmitting(false))
          return
        }

        const contractor = contractors.find((c) => c.id === formData.contractorId)
        const result = await dispatch(
          createWorkOrder({
            complaint_id: active.id,
            complaintId: active.id,
            contractor_id: formData.contractorId,
            contractorId: formData.contractorId,
            priority: formData.priority.toUpperCase(),
            special_instructions: formData.specialInstructions,
          })
        )

        const woData = result.payload
        const woCode = woData?.work_order_number || `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
        const assignedContractor = woData?.contractor || contractor

        const updatedComplaint = {
          ...active,
          status: 'ASSIGNED',
          work_order_number: woCode,
          workOrderId: woCode,
          work_order_code: woCode,
          assigned_contractor: assignedContractor,
          assignedContractor,
          assigned_contractor_id: formData.contractorId,
          contractor_id: formData.contractorId,
          priority: formData.priority,
          special_instructions: formData.specialInstructions,
        }

        onWorkOrderCreated(updatedComplaint)
      } else {
        // Mode 2: Multi-contractor bidding
        const initialContractorId = formData.contractorId || filteredContractors[0]?.id || contractors[0]?.id
        const result = await dispatch(
          createWorkOrder({
            complaint_id: active.id,
            complaintId: active.id,
            contractor_id: initialContractorId,
            priority: formData.priority.toUpperCase(),
            special_instructions: `${formData.specialInstructions || ''} [OPEN FOR COMPETITIVE BIDDING]`,
          })
        )

        const woData = result.payload
        const woId = woData?.id || active.id

        // Call backend open-bidding endpoint via Redux thunk
        try {
          await dispatch(openBidding(woId)).unwrap()
        } catch (bidErr) {
          console.warn('[WorkOrderCreate] openBidding note:', bidErr)
        }
      }
    } catch (err) {
      alert('Error creating work order: ' + (err.message || 'Server error'))
    } finally {
      dispatch(setWoIsSubmitting(false))
    }
  }

  // Simulate or Add Competing Contractor Bid via Redux thunk
  async function handleSimulateBid(contractorObj, amount, days, justification) {
    const woId = active?.backendWoId || active?.work_order_id || active?.workOrderId || active?.id
    if (!woId) return

    try {
      await dispatch(submitBid({
        workOrderId: woId,
        payload: {
          contractor_id: contractorObj.id,
          bid_amount: amount,
          estimated_days: days,
          justification,
        },
      })).unwrap()
    } catch (err) {
      alert(`Could not submit bid: ${typeof err === 'string' ? err : err?.message}`)
    }
  }

  // Auto-Select Best Contractor via Redux thunk
  async function handleAutoSelectBest() {
    const woId = active?.backendWoId || active?.work_order_id || active?.workOrderId || active?.id
    if (!woId) return

    try {
      await dispatch(autoSelectBid(woId)).unwrap()
    } catch (err) {
      alert(`Auto-selection notice: ${typeof err === 'string' ? err : err?.message}`)
    }
  }

  // ── Empty State ──────────────────────────────────────────────────────────
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

  // Structured summary strip
  const refItems = [
    { label: 'Complaint ID', val: active.id, mono: true },
    { label: 'Title', val: active.title },
    { label: 'Category', val: `${active.category} • ${active.subCategory || active.subcategory || ''}` },
    { label: 'Location', val: `${active.location?.block || 'Block A'}, ${active.location?.sector || 'Sector 54'}` },
    { label: 'Status', val: active.status || 'VALIDATED ✓', validated: true },
  ]

  return (
    <div className="wo-root">
      <button className="wo-btn-back" onClick={() => onNavigate('dashboard')}>&#8592; Back to Dashboard</button>

      <div className="wo-hdr">
        <div>
          <h1 className="wo-title">Create Work Order &amp; Allocation</h1>
          <p className="wo-subtitle">Assign an authorized contractor directly or open for competitive multi-contractor bidding.</p>
        </div>
      </div>

      {biddingSuccessMsg && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontWeight: 600 }}>
          {biddingSuccessMsg}
        </div>
      )}

      {/* Complaint Reference Banner */}
      <div className="wo-ref-strip">
        {refItems.map(({ label, val, mono, validated }) => (
          <div key={label} className="wo-ref-item">
            <span className="wo-ref-label">{label}</span>
            <span className={`wo-ref-val${mono ? ' mono' : validated ? ' wo-ref-val-validated' : ''}`}>{val}</span>
          </div>
        ))}
      </div>

      {/* Mode Selector */}
      <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Allocation Mechanism:</span>
        <button
          type="button"
          onClick={() => dispatch(setWoDispatchMode('DIRECT'))}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: dispatchMode === 'DIRECT' ? '2px solid #2563eb' : '1px solid #cbd5e1',
            background: dispatchMode === 'DIRECT' ? '#eff6ff' : '#ffffff',
            color: dispatchMode === 'DIRECT' ? '#1d4ed8' : '#475569',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🏢 Direct Contractor Assignment
        </button>
        <button
          type="button"
          onClick={() => dispatch(setWoDispatchMode('BIDDING'))}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: dispatchMode === 'BIDDING' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
            background: dispatchMode === 'BIDDING' ? '#f5f3ff' : '#ffffff',
            color: dispatchMode === 'BIDDING' ? '#6d28d9' : '#475569',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ⚡ Competitive Multi-Contractor Bidding
        </button>
      </div>

      {/* Main Work Order Form */}
      <form className="wo-form-card" onSubmit={handleSubmit(onFormSubmit)}>
        {dispatchMode === 'DIRECT' ? (
          /* Section 1: Empanelled AMC Contractor Selection */
          <div className="wo-section">
            <div className="wo-section-title">1. Empanelled Contractor Assignment</div>
            {filteredContractors.length === 0 ? (
              <p className="wo-no-contractors">No contractors available for {active.category}.</p>
            ) : (
              <div className="wo-contractor-grid">
                {filteredContractors.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setValue('contractorId', c.id)}
                    className={`wo-contractor-card${selectedContractorId === c.id ? ' selected' : ''}`}
                  >
                    <div className="wo-c-name">{c.name || c.company_name}</div>
                    <div className="wo-c-meta">Lead: {c.lead || c.contact_person}</div>
                    <div className="wo-c-meta">{c.phone}</div>
                    <div className="wo-c-amc">AMC: {c.amcContractId || 'AMC-ACTIVE'}</div>
                    <div className="wo-c-rating">&#9733; {c.rating || '4.5'} / 5.0</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Bidding Mode Explainer */
          <div className="wo-section" style={{ background: '#faf5ff', border: '1px solid #e9d5ff', padding: 18, borderRadius: 8 }}>
            <div className="wo-section-title" style={{ color: '#6b21a8' }}>
              ⚡ Multi-Contractor Competitive Bidding
            </div>
            <p style={{ fontSize: 13, color: '#581c87', margin: '4px 0 12px 0' }}>
              Bidding invites all authorized contractors in the <strong>{active.category}</strong> category. The winning bid will be automatically chosen based on lowest rate &amp; contractor rating score.
            </p>
          </div>
        )}

        {/* Section 2: Priority Selection */}
        <div className="wo-section">
          <div className="wo-section-title">2. Work Order Priority</div>
          <div className="wo-priority-grid">
            {PRIORITIES.map((p) => (
              <div
                key={p}
                onClick={() => setValue('priority', p)}
                className={`wo-priority-card${currentPriority === p ? ` selected-${p.toLowerCase()}` : ''}`}
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
            {...register('specialInstructions')}
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
            disabled={isSubmitting || (dispatchMode === 'DIRECT' && !selectedContractorId)}
            style={{ background: dispatchMode === 'BIDDING' ? '#7c3aed' : undefined }}
          >
            {isSubmitting
              ? 'Processing...'
              : dispatchMode === 'BIDDING'
              ? 'Open for Multi-Contractor Bidding ⚡'
              : 'Dispatch Work Order ✉'}
          </button>
        </div>
      </form>

      {/* Bidding & Auto-Selection Console (Visible when bidding mode active or bids exist) */}
      {(dispatchMode === 'BIDDING' || bids.length > 0) && (
        <div style={{ marginTop: 28, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, color: '#1e293b' }}>
                📊 Multi-Contractor Bidding &amp; Auto-Selection Console
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>
                Algorithmic Evaluation Formula: <strong>50% Cost + 35% Contractor Rating + 15% Timeline</strong>
              </p>
            </div>

            {bids.length >= 2 && (
              <button
                type="button"
                onClick={handleAutoSelectBest}
                disabled={isAutoSelecting}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                {isAutoSelecting ? 'Evaluating...' : '⚡ Auto-Select Best Contractor'}
              </button>
            )}
          </div>

          {loadingBids ? (
            <p style={{ fontSize: 13, color: '#64748b' }}>Loading contractor bids...</p>
          ) : bids.length === 0 ? (
            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 6, textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 12px 0' }}>
                No contractor bids submitted yet for this tender.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                {filteredContractors.slice(0, 3).map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      handleSimulateBid(
                        c,
                        4500 + i * 800,
                        2 + i,
                        `Standard AMC tender response with certified materials`
                      )
                    }
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + Submit Bid as {c.name || `Contractor ${i + 1}`} (₹{4500 + i * 800})
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '10px 12px' }}>Contractor</th>
                    <th style={{ padding: '10px 12px' }}>Rating</th>
                    <th style={{ padding: '10px 12px' }}>Bid Amount</th>
                    <th style={{ padding: '10px 12px' }}>Est. Timeline</th>
                    <th style={{ padding: '10px 12px' }}>Justification</th>
                    <th style={{ padding: '10px 12px' }}>Composite Score</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bids.map((b) => {
                    const isSelected = b.status === 'SELECTED'
                    return (
                      <tr
                        key={b.id}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          background: isSelected ? '#ecfdf5' : 'transparent',
                          fontWeight: isSelected ? 600 : 'normal',
                        }}
                      >
                        <td style={{ padding: '10px 12px' }}>
                          <strong>{b.contractor?.name || b.contractor_name || 'Vendor'}</strong>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#d97706' }}>
                          ★ {b.contractor_rating_snapshot || b.contractor?.rating || '4.5'}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                          ₹{Number(b.bid_amount || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {b.estimated_days || 2} days
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748b', maxWidth: 220 }}>
                          {b.justification || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#2563eb', fontWeight: 700 }}>
                          {b.composite_score ? `${Number(b.composite_score).toFixed(1)} / 100` : 'Evaluated'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              background: isSelected ? '#d1fae5' : '#f1f5f9',
                              color: isSelected ? '#065f46' : '#64748b',
                            }}
                          >
                            {isSelected ? '✓ AWARDED' : b.status || 'SUBMITTED'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Add competing bidder button */}
              <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Simulate another vendor:</span>
                {filteredContractors.slice(bids.length, bids.length + 2).map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      handleSimulateBid(
                        c,
                        5200 + i * 700,
                        3 + i,
                        `Alternative proposal with standard rate card coverage`
                      )
                    }
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      padding: '4px 10px',
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    + Add Bid from {c.name || `Vendor ${i + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
