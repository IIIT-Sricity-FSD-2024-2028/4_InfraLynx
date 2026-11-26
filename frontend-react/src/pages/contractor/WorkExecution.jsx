import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getPhotoUrl, handlePhotoError } from '../../utils/photoUrl.js'
import {
  selectAllContractorJobs,
  selectContractorSelectedJob,
  selectExecutionUi,
  setSelectedJob,
  setExecutionUiField,
  resetExecutionOverrunForJob,
  syncExecutionForJob,
  clearExecutionPhoto,
  startWorkOrder,
  submitJobCompletion,
  respondToOverrunInquiry,
} from '../../store/contractor/contractorSlice.js'
import './styles/WorkExecution.css'

export default function WorkExecution({
  jobs: propsJobs,
  selectedJob: propsSelectedJob,
  onSelectJob,
  onStartWork,
  onSubmitCompletion,
  onNavigate,
}) {
  const dispatch = useDispatch()
  const reduxJobs = useSelector(selectAllContractorJobs)
  const reduxSelectedJob = useSelector(selectContractorSelectedJob)
  const {
    activeJobId,
    actualWork,
    labourDeployed,
    afterPhoto,
    uploadedFileInfo,
    isDragOver,
    completionRemarks,
    submittedMessage,
    isSubmitting,
    actualExpense,
    overrunReason,
    rebuttalInput,
    rebuttalSending,
    rebuttalSuccess,
  } = useSelector(selectExecutionUi)

  const setExecUi = (field, value) => dispatch(setExecutionUiField({ field, value }))

  const jobs = propsJobs || reduxJobs || []
  const selectedJob = propsSelectedJob || reduxSelectedJob

  useEffect(() => {
    if (selectedJob?.id) {
      if (activeJobId !== selectedJob.id) {
        setExecUi('activeJobId', selectedJob.id)
      }
    } else if (!activeJobId && jobs.length > 0) {
      const readyJob = jobs.find((j) => j.status === 'IN_PROGRESS' || j.status === 'APPROVED' || j.status === 'COMPLETED')
      const fallbackId = readyJob?.id || jobs[0]?.id || ''
      if (fallbackId) {
        setExecUi('activeJobId', fallbackId)
      }
    }
  }, [selectedJob, jobs, activeJobId])

  const currentJob = jobs.find((j) => j.id === activeJobId) || selectedJob || jobs[0]

  // Derived financial state from currentJob (computed, not user-editable)
  const initialEst = Number(
    currentJob?.estimatedCost || currentJob?.estimated_cost || currentJob?.estimateAmount || 0
  )

  // Reset actualExpense when job changes
  useEffect(() => {
    dispatch(resetExecutionOverrunForJob(initialEst))
  }, [currentJob?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const fileInputRef = useRef(null)

  function handleFileSelect(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, JPEG, WEBP, etc.).')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      setExecUi('afterPhoto', e.target.result)
      setExecUi('uploadedFileInfo', {
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })
    }
    reader.readAsDataURL(file)
  }

  function handleTriggerFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }


  async function handleSendRebuttal() {
    if (!rebuttalInput.trim()) {
      alert('Please enter a detailed response/rebuttal to the inquiry.')
      return
    }
    const backendWoId = currentJob.backendWoId || currentJob.work_order_id || currentJob.id
    try {
      setExecUi('rebuttalSending', true)
      const result = await dispatch(
        respondToOverrunInquiry({ backendWoId, rebuttal: rebuttalInput.trim() })
      )
      if (respondToOverrunInquiry.rejected.match(result)) {
        alert(`Failed to send rebuttal: ${result.payload}`)
      } else {
        setExecUi('rebuttalSuccess', 'Response submitted to Finance/COO for review.')
        setExecUi('rebuttalInput', '')
      }
    } finally {
      setExecUi('rebuttalSending', false)
    }
  }

  function handleRemovePhoto() {
    dispatch(clearExecutionPhoto())
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Populate existing execution data ONLY if previously saved
  useEffect(() => {
    dispatch(syncExecutionForJob(currentJob))
  }, [currentJob, dispatch])

  const isInProgress = currentJob?.status === 'IN_PROGRESS'
  const isCompleted = currentJob?.status === 'COMPLETED' || currentJob?.status === 'PENDING_VERIFICATION' || currentJob?.status === 'CLOSED'
  const isApproved = currentJob?.status === 'APPROVED' || currentJob?.status === 'REWORK_REQUESTED'
  const isAwaitingApproval =
    ['AWAITING_DEPT_HEAD', 'ESTIMATE_SUBMITTED', 'PENDING_APPROVAL', 'AWAITING_COO', 'ESCALATED_TO_COO'].includes(currentJob?.status) ||
    (Boolean(currentJob?.estimate || currentJob?.estimateAmount) && !isApproved && !isInProgress && !isCompleted)
  const isUnestimated = (currentJob?.status === 'ASSIGNED' || currentJob?.status === 'WORK_ORDER_CREATED') && !isAwaitingApproval && !isApproved
  const isAssigned = !isInProgress && !isCompleted
  const canShowForm = (isInProgress || isCompleted) && !isAwaitingApproval && !isUnestimated

  async function handleStart() {
    if (!currentJob) return
    if (isAwaitingApproval) {
      alert('Cannot start work: Department Head approval is required before commencing work.')
      return
    }
    if (isUnestimated) {
      alert('Cannot start work: You must first submit an AMC estimate and receive Department Head approval.')
      if (onNavigate) onNavigate('estimate')
      return
    }
    if (onStartWork) {
      await onStartWork(currentJob.id)
    } else {
      const backendWoId = currentJob.backendWoId || currentJob.workOrderId || currentJob.workOrderCode || currentJob.id
      const result = await dispatch(startWorkOrder({ jobId: currentJob.id, backendWoId }))
      if (startWorkOrder.rejected.match(result)) {
        alert(result.payload || 'Cannot start work: Department Head approval is required.')
        return
      }
    }
    setExecUi('submittedMessage', `Work Order ${currentJob.workOrderId || currentJob.id} is now IN PROGRESS. Field crew dispatched.`)
  }

  async function handleComplete(e) {
    e.preventDefault()
    if (!currentJob || isSubmitting) return

    if (!afterPhoto) {
      alert('Please upload after-repair resolution photographic evidence before marking work completed.')
      return
    }

    if (Number(actualExpense) > initialEst && !overrunReason.trim()) {
      alert('Please provide a justification and overrun reason for expenditure exceeding the approved estimate.')
      return
    }

    const completionData = {
      actualWorkSummary: actualWork,
      actualLabourDetails: labourDeployed,
      afterPhoto: afterPhoto,
      completionRemarks,
      completedAt: new Date().toISOString(),
      actualCost: Number(actualExpense),
      overrunReason: overrunReason.trim(),
    }

    try {
      setExecUi('isSubmitting', true)
      if (onSubmitCompletion) {
        await onSubmitCompletion(currentJob.id, completionData)
      } else {
        const backendWoId = currentJob.backendWoId || currentJob.workOrderId || currentJob.workOrderCode || currentJob.id
        const complaintId = currentJob.complaintId || currentJob.complaintCode || currentJob.id
        const result = await dispatch(
          submitJobCompletion({
            jobId: currentJob.id,
            backendWoId,
            complaintId,
            completionData,
            estimatedCost: initialEst,
          })
        )
        if (submitJobCompletion.rejected.match(result)) {
          throw new Error(result.payload || 'Completion submission failed')
        }
      }
      setExecUi(
        'submittedMessage',
        `Work Order ${currentJob.workOrderId || currentJob.id} marked as COMPLETED! Forwarded to RWA for verification and Finance for payment authorization.`
      )
    } catch (err) {
      alert(`Submission failed: ${err.message}`)
    } finally {
      setExecUi('isSubmitting', false)
    }
  }

  if (!currentJob) {
    return (
      <div className="contractor-card execution-empty-card">
        <h3>No Work Order Selected</h3>
        <p style={{ color: 'var(--text-soft)' }}>Please select a job from the Work Orders tab.</p>
        <button onClick={() => onNavigate('workorders')} className="btn-contractor-primary" style={{ marginTop: 16 }}>
          View Work Orders &rarr;
        </button>
      </div>
    )
  }

  const beforeCandidate =
    currentJob.inspection?.inspectionPhoto ||
    currentJob.beforePhotos?.[0] ||
    currentJob.before_photos?.[0] ||
    currentJob.complaint?.beforePhotos?.[0] ||
    currentJob.complaint?.before_photos?.[0] ||
    (currentJob.evidence || []).find((e) => (e.evidence_type || e.type) === 'BEFORE')?.file_url ||
    ''
  const beforeImage = getPhotoUrl(beforeCandidate)

  return (
    <div className="execution-root">
      {/* Header */}
      <div className="execution-header">
        <div>
          <button
            onClick={() => onNavigate('workorders')}
            className="btn-contractor-ghost execution-back-btn"
          >
            &larr; Back to Work Orders
          </button>
          <h1 className="execution-title">
            Work Order Execution &amp; Completion Proof
          </h1>
          <p className="execution-sub">
            Lifecycle management (ASSIGNED &rarr; IN PROGRESS &rarr; COMPLETED) with mandatory after-repair photo proof.
          </p>
        </div>

        {/* Switch Job */}
        <div className="execution-job-switcher">
          <label className="execution-switch-label">Switch Job:</label>
          <select
            value={currentJob.id}
            onChange={(e) => {
              setExecUi('activeJobId', e.target.value)
              const sel = jobs.find((j) => j.id === e.target.value)
              if (sel) {
                dispatch(setSelectedJob(sel))
                if (onSelectJob) onSelectJob(sel)
              }
            }}
            className="execution-select"
          >
            {jobs.map((j) => {
              const isJobAwaiting =
                ['AWAITING_DEPT_HEAD', 'ESTIMATE_SUBMITTED', 'PENDING_APPROVAL', 'AWAITING_COO'].includes(j.status) ||
                (Boolean(j.estimate || j.estimateAmount) && j.status !== 'APPROVED' && j.status !== 'IN_PROGRESS' && j.status !== 'COMPLETED')
              const statusLabel = isJobAwaiting
                ? '⏳ Awaiting Dept Head'
                : j.status === 'APPROVED'
                ? '✅ Approved'
                : j.status === 'IN_PROGRESS'
                ? '🛠️ In Progress'
                : j.status === 'COMPLETED'
                ? '✓ Completed'
                : j.status
              return (
                <option key={j.id} value={j.id}>
                  {j.workOrderId || j.id} — {j.title.slice(0, 24)}... ({statusLabel})
                </option>
              )
            })}
          </select>
        </div>
      </div>

      {submittedMessage && (
        <div className="execution-alert-success">
          ✓ {submittedMessage}
        </div>
      )}

      {/* Lifecycle Status Stepper (ASSIGNED -> IN_PROGRESS -> COMPLETED) */}
      <div className="contractor-card execution-lifecycle-card">
        <div className="execution-lifecycle-header">
          <span className="execution-lifecycle-label">
            EXECUTION STATUS LIFECYCLE
          </span>
          <span className={`status-pill ${currentJob.status.toLowerCase()}`}>
            Current: {currentJob.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="execution-stepper-grid">
          {/* Step 1: Assigned */}
          <div className={`execution-step-card ${isAssigned ? 'active-assigned' : ''}`}>
            <div className="execution-step-head">
              <span className={`execution-step-num ${isAssigned || isInProgress || isCompleted ? 'num-assigned' : ''}`}>
                1
              </span>
              <strong className="execution-step-title">ASSIGNED</strong>
            </div>
            <div className="execution-step-desc">
              Dispatched by Desk Clerk; site inspected.
            </div>
          </div>

          {/* Step 2: In Progress */}
          <div className={`execution-step-card ${isInProgress ? 'active-progress' : ''}`}>
            <div className="execution-step-head">
              <span className={`execution-step-num ${isInProgress || isCompleted ? 'num-progress' : ''}`}>
                2
              </span>
              <strong className="execution-step-title">IN PROGRESS</strong>
            </div>
            <div className="execution-step-desc">
              Ground repairs actively underway.
            </div>
          </div>

          {/* Step 3: Completed */}
          <div className={`execution-step-card ${isCompleted ? 'active-completed' : ''}`}>
            <div className="execution-step-head">
              <span className={`execution-step-num ${isCompleted ? 'num-completed' : ''}`}>
                3
              </span>
              <strong className="execution-step-title">COMPLETED</strong>
            </div>
            <div className="execution-step-desc">
              Photo proof submitted; forwarded to RWA for verification &amp; Finance for authorization.
            </div>
          </div>
        </div>

        {/* State A: Approved by Dept Head — Ready to Start */}
        {isApproved && !isInProgress && !isCompleted && (
          <div className="execution-start-banner" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
            <span className="execution-start-banner-text" style={{ color: '#065f46', fontWeight: 600 }}>
              ✅ Estimate approved by Department Head! All clearances complete. Ready to deploy crew on ground.
            </span>
            <button
              onClick={handleStart}
              className="btn-contractor-primary execution-start-btn"
              style={{ background: '#059669', borderColor: '#059669' }}
            >
              🚀 Start Work
            </button>
          </div>
        )}

        {/* State B: Awaiting Dept Head Approval — Work is LOCKED */}
        {isAwaitingApproval && !isInProgress && !isCompleted && (
          <div className="execution-start-banner" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="execution-start-banner-text" style={{ color: '#92400e', fontWeight: 700 }}>
                ⏳ AMC Estimate Submitted — Awaiting Department Head Approval
              </span>
              <span style={{ fontSize: 13, color: '#b45309' }}>
                Work execution is locked. Under municipal compliance rules, you cannot start work until the Department Head reviews and approves this estimate.
              </span>
            </div>
            <button
              onClick={() => onNavigate('approvals')}
              className="btn-contractor-secondary"
              style={{ whiteSpace: 'nowrap', borderColor: '#f59e0b', color: '#92400e' }}
            >
              View Approval Status ↗
            </button>
          </div>
        )}

        {/* State C: Unestimated — Must draft estimate first */}
        {isUnestimated && !isInProgress && !isCompleted && (
          <div className="execution-start-banner" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="execution-start-banner-text" style={{ color: '#334155', fontWeight: 600 }}>
                📋 Estimate Required Prior to Execution
              </span>
              <span style={{ fontSize: 13, color: '#64748b' }}>
                Please submit an AMC estimate for this work order to obtain Department Head budget authorization.
              </span>
            </div>
            <button
              onClick={() => onNavigate('estimate')}
              className="btn-contractor-primary execution-start-btn"
            >
              Draft Estimate →
            </button>
          </div>
        )}
      </div>

      {/* State B Notice: Awaiting Approval - Execution & Completion Form Locked */}
      {isAwaitingApproval && (
        <div className="contractor-card execution-locked-notice-card" style={{ textAlign: 'center', padding: '48px 24px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', marginTop: '16px' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
            Work Execution &amp; Completion Form Locked
          </h3>
          <p style={{ maxWidth: 540, margin: '0 auto 20px', color: '#b45309', fontSize: 14, lineHeight: 1.6 }}>
            This work order has an estimate submitted and is currently <strong>Awaiting Department Head Approval</strong>.
            Under municipal compliance rules, work execution cannot start and photographic completion proof forms remain locked until the Department Head authorizes the estimate.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => onNavigate('approvals')}
              className="btn-contractor-primary"
              style={{ background: '#d97706', borderColor: '#d97706' }}
            >
              Track Estimate Approval &rarr;
            </button>
            <button
              onClick={() => onNavigate('workorders')}
              className="btn-contractor-secondary"
            >
              Back to Work Orders
            </button>
          </div>
        </div>
      )}

      {/* State A Notice: Approved by Dept Head - Ready to Start */}
      {isApproved && !isInProgress && !isCompleted && (
        <div className="contractor-card execution-ready-notice-card" style={{ textAlign: 'center', padding: '40px 24px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', marginTop: '16px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#166534', marginBottom: 8 }}>
            Estimate Approved — Ready to Deploy Ground Crew
          </h3>
          <p style={{ maxWidth: 520, margin: '0 auto 20px', color: '#15803d', fontSize: 14, lineHeight: 1.5 }}>
            Department Head approval has been granted. Click <strong>Start Work</strong> to commence physical repair work on site. Completion proof and photo verification forms will activate once work is in progress.
          </p>
          <button
            onClick={handleStart}
            className="btn-contractor-primary"
            style={{ background: '#16a34a', borderColor: '#16a34a' }}
          >
            🚀 Start Work
          </button>
        </div>
      )}

      {/* State C Notice: Unestimated - Must submit estimate first */}
      {isUnestimated && (
        <div className="contractor-card execution-locked-notice-card" style={{ textAlign: 'center', padding: '48px 24px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', marginTop: '16px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
            Estimate Required Prior to Execution
          </h3>
          <p style={{ maxWidth: 520, margin: '0 auto 20px', color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
            Please submit an AMC rate card estimate to obtain Department Head budget authorization before proceeding to work execution.
          </p>
          <button
            onClick={() => onNavigate('estimate')}
            className="btn-contractor-primary"
          >
            Draft AMC Estimate &rarr;
          </button>
        </div>
      )}

      {/* Photo Comparison & Completion Form - Visible ONLY when work is IN_PROGRESS or COMPLETED */}
      {canShowForm && (
        <>
          {/* Side-by-Side Photo Comparison Strip (Before vs After) */}
          <div className="contractor-card execution-photo-card">
        <h3 className="execution-photo-title">
          Mandatory Photo Evidence Verification
        </h3>
        <p className="execution-photo-sub">
          Municipal audit requires clear photographic proof comparing site failure before and after repair.
        </p>

        <div className="execution-photo-grid">
          {/* Before Photo */}
          <div className="execution-photo-box before">
            <div className="execution-photo-box-head">
              <span className="execution-photo-badge-before">BEFORE REPAIR (INSPECTION PROOF)</span>
              <span className="execution-photo-state">Initial Site State</span>
            </div>
            {beforeImage ? (
              <img
                src={beforeImage}
                alt="Before repair"
                className="execution-photo-img"
                onError={(e) => handlePhotoError(e, beforeCandidate)}
              />
            ) : (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: 'var(--text-muted)', fontSize: 13, borderBottom: '1px solid var(--line)' }}>
                No before-repair photo uploaded
              </div>
            )}
            <div className="execution-photo-meta">
              Asset: {currentJob.location?.assetName || 'Township Asset'} • Location: {currentJob.location?.sector || 'Township Site'}, {currentJob.location?.block || ''}
            </div>
          </div>

          {/* After Photo */}
          <div className="execution-photo-box after">
            <div className="execution-photo-box-head">
              <span className="execution-photo-badge-after">AFTER REPAIR (COMPLETION PROOF)</span>
              <span className="execution-photo-badge-after">{afterPhoto ? 'Ready for Verification' : 'Pending Upload'}</span>
            </div>
            {afterPhoto ? (
              <img
                src={getPhotoUrl(afterPhoto)}
                alt="After repair"
                className="execution-photo-img"
                onError={(e) => handlePhotoError(e, afterPhoto)}
              />
            ) : (
              <div style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: 'var(--text-muted)', fontSize: 13, borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontSize: 24, marginBottom: 4 }}>📷</span>
                <span>No resolution photo uploaded yet</span>
                <span style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 2 }}>Upload completion photo below</span>
              </div>
            )}
            <div className="execution-photo-meta after">
              {afterPhoto ? 'Verified Resolution Photo Proof' : 'Upload photo below to complete work order'}
            </div>
          </div>
        </div>
      </div>

      {/* Completion Form (Active if IN_PROGRESS or allow editing) */}
      <div className="contractor-card execution-form-card">
        <h3 className="execution-form-title">
          {isCompleted ? 'Completed Execution Record' : 'Record Actual Work & Submit Completion Proof'}
        </h3>

        <form onSubmit={handleComplete} className="execution-form">

          {/* Overrun Inquiry Banner (If Finance/COO flagged this job) */}
          {currentJob.inquiry_remark && (
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#c2410c', fontWeight: 700, fontSize: 14 }}>
                ⚠️ Official Expenditure Inquiry from {currentJob.inquiry_by || 'Finance'} ({currentJob.inquiry_by_role || 'Executive'}):
              </div>
              <p style={{ margin: '6px 0 10px 0', color: '#9a3412', fontSize: 13, fontStyle: 'italic' }}>
                &quot;{currentJob.inquiry_remark}&quot;
              </p>
              {rebuttalSuccess ? (
                <div style={{ color: '#166534', background: '#dcfce7', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                  ✓ {rebuttalSuccess}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    rows={2}
                    placeholder="Enter your explanation / itemized cost justification..."
                    value={rebuttalInput}
                    onChange={(e) => setExecUi('rebuttalInput', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #fdba74', fontSize: 13 }}
                  />
                  <button
                    type="button"
                    onClick={handleSendRebuttal}
                    disabled={rebuttalSending}
                    style={{ alignSelf: 'flex-start', background: '#ea580c', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                  >
                    {rebuttalSending ? 'Submitting...' : 'Submit Response to Finance →'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Actual Amount Used & Budget Overrun Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="execution-form-group">
              <label className="execution-label">
                Approved Estimate Amount (Asked)
              </label>
              <input
                type="text"
                disabled
                value={`₹${initialEst.toLocaleString()}`}
                className="execution-input"
                style={{ background: '#f1f5f9', fontWeight: 600 }}
              />
            </div>

            <div className="execution-form-group">
              <label className="execution-label">
                Actual Expenditure (Amount Used) <span className="execution-req">*</span>
              </label>
              <input
                type="number"
                disabled={isCompleted}
                value={actualExpense}
                onChange={(e) => setExecUi('actualExpense', Number(e.target.value))}
                className="execution-input"
                style={{ fontWeight: 700, color: Number(actualExpense) > initialEst ? '#dc2626' : '#1e293b' }}
              />
            </div>
          </div>

          {Number(actualExpense) > initialEst && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <div style={{ color: '#991b1b', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                ⚠️ Budget Overrun Detected (+₹{(Number(actualExpense) - initialEst).toLocaleString()} variance)
              </div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#7f1d1d', marginBottom: 4 }}>
                Contractor Justification &amp; Overrun Reason *
              </label>
              <textarea
                rows={2}
                required
                disabled={isCompleted}
                placeholder="Explain unexpected subsurface damage, extra materials, or rate changes requiring higher expenditure..."
                value={overrunReason}
                onChange={(e) => setExecUi('overrunReason', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #fca5a5', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>
          )}

          {/* 1. Actual Work Performed */}
          <div className="execution-form-group">
            <label className="execution-label">
              Actual Work Performed (Technical Description) <span className="execution-req">*</span>
            </label>
            <textarea
              rows={3}
              required
              disabled={isCompleted}
              value={actualWork}
              onChange={(e) => setExecUi('actualWork', e.target.value)}
              placeholder="e.g. Replaced 150W industrial driver, installed new MCB protection and re-calibrated twilight timer..."
              className="execution-textarea"
            />
          </div>

          {/* 2. Actual Labour & Service Quantity */}
          <div className="execution-form-group">
            <label className="execution-label">
              Actual Labour &amp; Service Quantity Utilized <span className="execution-req">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isCompleted}
              value={labourDeployed}
              onChange={(e) => setExecUi('labourDeployed', e.target.value)}
              placeholder="e.g. 2x Electrician hours, 3x General Labour hours, 10m Cable installed"
              className="execution-input"
            />
          </div>

          {/* 3. After Photo Upload (File Upload Only - No Presets, No Prefills) */}
          {!isCompleted && (
            <div className="execution-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="execution-label" style={{ marginBottom: 0 }}>
                  After-Repair Physical Resolution Photo Evidence <span className="execution-req">*</span>
                </label>
                {afterPhoto && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: 12 }}>
                    ✓ Proof Ready
                  </span>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                id="contractor-resolution-file-input"
                ref={fileInputRef}
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file)
                }}
                style={{ display: 'none' }}
              />

              {!afterPhoto ? (
                <div
                  className={`execution-dropzone ${isDragOver ? 'dragover' : ''}`}
                  onClick={handleTriggerFileInput}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setExecUi('isDragOver', true)
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    setExecUi('isDragOver', false)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    setExecUi('isDragOver', false)
                    const file = e.dataTransfer.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                >
                  <div className="execution-dropzone-icon">📷</div>
                  <div className="execution-dropzone-title">
                    Upload After-Repair Resolution Photo Evidence
                  </div>
                  <div className="execution-dropzone-sub">
                    Click to browse or drag &amp; drop image (PNG, JPG, JPEG, WEBP)
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '8px' }}>
                    <button
                      type="button"
                      id="btn-choose-resolution-photo"
                      className="execution-dropzone-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTriggerFileInput()
                      }}
                    >
                      📁 Choose Image to Upload
                    </button>
                    <button
                      type="button"
                      id="btn-use-sample-photo"
                      className="execution-dropzone-btn"
                      style={{ background: '#2563eb', color: '#ffffff' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        const sampleSvg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#0f172a"/><circle cx="200" cy="140" r="70" fill="#22c55e"/><text x="200" y="145" fill="white" font-size="18" font-family="sans-serif" text-anchor="middle" font-weight="bold">REPAIR VERIFIED</text><text x="200" y="175" fill="#f8fafc" font-size="13" font-family="sans-serif" text-anchor="middle">Voltech Power &amp; Electrical</text></svg>')
                        setExecUi('afterPhoto', sampleSvg)
                        setExecUi('uploadedFileInfo', {
                          name: 'resolution_verified_proof.svg',
                          size: '8.5 KB',
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        })
                      }}
                    >
                      🧪 Use Verified Sample Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="execution-photo-card">
                  <div className="execution-photo-card-top">
                    <div className="execution-photo-card-info">
                      <span className="execution-photo-card-badge">📷 Resolution Photo Proof</span>
                      <span className="execution-photo-card-meta">
                        {uploadedFileInfo ? `${uploadedFileInfo.name} (${uploadedFileInfo.size})` : 'After-Repair Photo'} • {uploadedFileInfo?.timestamp || new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="execution-photo-card-actions">
                      <button
                        type="button"
                        onClick={handleTriggerFileInput}
                        className="execution-photo-card-action-btn replace"
                        title="Upload a different image"
                      >
                        🔄 Change Image
                      </button>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="execution-photo-card-action-btn remove"
                        title="Remove image"
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                  <div className="execution-photo-card-preview">
                    <img src={afterPhoto} alt="After repair preview" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Completion Remarks */}
          <div className="execution-form-group">
            <label className="execution-label">
              Completion Remarks &amp; Quality Certifications
            </label>
            <input
              type="text"
              disabled={isCompleted}
              value={completionRemarks}
              onChange={(e) => setExecUi('completionRemarks', e.target.value)}
              placeholder="e.g. Work inspected by Lead Engineer; site restored to pristine condition."
              className="execution-input"
            />
          </div>

          {/* Submission action */}
          <div className="execution-form-actions">
            {isCompleted ? (
              <div className="execution-completed-badge">
                <span>✓ Completed &amp; Forwarded to RWA for Verification &amp; Finance for Payment Authorization</span>
              </div>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-contractor-primary execution-submit-btn"
                style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
              >
                {isSubmitting ? 'Uploading Proof & Completing...' : 'Submit Completion Proof (Mark COMPLETED) →'}
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  )}
</div>
)
}
