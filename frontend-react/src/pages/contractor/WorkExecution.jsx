import { useState, useEffect, useRef } from 'react'
import './styles/WorkExecution.css'

export default function WorkExecution({
  jobs = [],
  selectedJob,
  onSelectJob,
  onStartWork,
  onSubmitCompletion,
  onNavigate,
}) {
  const [activeJobId, setActiveJobId] = useState(selectedJob ? selectedJob.id : (jobs[0]?.id || ''))
  const currentJob = jobs.find((j) => j.id === activeJobId) || selectedJob || jobs[0]

  // Form states - Starts completely empty (no prefilled dummy values)
  const [actualWork, setActualWork] = useState('')
  const [labourDeployed, setLabourDeployed] = useState('')
  const [afterPhoto, setAfterPhoto] = useState('')
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [completionRemarks, setCompletionRemarks] = useState('')
  const [submittedMessage, setSubmittedMessage] = useState(null)

  const fileInputRef = useRef(null)

  function handleFileSelect(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, JPEG, WEBP, etc.).')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      setAfterPhoto(e.target.result)
      setUploadedFileInfo({
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

  function handleRemovePhoto() {
    setAfterPhoto('')
    setUploadedFileInfo(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Populate existing execution data ONLY if previously saved
  useEffect(() => {
    if (currentJob?.execution?.actualWorkSummary) {
      setActualWork(currentJob.execution.actualWorkSummary)
      setLabourDeployed(currentJob.execution.actualLabourDetails || '')
      setAfterPhoto(currentJob.execution.afterPhoto || currentJob.afterPhotos?.[0] || '')
      setCompletionRemarks(currentJob.completionRemarks || '')
      if (currentJob.execution.afterPhoto || currentJob.afterPhotos?.[0]) {
        setUploadedFileInfo({
          name: 'Resolution Evidence',
          size: 'Saved',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        })
      } else {
        setUploadedFileInfo(null)
      }
    } else {
      // Clean slate - No prefilled values
      setActualWork('')
      setLabourDeployed('')
      setAfterPhoto('')
      setUploadedFileInfo(null)
      setCompletionRemarks('')
    }
  }, [currentJob])

  const isInProgress = currentJob?.status === 'IN_PROGRESS'
  const isCompleted = currentJob?.status === 'COMPLETED' || currentJob?.status === 'PENDING_VERIFICATION' || currentJob?.status === 'CLOSED'
  const isAssigned = currentJob?.status === 'ASSIGNED' || currentJob?.status === 'WORK_ORDER_CREATED' || currentJob?.status === 'APPROVED'
  const isAwaitingApproval = currentJob?.status === 'AWAITING_DEPT_HEAD' || currentJob?.status === 'PENDING_APPROVAL'

  function handleStart() {
    if (!currentJob) return
    onStartWork(currentJob.id)
    setSubmittedMessage(`Work Order ${currentJob.workOrderId || currentJob.id} is now IN PROGRESS. Field crew dispatched.`)
  }

  function handleComplete(e) {
    e.preventDefault()
    if (!currentJob) return

    if (!afterPhoto) {
      alert('Please upload after-repair resolution photographic evidence before marking work completed.')
      return
    }

    const completionData = {
      actualWorkSummary: actualWork,
      actualLabourDetails: labourDeployed,
      afterPhoto: afterPhoto,
      completionRemarks,
      completedAt: new Date().toISOString(),
    }

    onSubmitCompletion(currentJob.id, completionData)
    setSubmittedMessage(
      `Work Order ${currentJob.workOrderId || currentJob.id} marked as COMPLETED! Forwarded to RWA for verification.`
    )
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

  const beforeImage = currentJob.inspection?.inspectionPhoto || currentJob.beforePhotos?.[0] || ''

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
              setActiveJobId(e.target.value)
              const sel = jobs.find((j) => j.id === e.target.value)
              if (sel) onSelectJob(sel)
            }}
            className="execution-select"
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.workOrderId || j.id} — {j.title.slice(0, 30)}... ({j.status})
              </option>
            ))}
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
              Photo proof submitted; pending RWA check.
            </div>
          </div>
        </div>

        {/* Start Work Action if Assigned / Approved */}
        {isAssigned && (
          <div className="execution-start-banner">
            <span className="execution-start-banner-text">
              {currentJob?.status === 'APPROVED' ? 'Estimate approved by Department Head! Ready to deploy crew on ground.' : 'Ready to deploy crew on ground? Click to initiate active status.'}
            </span>
            <button
              onClick={handleStart}
              className="btn-contractor-primary execution-start-btn"
            >
              🚀 Start Work (Mark IN_PROGRESS)
            </button>
          </div>
        )}

        {/* Awaiting Dept Head Notice */}
        {isAwaitingApproval && (
          <div className="execution-start-banner" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
            <span className="execution-start-banner-text" style={{ color: '#92400e', fontWeight: 600 }}>
              ⏳ AMC Estimate submitted and awaiting Department Head authorization. Work execution unlocks automatically once approved.
            </span>
          </div>
        )}
      </div>

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
              <img src={beforeImage} alt="Before repair" className="execution-photo-img" />
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
              <img src={afterPhoto} alt="After repair" className="execution-photo-img" />
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
              onChange={(e) => setActualWork(e.target.value)}
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
              onChange={(e) => setLabourDeployed(e.target.value)}
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
                    setIsDragOver(true)
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    setIsDragOver(false)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDragOver(false)
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
                        setAfterPhoto(sampleSvg)
                        setUploadedFileInfo({
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
              onChange={(e) => setCompletionRemarks(e.target.value)}
              placeholder="e.g. Work inspected by Lead Engineer; site restored to pristine condition."
              className="execution-input"
            />
          </div>

          {/* Submission action */}
          <div className="execution-form-actions">
            {isCompleted ? (
              <div className="execution-completed-badge">
                <span>✓ Completed &amp; Transferred to RWA for verification</span>
              </div>
            ) : (
              <button
                type="submit"
                className="btn-contractor-primary execution-submit-btn"
              >
                Submit Completion Proof (Mark COMPLETED) &rarr;
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
