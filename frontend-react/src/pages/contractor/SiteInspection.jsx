import { useState, useEffect, useMemo, useRef } from 'react'
import { getPhotoUrl, handlePhotoError } from '../../utils/photoUrl.js'
import './styles/SiteInspection.css'

export default function SiteInspection({
  jobs = [],
  selectedJob,
  onSelectJob,
  onSaveInspection,
  onNavigate,
}) {
  // Only work orders that require site inspection and have NOT yet had an estimate created
  const inspectionJobs = useMemo(() => {
    return jobs.filter((j) => {
      const isPastEstimate =
        Boolean(j.estimate) ||
        j.status === 'AWAITING_DEPT_HEAD' ||
        j.status === 'ESTIMATE_SUBMITTED' ||
        j.status === 'APPROVED' ||
        j.status === 'IN_PROGRESS' ||
        j.status === 'COMPLETED' ||
        j.status === 'PENDING_VERIFICATION' ||
        j.status === 'CLOSED'
      const isAssigned = j.status === 'ASSIGNED' || j.status === 'WORK_ORDER_CREATED'
      return isAssigned && !isPastEstimate
    })
  }, [jobs])

  const [activeJobId, setActiveJobId] = useState(() => {
    if (selectedJob && inspectionJobs.some((j) => j.id === selectedJob.id)) {
      return selectedJob.id
    }
    return inspectionJobs[0]?.id || ''
  })

  // Keep activeJobId in sync with available inspectionJobs
  useEffect(() => {
    if (selectedJob && inspectionJobs.some((j) => j.id === selectedJob.id)) {
      setActiveJobId(selectedJob.id)
    } else if (!inspectionJobs.some((j) => j.id === activeJobId)) {
      setActiveJobId(inspectionJobs[0]?.id || '')
    }
  }, [inspectionJobs, selectedJob, activeJobId])

  const currentJob = inspectionJobs.find((j) => j.id === activeJobId) || inspectionJobs[0] || null

  // Form State - Starts completely empty (no prefilled dummy values)
  const [problemObserved, setProblemObserved] = useState('')
  const [equipmentCondition, setEquipmentCondition] = useState('')
  const [requiredWork, setRequiredWork] = useState('')
  const [beforePhoto, setBeforePhoto] = useState('')
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [isSaved, setIsSaved] = useState(false)

  const fileInputRef = useRef(null)

  // Populate existing inspection data ONLY if previously saved
  useEffect(() => {
    if (currentJob?.inspection) {
      setProblemObserved(currentJob.inspection.observedProblem || '')
      setEquipmentCondition(currentJob.inspection.equipmentCondition || '')
      setRequiredWork(currentJob.inspection.requiredWork || '')
      setBeforePhoto(currentJob.inspection.inspectionPhoto || '')
      setRemarks(currentJob.inspection.remarks || '')
      if (currentJob.inspection.inspectionPhoto) {
        setUploadedFileInfo({
          name: 'Site Inspection Evidence',
          size: 'Saved',
          timestamp: new Date(currentJob.inspection.inspectedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        })
      } else {
        setUploadedFileInfo(null)
      }
    } else {
      // Clean slate - No prefilled values
      setProblemObserved('')
      setEquipmentCondition('')
      setRequiredWork('')
      setBeforePhoto('')
      setUploadedFileInfo(null)
      setRemarks('')
    }
    setIsSaved(false)
  }, [currentJob])

  function handleFileSelect(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, JPEG, WEBP, etc.).')
      return
    }

    const reader = new FileReader()
    reader.onload = (uploadEvent) => {
      setBeforePhoto(uploadEvent.target.result)
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
    setBeforePhoto('')
    setUploadedFileInfo(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleSave(proceedToEstimate = false) {
    if (!currentJob) return

    if (!beforePhoto) {
      alert('Please upload photographic evidence before saving the inspection.')
      return
    }

    const inspectionData = {
      observedProblem: problemObserved,
      equipmentCondition: equipmentCondition || 'Moderate Damage',
      requiredWork,
      inspectionPhoto: beforePhoto,
      remarks,
      inspectedAt: new Date().toISOString(),
    }

    onSaveInspection(currentJob.id, inspectionData)
    setIsSaved(true)

    if (proceedToEstimate) {
      onSelectJob({ ...currentJob, inspection: inspectionData })
      onNavigate('estimate')
    }
  }

  if (!currentJob || inspectionJobs.length === 0) {
    return (
      <div className="contractor-card inspection-empty-card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text, #0f172a)', marginBottom: '0.5rem' }}>
          No Work Orders Pending Site Inspection
        </h3>
        <p className="inspection-sub" style={{ color: 'var(--text-muted, #64748b)', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
          All work orders have completed inspection and estimate submission. Check the Approval Status tab to track Department Head authorization.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button onClick={() => onNavigate('approvals')} className="btn-contractor-primary">
            Track Approval Status →
          </button>
          <button onClick={() => onNavigate('workorders')} className="btn-contractor-secondary">
            View All Work Orders
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="inspection-root">
      {/* Top Banner / Breadcrumb */}
      <div className="inspection-header">
        <div className="inspection-header-left">
          <button
            onClick={() => onNavigate('workorders')}
            className="btn-contractor-ghost"
            style={{ padding: 0, marginBottom: 4 }}
          >
            &larr; Back to Work Orders
          </button>
          <h1 className="inspection-title">
            Site Inspection &amp; Technical Assessment
          </h1>
          <p className="inspection-sub">
            Log ground condition, observed failure mode, before-repair photo, and scope for AMC estimate.
          </p>
        </div>

        {/* Job Selector Dropdown - ONLY work orders needing inspection */}
        <div className="inspection-switcher">
          <label className="inspection-switcher-label">
            Switch Work Order ({inspectionJobs.length} Pending):
          </label>
          <select
            value={currentJob.id}
            onChange={(e) => {
              setActiveJobId(e.target.value)
              const selected = inspectionJobs.find((j) => j.id === e.target.value)
              if (selected) onSelectJob(selected)
            }}
            className="inspection-select"
          >
            {inspectionJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.workOrderId || j.id} — {j.title.slice(0, 32)}... ({j.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {isSaved && (
        <div className="inspection-saved-alert">
          ✓ Inspection record saved successfully. You can now build the contractual AMC estimate.
        </div>
      )}

      {/* Two Column Layout: Left = Citizen/RWA Details, Right = Contractor Inspection Form */}
      <div className="inspection-grid">
        {/* Left Column: Complaint & Site Context */}
        <div className="inspection-left-col">
          {/* Work Order Overview Card */}
          <div className="contractor-card">
            <div className="inspection-wo-header">
              <div>
                <span className="inspection-wo-code-badge">
                  {currentJob.workOrderId || 'WO-PENDING'}
                </span>
                <span className="inspection-wo-ref">
                  Ref: {currentJob.id}
                </span>
              </div>
              <span className={`status-pill ${currentJob.status.toLowerCase()}`}>
                {currentJob.status.replace(/_/g, ' ')}
              </span>
            </div>

            <h3 className="inspection-complaint-title">
              {currentJob.title}
            </h3>

            <div className="inspection-complaint-desc">
              <strong>Citizen / RWA Complaint:</strong> {currentJob.description}
            </div>

            <div className="inspection-meta-box">
              <div>
                <span className="inspection-meta-lbl">SECTOR &amp; BLOCK</span>
                <strong className="inspection-meta-val">{currentJob.location?.sector}, {currentJob.location?.block}</strong>
              </div>
              <div>
                <span className="inspection-meta-lbl">STREET / LANDMARK</span>
                <strong className="inspection-meta-val">{currentJob.location?.street || currentJob.location?.landmark || 'Main Road'}</strong>
              </div>
              <div>
                <span className="inspection-meta-lbl">ASSET ID</span>
                <strong className="inspection-meta-val inspection-meta-mono">{currentJob.location?.assetId || 'ASSET-GEN'}</strong>
              </div>
            </div>
          </div>

          {/* RWA Attached Photos */}
          <div className="contractor-card">
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px', color: 'var(--text)' }}>
              Initial Evidence (Uploaded by Citizen / RWA)
            </h4>
            {currentJob.beforePhotos && currentJob.beforePhotos.length > 0 ? (
              <div className="inspection-evidence-grid">
                {currentJob.beforePhotos.map((photo, idx) => (
                  <div key={idx} className="inspection-evidence-thumb">
                    <img
                      src={getPhotoUrl(photo)}
                      alt={`Citizen Proof ${idx + 1}`}
                      className="inspection-evidence-img"
                      onError={(e) => handlePhotoError(e, photo)}
                    />
                    <div className="inspection-evidence-caption">
                      Citizen Proof #{idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed var(--line)', color: 'var(--text-muted)', fontSize: 13 }}>
                No initial citizen evidence photos attached to this complaint.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Technical Site Inspection Form */}
        <div className="contractor-card inspection-form-card">
          <div className="inspection-form-header">
            <span style={{ fontSize: 20 }}>🛠️</span>
            <div>
              <h3 className="inspection-form-title">
                Field Technical Inspection Form
              </h3>
              <div className="inspection-form-sub">
                Required before creating official AMC line-item estimate
              </div>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSave(true)
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {/* 1. Problem Observed */}
            <div className="inspection-form-group">
              <label className="inspection-form-label">
                Problem Observed on Ground <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                rows={3}
                required
                value={problemObserved}
                onChange={(e) => setProblemObserved(e.target.value)}
                placeholder="Describe actual mechanical / electrical failure, damage level, and root cause..."
                className="inspection-form-textarea"
              />
            </div>

            {/* 2. Structural / Equipment Condition */}
            <div className="inspection-form-group">
              <label className="inspection-form-label">
                Structural / Equipment Condition <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                value={equipmentCondition}
                onChange={(e) => setEquipmentCondition(e.target.value)}
                className="inspection-select"
                style={{ width: '100%', padding: '9px 12px', fontSize: 13.5 }}
                required
              >
                <option value="">-- Select Condition --</option>
                <option value="Minor Wear">Minor Wear (Routine consumable replacement)</option>
                <option value="Moderate Damage">Moderate Damage (Components need overhaul / rewiring)</option>
                <option value="Severe Breakdown">Severe Breakdown (Full replacement required)</option>
                <option value="Critical Safety Hazard">Critical Safety Hazard (Immediate isolation required)</option>
              </select>
            </div>

            {/* 3. Required Work Scope */}
            <div className="inspection-form-group">
              <label className="inspection-form-label">
                Required Work &amp; Material Scope <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                rows={3}
                required
                value={requiredWork}
                onChange={(e) => setRequiredWork(e.target.value)}
                placeholder="Specify labour requirements, spare parts, and tools needed under AMC terms..."
                className="inspection-form-textarea"
              />
            </div>

            {/* 4. Before Photo Evidence Upload (File Upload Only - No Presets, No Prefills) */}
            <div className="inspection-form-group">
              <div className="inspection-evidence-header">
                <label className="inspection-form-label" style={{ marginBottom: 0 }}>
                  Contractor Before-Repair Photo Evidence <span style={{ color: '#dc2626' }}>*</span>
                </label>
                {beforePhoto && (
                  <span className="inspection-evidence-tag">
                    ✓ Photo Attached
                  </span>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file)
                }}
                style={{ display: 'none' }}
              />

              {/* Upload Dropzone if no photo, or Photo Card with preview & replace/remove actions */}
              {!beforePhoto ? (
                <div
                  className={`inspection-dropzone ${isDragOver ? 'dragover' : ''}`}
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
                  <div className="inspection-dropzone-icon">📷</div>
                  <div className="inspection-dropzone-title">
                    Upload Before-Repair Photo Evidence
                  </div>
                  <div className="inspection-dropzone-sub">
                    Click to browse or drag &amp; drop image (PNG, JPG, JPEG, WEBP)
                  </div>
                  <button
                    type="button"
                    className="inspection-dropzone-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTriggerFileInput()
                    }}
                  >
                    📁 Choose Image to Upload
                  </button>
                </div>
              ) : (
                <div className="inspection-photo-card">
                  <div className="inspection-photo-card-top">
                    <div className="inspection-photo-card-info">
                      <span className="inspection-photo-badge">📷 Uploaded Evidence</span>
                      <span className="inspection-photo-meta-text">
                        {uploadedFileInfo ? `${uploadedFileInfo.name} (${uploadedFileInfo.size})` : 'Before-Repair Inspection Photo'} • {uploadedFileInfo?.timestamp || new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="inspection-photo-card-actions">
                      <button
                        type="button"
                        onClick={handleTriggerFileInput}
                        className="inspection-photo-action-btn replace"
                        title="Upload a different image"
                      >
                        🔄 Change Image
                      </button>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="inspection-photo-action-btn remove"
                        title="Remove image"
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  </div>

                  <div className="inspection-photo-preview-wrap">
                    <img
                      src={getPhotoUrl(beforePhoto)}
                      alt="Contractor Inspection Before Preview"
                      className="photo-preview-img"
                      onError={(e) => handlePhotoError(e, beforePhoto)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. Remarks */}
            <div className="inspection-form-group">
              <label className="inspection-form-label">
                Inspection Remarks &amp; Safety Notes
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Additional notes for Department Head or Desk Clerk..."
                className="inspection-form-input"
                style={{ marginTop: 0 }}
              />
            </div>

            {/* Submit & Next Button Group */}
            <div className="inspection-actions-row">
              <button
                type="button"
                onClick={() => handleSave(false)}
                className="btn-contractor-secondary"
              >
                💾 Save Inspection Draft
              </button>

              <button
                type="submit"
                className="btn-contractor-primary"
                style={{ padding: '10px 22px' }}
              >
                Save &amp; Create AMC Estimate &rarr;
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
