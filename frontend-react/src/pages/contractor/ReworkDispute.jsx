import { useState, useEffect, useRef } from 'react'
import './styles/ReworkDispute.css'

export default function ReworkDispute({
  jobs = [],
  selectedJob,
  onSelectJob,
  onSubmitRework,
  onNavigate,
}) {
  const disputedJobs = jobs.filter((j) => j.status === 'DISPUTED')

  const [activeJobId, setActiveJobId] = useState(
    selectedJob?.status === 'DISPUTED' ? selectedJob.id : (disputedJobs[0]?.id || jobs[0]?.id || '')
  )

  const currentJob = jobs.find((j) => j.id === activeJobId) || selectedJob || disputedJobs[0] || jobs[0]

  // Form states - Starts completely empty (no prefilled dummy values)
  const [correctiveAction, setCorrectiveAction] = useState('')
  const [labourDeployed, setLabourDeployed] = useState('')
  const [newAfterPhoto, setNewAfterPhoto] = useState('')
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [reworkRemarks, setReworkRemarks] = useState('')
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
      setNewAfterPhoto(e.target.result)
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
    setNewAfterPhoto('')
    setUploadedFileInfo(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    if (currentJob?.rework) {
      setCorrectiveAction(currentJob.rework.correctiveAction || '')
      setLabourDeployed(currentJob.rework.labourDeployed || '')
      setNewAfterPhoto(currentJob.rework.newPhoto || '')
      setReworkRemarks(currentJob.rework.remarks || '')
      if (currentJob.rework.newPhoto) {
        setUploadedFileInfo({
          name: 'Corrective Photo Evidence',
          size: 'Saved',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        })
      } else {
        setUploadedFileInfo(null)
      }
    } else {
      // Clean slate - No prefilled values
      setCorrectiveAction('')
      setLabourDeployed('')
      setNewAfterPhoto('')
      setUploadedFileInfo(null)
      setReworkRemarks('')
    }
  }, [currentJob])

  function handleReworkSubmit(e) {
    e.preventDefault()
    if (!currentJob) return

    if (!newAfterPhoto) {
      alert('Please upload new corrective photographic evidence before submitting rework.')
      return
    }

    const reworkData = {
      correctiveAction,
      labourDeployed,
      newPhoto: newAfterPhoto,
      remarks: reworkRemarks,
      reworkSubmittedAt: new Date().toISOString(),
    }

    onSubmitRework(currentJob.id, reworkData)
    setSubmittedMessage(
      `Corrective rework submitted for ${currentJob.workOrderId || currentJob.id}. Status changed to PENDING_VERIFICATION for RWA sign-off.`
    )
  }

  if (!currentJob) {
    return (
      <div className="contractor-card rework-empty-card">
        <h3>No Disputed Jobs Found</h3>
        <p style={{ color: 'var(--text-soft)' }}>There are currently no active RWA disputes requiring rework.</p>
        <button onClick={() => onNavigate('dashboard')} className="btn-contractor-primary" style={{ marginTop: 16 }}>
          Return to Dashboard &rarr;
        </button>
      </div>
    )
  }

  const disputeInfo = currentJob.dispute || {
    reason: 'Repair incomplete or suboptimal ground results observed',
    remarks: 'RWA rejected the initial resolution. Specific defect details provided for immediate correction under AMC warranty.',
    disputedBy: 'Ravi Sharma (RWA Secretary)',
    disputedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    photos: currentJob.beforePhotos || [],
  }

  const originalBefore = currentJob.beforePhotos?.[0] || ''
  const rejectedAfter = currentJob.afterPhotos?.[0] || ''

  return (
    <div className="rework-root">
      {/* Header */}
      <div className="rework-header">
        <div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="btn-contractor-ghost rework-back-btn"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="rework-title">
            Rework Mandate &amp; Dispute Remediation
          </h1>
          <p className="rework-sub">
            Contractual rework execution under AMC warranty (Clause 14.2) following RWA inspection rejection.
          </p>
        </div>

        {/* Switch Job */}
        <div className="rework-job-switcher">
          <label className="rework-switch-label">Select Disputed Work Order:</label>
          <select
            value={currentJob.id}
            onChange={(e) => {
              setActiveJobId(e.target.value)
              const sel = jobs.find((j) => j.id === e.target.value)
              if (sel) onSelectJob(sel)
            }}
            className="rework-select"
          >
            {disputedJobs.length > 0 ? (
              disputedJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.workOrderId || j.id} — {j.title.slice(0, 30)}... (DISPUTED)
                </option>
              ))
            ) : (
              <option value={currentJob.id}>
                {currentJob.workOrderId || currentJob.id} — {currentJob.title.slice(0, 30)}...
              </option>
            )}
          </select>
        </div>
      </div>

      {submittedMessage && (
        <div className="rework-alert-success">
          ✓ {submittedMessage}
        </div>
      )}

      {/* Prominent Dispute Mandate Box */}
      <div className="rework-mandate-card">
        <div className="rework-mandate-top">
          <div className="rework-mandate-left">
            <span className="rework-mandate-icon">⚠️</span>
            <div>
              <span className="rework-mandate-tag">RWA INSPECTION DISPUTE MANDATE</span>
              <h2 className="rework-mandate-title">
                {currentJob.title}
              </h2>
            </div>
          </div>
          <span className="rework-clause-badge">AMC Clause 14.2 Warranty Rework</span>
        </div>

        <p className="rework-remarks-text">
          <strong>Resident Inspection Remarks:</strong> &ldquo;{disputeInfo.remarks}&rdquo;
        </p>

        <div className="rework-meta-row">
          <span>Disputed By: <strong>{disputeInfo.disputedBy}</strong></span>
          <span>•</span>
          <span>Timestamp: <strong>{new Date(disputeInfo.disputedAt).toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Previous Evidence: Original Before vs Rejected Previous After Photo */}
      <div className="contractor-card rework-card">
        <div className="rework-card-head">
          <div>
            <h3 className="rework-card-title">
              Audit of Previous Evidence (Basis of Dispute)
            </h3>
            <p className="rework-card-sub">
              Inspect the initial failure and the contractor photo rejected by RWA.
            </p>
          </div>
        </div>

        <div className="rework-photo-grid">
          {/* Original Before */}
          <div className="rework-photo-box original">
            <div className="rework-photo-box-head">
              <span className="rework-photo-label-muted">ORIGINAL REPORTED DEFECT</span>
              <span className="rework-photo-state-muted">Initial Report</span>
            </div>
            {originalBefore ? (
              <img src={originalBefore} alt="Original defect" className="rework-photo-img" />
            ) : (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: 'var(--text-muted)', fontSize: 13 }}>
                No original photo available
              </div>
            )}
            <div className="rework-photo-meta">
              Asset: {currentJob.location?.assetName || 'Township Asset'}
            </div>
          </div>

          {/* Rejected Previous After */}
          <div className="rework-photo-box rejected">
            <div className="rework-photo-box-head">
              <span className="rework-photo-label-danger">PREVIOUS REPAIR (REJECTED BY RWA)</span>
              <span className="rework-photo-state-danger">FAILED INSPECTION ✕</span>
            </div>
            {rejectedAfter ? (
              <img src={rejectedAfter} alt="Rejected after" className="rework-photo-img" />
            ) : (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', color: '#b91c1c', fontSize: 13 }}>
                No rejected photo attached
              </div>
            )}
            <div className="rework-photo-meta rejected">
              Defect: {disputeInfo.reason}
            </div>
          </div>
        </div>
      </div>

      {/* Corrective Action Submission Form */}
      <div className="contractor-card rework-form-card">
        <div className="rework-form-header">
          <span className="rework-form-icon">🔄</span>
          <div>
            <h3 className="rework-form-title">
              Submit New Work Details &amp; Re-verification Evidence
            </h3>
            <p className="rework-form-sub">
              Document the corrective steps executed to address the RWA grievance.
            </p>
          </div>
        </div>

        <form onSubmit={handleReworkSubmit} className="rework-form">
          {/* 1. Corrective Work Executed */}
          <div className="rework-form-group">
            <label className="rework-label">
              Corrective Work Details Executed <span className="rework-req">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="Detail the specific corrective actions taken to resolve the RWA complaint..."
              className="rework-textarea"
            />
          </div>

          {/* 2. Additional Labour & Equipment Deployed */}
          <div className="rework-form-group">
            <label className="rework-label">
              Additional Crew &amp; Equipment Deployed (AMC Zero-Cost Warranty) <span className="rework-req">*</span>
            </label>
            <input
              type="text"
              required
              value={labourDeployed}
              onChange={(e) => setLabourDeployed(e.target.value)}
              placeholder="e.g. 2 Senior Technicians + specialized motorized rodding equipment"
              className="rework-input"
            />
          </div>

          {/* 3. New After-Repair Photo (File Upload Only - No Presets, No Prefills) */}
          <div className="rework-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="rework-label" style={{ marginBottom: 0 }}>
                New Corrective Photographic Evidence <span className="rework-req">*</span>
              </label>
              {newAfterPhoto && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: 12 }}>
                  ✓ Evidence Attached
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

            {!newAfterPhoto ? (
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
                  Upload New Corrective Photographic Evidence
                </div>
                <div className="execution-dropzone-sub">
                  Click to browse or drag &amp; drop image (PNG, JPG, JPEG, WEBP)
                </div>
                <button
                  type="button"
                  className="execution-dropzone-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleTriggerFileInput()
                  }}
                >
                  📁 Choose Image to Upload
                </button>
              </div>
            ) : (
              <div className="execution-photo-card">
                <div className="execution-photo-card-top">
                  <div className="execution-photo-card-info">
                    <span className="execution-photo-card-badge">📷 Corrective Photo Proof</span>
                    <span className="execution-photo-card-meta">
                      {uploadedFileInfo ? `${uploadedFileInfo.name} (${uploadedFileInfo.size})` : 'Corrective Evidence'} • {uploadedFileInfo?.timestamp || new Date().toLocaleTimeString()}
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
                  <img src={newAfterPhoto} alt="New corrective photo preview" />
                </div>
              </div>
            )}
          </div>

          {/* 4. Remarks */}
          <div className="rework-form-group">
            <label className="rework-label">
              Contractor Re-Submission Remarks for RWA Sign-off
            </label>
            <input
              type="text"
              value={reworkRemarks}
              onChange={(e) => setReworkRemarks(e.target.value)}
              placeholder="e.g. Defect completely rectified. Requesting RWA Secretary for digital sign-off."
              className="rework-input"
            />
          </div>

          {/* Actions */}
          <div className="rework-form-actions">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="btn-contractor-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-contractor-primary rework-submit-btn"
            >
              Submit Rework for Re-Verification &rarr;
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
