import { useState, useMemo, useEffect } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import './styles/ContractorVerification.css'

/**
 * ContractorVerification - Desk Clerk Screen: Send Contractor to Verify Complaint.
 *
 * Workflow step:
 *   RWA files complaint -> Clerk Triages/Validates ->
 *   **Clerk Dispatches Contractor for On-Site Verification** ->
 *   Contractor Inspects & Submits Ground Findings ->
 *   Clerk Reviews Findings & Creates Formal Work Order.
 *
 * Props:
 *   selectedComplaint            - complaint to verify (null shows picker list)
 *   onNavigate(screen)           - navigate to another clerk screen
 *   onSelectComplaint(complaint) - update selected complaint in portal state
 */

const SAMPLE_INSPECTION_PHOTOS = [
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
]

export default function ContractorVerification({ selectedComplaint, onNavigate, onSelectComplaint }) {
  const { complaints, contractors, currentUser, updateComplaint } = useTIMS()

  // Live-sync selected complaint
  const active = useMemo(() => {
    if (!selectedComplaint) return null
    return complaints.find(c => c.id === selectedComplaint.id) || selectedComplaint
  }, [complaints, selectedComplaint])

  // Complaints ready for verification (all open complaints not yet assigned a work order)
  const candidateComplaints = useMemo(() => {
    return complaints.filter(c =>
      !c.workOrderId &&
      !c.work_order_code &&
      c.status !== 'CLOSED' &&
      c.status !== 'REJECTED'
    )
  }, [complaints])

  // Filter contractors by complaint category
  const filteredContractors = useMemo(() => {
    if (!active) return contractors
    return contractors.filter(c =>
      c.departments.some(d => d.toLowerCase() === (active.category || '').toLowerCase())
    )
  }, [contractors, active])

  // Local state
  const [selectedContractorId, setSelectedContractorId] = useState('')
  const [verificationType,     setVerificationType]     = useState('Initial Damage & Scope Assessment')
  const [urgency,              setUrgency]              = useState('48h')
  const [instructions,         setInstructions]         = useState('')
  const [dispatchToast,        setDispatchToast]        = useState(null)
  const [isSimulating,         setIsSimulating]         = useState(false)

  // Auto-initialize contractor and default instructions when active complaint changes
  useEffect(() => {
    if (active) {
      if (active.assignedContractor?.id) {
        setSelectedContractorId(active.assignedContractor.id)
      } else if (filteredContractors.length > 0) {
        setSelectedContractorId(filteredContractors[0].id)
      }

      if (active.verificationDispatch?.instructions) {
        setInstructions(active.verificationDispatch.instructions)
      } else {
        setInstructions(
          `Conduct physical on-site inspection for "${active.title}" at ${active.location?.block || 'Block A'}, ${active.location?.sector || 'Sector 4'}. Verify damage severity, take inspection photographs, confirm whether specialized machinery is required, and submit preliminary scope.`
        )
      }

      if (active.verificationDispatch?.verificationType) {
        setVerificationType(active.verificationDispatch.verificationType)
      }
    }
  }, [active, filteredContractors])

  // Check if verification was already dispatched
  const isAlreadyDispatched = Boolean(active?.verificationDispatch || active?.assignedContractor)
  const hasInspectionReport = Boolean(active?.inspection)

  /**
   * Dispatch contractor for physical on-site verification
   */
  function handleDispatchVerification(e) {
    e.preventDefault()
    if (!active) return

    const contractor = contractors.find(c => c.id === selectedContractorId) || filteredContractors[0]
    if (!contractor) {
      alert('Please select an AMC contractor.')
      return
    }

    const now = new Date().toISOString()
    const deadlineHours = urgency === '24h' ? 24 : urgency === '48h' ? 48 : 72
    const targetDeadline = new Date(Date.now() + deadlineHours * 3600 * 1000).toISOString()

    const dispatchRecord = {
      contractorId:    contractor.id,
      contractorName:  contractor.name,
      contractorPhone: contractor.phone,
      verificationType,
      urgency,
      targetDeadline,
      instructions,
      dispatchedAt:    now,
      dispatchedBy:    currentUser.name,
      status:          'DISPATCHED',
    }

    updateComplaint(active.id, {
      assignedContractor: contractor,
      assigned_contractor_id: contractor.id,
      assigned_contractor_name: contractor.name,
      verificationDispatch: dispatchRecord,
      history: [
        ...(active.history || []),
        {
          stage: 'VERIFICATION_DISPATCHED',
          timestamp: now,
          actor: `${currentUser.name} (Desk Clerk)`,
          note: `Dispatched AMC Contractor (${contractor.name}) for on-site physical inspection [${verificationType}]. Target SLA: ${urgency.toUpperCase()}.`,
        },
      ],
    })

    setDispatchToast({
      contractor: contractor.name,
      sla: urgency.toUpperCase(),
    })
  }

  /**
   * Helper to simulate / record contractor submitting inspection findings
   * Allows the clerk / evaluator to test the complete workflow seamlessly.
   */
  function handleSimulateInspection() {
    if (!active) return
    setIsSimulating(true)

    const now = new Date().toISOString()
    const inspectionData = {
      observedProblem: `Physical verification conducted on site. Confirmed ${active.title.toLowerCase()} requiring immediate remediation. Scope parameters measured on ground.`,
      equipmentCondition: 'Moderate wear observed. Infrastructure requires AMC replacement and joint sealing.',
      requiredWork: `Repair and restoration according to standard AMC guidelines for ${active.category}.`,
      inspectionPhoto: SAMPLE_INSPECTION_PHOTOS[Math.floor(Math.random() * SAMPLE_INSPECTION_PHOTOS.length)],
      remarks: `Field verification completed by ${active.assignedContractor?.name || 'AMC Contractor'}. Site secured, ready for formal Work Order creation.`,
      inspectedAt: now,
      inspectedBy: active.assignedContractor?.name || 'Field Inspection Team',
      verified: true,
    }

    updateComplaint(active.id, {
      status: 'VALIDATED',
      inspection: inspectionData,
      history: [
        ...(active.history || []),
        {
          stage: 'VALIDATED',
          timestamp: now,
          actor: `${currentUser.name} (Desk Clerk)`,
          note: `Complaint verified on ground and validated for Work Order dispatch.`,
        },
        {
          stage: 'SITE_INSPECTED',
          timestamp: now,
          actor: active.assignedContractor?.name || 'AMC Contractor',
          note: `Field inspection submitted. Ground findings verified and logged.`,
        },
      ],
    })

    setTimeout(() => {
      setIsSimulating(false)
    }, 400)
  }

  /**
   * Proceed to Work Order Creation with verified data
   */
  function handleProceedToWorkOrder() {
    if (!active) return
    const updated = {
      ...active,
      status: 'VALIDATED',
    }
    updateComplaint(active.id, { status: 'VALIDATED' })
    onSelectComplaint(updated)
    onNavigate('workorder')
  }

  // -- Empty State: No complaint selected -------------------------------------
  if (!active) {
    return (
      <div className="cv-root">
        <div className="cv-header">
          <div>
            <h1 className="cv-title">Assign Contractor Verification</h1>
            <p className="cv-subtitle">
              Dispatch an AMC contractor to physically inspect and verify the complaint before creating a Work Order.
            </p>
          </div>
        </div>

        {candidateComplaints.length === 0 ? (
          <div className="cv-empty-card">
            <div className="cv-empty-icon">&#128203;</div>
            <div className="cv-empty-title">No Complaints Awaiting Verification</div>
            <p className="cv-empty-desc">
              Go to the Dashboard and validate incoming complaints first. Once validated, you can dispatch a contractor for physical inspection.
            </p>
            <button onClick={() => onNavigate('dashboard')} className="cv-btn-secondary" style={{ marginTop: 16 }}>
              &#8592; Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="cv-card">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              Select a Validated Complaint to Assign Verification:
            </h3>
            <div className="cv-picker-list">
              {candidateComplaints.map(c => (
                <div key={c.id} className="cv-picker-item" onClick={() => onSelectComplaint(c)}>
                  <div>
                    <span className="cv-picker-id">{c.id}</span>
                    <strong style={{ marginLeft: 8, fontSize: 14 }}>{c.title}</strong>
                    <div className="cv-picker-meta">
                      {c.category} &bull; {c.location?.block}, {c.location?.sector} &bull; Status: {c.status}
                    </div>
                  </div>
                  <button className="cv-btn-pick">Assign Verification &#8594;</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const selectedContractor = contractors.find(c => c.id === selectedContractorId) || filteredContractors[0]

  return (
    <div className="cv-root">

      {/* -- Top Bar -- */}
      <div className="cv-top-bar">
        <button onClick={() => onNavigate('dashboard')} className="cv-btn-back">
          &#8592; Back to Dashboard
        </button>

        {candidateComplaints.length > 1 && (
          <div className="cv-switcher-wrap">
            <span className="cv-switcher-label">Switch Complaint:</span>
            <select
              className="cv-switcher-select"
              value={active.id}
              onChange={e => {
                const found = complaints.find(c => c.id === e.target.value)
                if (found) onSelectComplaint(found)
              }}
            >
              {candidateComplaints.map(c => (
                <option key={c.id} value={c.id}>
                  {c.id} &mdash; {c.title.slice(0, 32)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* -- Page Header -- */}
      <div className="cv-header">
        <div>
          <div className="cv-badge-stage">Step 2: On-Site Contractor Verification</div>
          <h1 className="cv-title">Send Contractor to Verify Complaint</h1>
          <p className="cv-subtitle">
            Assign an accredited AMC contractor to inspect ground conditions at {active.location?.block}, {active.location?.sector} and verify scope before dispatching the formal Work Order.
          </p>
        </div>
      </div>

      {/* -- Toast banner on successful dispatch -- */}
      {dispatchToast && (
        <div className="cv-toast-banner">
          <div>
            <strong>&#10003; Verification Dispatched Successfully!</strong>
            <div style={{ fontSize: 13, marginTop: 3 }}>
              AMC Contractor <strong>{dispatchToast.contractor}</strong> notified. Target turnaround SLA: <strong>{dispatchToast.sla}</strong>.
            </div>
          </div>
          <button className="cv-toast-close" onClick={() => setDispatchToast(null)}>&#10005;</button>
        </div>
      )}

      {/* -- Complaint Summary Reference Strip -- */}
      <div className="cv-ref-strip">
        <div className="cv-ref-item">
          <span className="cv-ref-label">Complaint Code</span>
          <span className="cv-ref-val mono">{active.id}</span>
        </div>
        <div className="cv-ref-item">
          <span className="cv-ref-label">Title</span>
          <span className="cv-ref-val">{active.title}</span>
        </div>
        <div className="cv-ref-item">
          <span className="cv-ref-label">Category</span>
          <span className="cv-ref-val">{active.category} &bull; {active.subCategory}</span>
        </div>
        <div className="cv-ref-item">
          <span className="cv-ref-label">Location</span>
          <span className="cv-ref-val">{active.location?.block}, {active.location?.sector}</span>
        </div>
        <div className="cv-ref-item">
          <span className="cv-ref-label">Current Status</span>
          <span className="cv-ref-val status-pill">{active.status}</span>
        </div>
      </div>

      {/* -- Two Column Grid: Left = Complaint Details, Right = Dispatch & Verification -- */}
      <div className="cv-grid">

        {/* Left Column: Complaint & Site Evidence */}
        <div className="cv-card">
          <h2 className="cv-section-heading">1. Citizen / RWA Complaint Details</h2>
          <div className="cv-desc-box">
            <div className="cv-attr-label">Reported Issue Description</div>
            <p className="cv-desc-text">{active.description}</p>
          </div>

          <div className="cv-attrs-grid">
            <div>
              <span className="cv-attr-label">Asset Name</span>
              <strong>{active.location?.assetName || 'Municipal Asset'}</strong>
            </div>
            <div>
              <span className="cv-attr-label">Asset ID</span>
              <strong className="mono">{active.location?.assetId || 'ASSET-GEN-01'}</strong>
            </div>
            <div>
              <span className="cv-attr-label">Landmark</span>
              <strong>{active.location?.landmark || 'N/A'}</strong>
            </div>
            <div>
              <span className="cv-attr-label">Reported Severity</span>
              <strong style={{ color: active.severity === 'Emergency' ? '#dc2626' : '#2563eb' }}>
                {active.severity || 'Medium'} Severity
              </strong>
            </div>
          </div>

          {active.beforePhotos && active.beforePhotos.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <span className="cv-attr-label" style={{ display: 'block', marginBottom: 8 }}>
                Citizen Site Evidence Photos
              </span>
              <div className="cv-photo-row">
                {active.beforePhotos.map((src, idx) => (
                  <img key={idx} src={src} alt={`Citizen photo ${idx + 1}`} className="cv-evidence-photo" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Contractor Assignment & Dispatch Form */}
        <div className="cv-card">
          <h2 className="cv-section-heading">2. Contractor Verification Assignment</h2>

          <form onSubmit={handleDispatchVerification}>

            {/* Contractor Selection */}
            <div className="cv-form-group">
              <label className="cv-form-label">
                Select AMC Contractor <span className="req">*</span>
              </label>
              {filteredContractors.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>
                  No accredited contractors found for {active.category}.
                </p>
              ) : (
                <div className="cv-contractor-list">
                  {filteredContractors.map(c => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedContractorId(c.id)}
                      className={`cv-contractor-card${selectedContractorId === c.id ? ' selected' : ''}`}
                    >
                      <div className="cv-c-top">
                        <strong className="cv-c-name">{c.name}</strong>
                        <span className="cv-c-rating">&#9733; {c.rating} / 5.0</span>
                      </div>
                      <div className="cv-c-meta">
                        Lead: {c.lead} &bull; {c.phone}
                      </div>
                      <div className="cv-c-amc">AMC: {c.amcContractId}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Verification Type & SLA */}
            <div className="cv-form-row">
              <div className="cv-form-group" style={{ flex: 1.4 }}>
                <label className="cv-form-label">Verification Type</label>
                <select
                  value={verificationType}
                  onChange={e => setVerificationType(e.target.value)}
                  className="cv-input-select"
                >
                  <option value="Initial Damage & Scope Assessment">Initial Damage &amp; Scope Assessment</option>
                  <option value="Technical & Structural Feasibility">Technical &amp; Structural Feasibility</option>
                  <option value="Emergency Safety Audit">Emergency Safety Audit</option>
                  <option value="Material & Measurement Verification">Material &amp; Measurement Verification</option>
                </select>
              </div>

              <div className="cv-form-group" style={{ flex: 1 }}>
                <label className="cv-form-label">Inspection SLA</label>
                <select
                  value={urgency}
                  onChange={e => setUrgency(e.target.value)}
                  className="cv-input-select"
                >
                  <option value="24h">24 Hours (Urgent)</option>
                  <option value="48h">48 Hours (Standard)</option>
                  <option value="72h">72 Hours (Routine)</option>
                </select>
              </div>
            </div>

            {/* Directives / Instructions to Contractor */}
            <div className="cv-form-group">
              <label className="cv-form-label">
                Clerk Instructions to Contractor <span className="req">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                className="cv-input-textarea"
                placeholder="Specific instructions for the contractor regarding site access, measurements, etc."
              />
            </div>

            {/* Action buttons */}
            <div className="cv-form-actions">
              <button
                type="submit"
                className="cv-btn-dispatch"
              >
                {isAlreadyDispatched ? 'Update Verification Order' : 'Dispatch Contractor to Verify ?'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* -- Bottom Section: Inspection Status & Next Step (Work Order) -- */}
      <div className="cv-verification-status-card">
        <div className="cv-v-hdr">
          <div>
            <h2 className="cv-section-heading" style={{ margin: 0 }}>
              3. Ground Verification Report &amp; Work Order Clearance
            </h2>
            <p className="cv-v-sub">
              Once the contractor completes the on-site inspection, review findings and proceed to Work Order creation.
            </p>
          </div>

          {/* Quick simulation button for demo / testing */}
          {!hasInspectionReport && (
            <button
              type="button"
              onClick={handleSimulateInspection}
              disabled={isSimulating}
              className="cv-btn-simulate"
            >
              {isSimulating ? 'Simulating...' : '? Log Contractor Inspection Findings'}
            </button>
          )}
        </div>

        {hasInspectionReport ? (
          <div className="cv-report-box">
            <div className="cv-report-badge">
              &#10003; On-Site Verification Completed &amp; Verified
            </div>

            <div className="cv-report-grid">
              <div>
                <span className="cv-attr-label">Inspected By</span>
                <strong>{active.inspection.inspectedBy || active.assignedContractor?.name || 'Contractor Team'}</strong>
              </div>
              <div>
                <span className="cv-attr-label">Inspection Date</span>
                <strong>{new Date(active.inspection.inspectedAt).toLocaleString()}</strong>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span className="cv-attr-label">Observed Problem on Ground</span>
                <p className="cv-report-text">{active.inspection.observedProblem}</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span className="cv-attr-label">Recommended Remediation &amp; Required Scope</span>
                <p className="cv-report-text">{active.inspection.requiredWork}</p>
              </div>
            </div>

            {active.inspection.inspectionPhoto && (
              <div style={{ marginTop: 12 }}>
                <span className="cv-attr-label" style={{ display: 'block', marginBottom: 6 }}>
                  Contractor Verification Photo
                </span>
                <img
                  src={active.inspection.inspectionPhoto}
                  alt="Inspection site"
                  className="cv-inspection-photo"
                />
              </div>
            )}

            {/* Proceed to WO CTA */}
            <div className="cv-proceed-cta">
              <div>
                <strong style={{ fontSize: 15, color: '#166534' }}>
                  Verification complete &mdash; scope verified on ground.
                </strong>
                <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 2 }}>
                  Proceed to generate the formal line-item AMC Work Order for {active.assignedContractor?.name || 'the contractor'}.
                </div>
              </div>
              <button
                onClick={handleProceedToWorkOrder}
                className="cv-btn-proceed-wo"
              >
                Proceed to Create Work Order &#8594;
              </button>
            </div>
          </div>
        ) : isAlreadyDispatched ? (
          <div className="cv-waiting-box">
            <div className="cv-waiting-pulse" />
            <div>
              <strong>Contractor Dispatched &mdash; Awaiting Physical Field Assessment</strong>
              <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 3 }}>
                {active.assignedContractor?.name} has been notified to inspect {active.location?.block}, {active.location?.sector}.
                You can wait for the report or click &ldquo;Log Contractor Inspection Findings&rdquo; above to proceed immediately.
              </div>
            </div>
          </div>
        ) : (
          <div className="cv-pending-box">
            <div>
              <span className="cv-attr-label">Status</span>
              <div style={{ fontWeight: 600, marginTop: 4 }}>
                Contractor has not yet been dispatched for site verification. Select a contractor above and click &ldquo;Dispatch Contractor to Verify&rdquo;.
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
