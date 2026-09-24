import { useState, useEffect } from 'react'

const SAMPLE_AFTER_PHOTOS = [
  { label: 'Streetlight Fixed & Lit', url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80' },
  { label: 'Pavement Asphalter Complete', url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=800&q=80' },
  { label: 'Water Pipe Welded & Flanged', url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80' },
  { label: 'Cable Panel Terminated & Tested', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80' },
]

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

  // Form states
  const [actualWork, setActualWork] = useState('')
  const [labourDeployed, setLabourDeployed] = useState('')
  const [afterPhoto, setAfterPhoto] = useState(SAMPLE_AFTER_PHOTOS[0].url)
  const [customPhotoUrl, setCustomPhotoUrl] = useState('')
  const [completionRemarks, setCompletionRemarks] = useState('')
  const [submittedMessage, setSubmittedMessage] = useState(null)

  useEffect(() => {
    if (currentJob?.execution?.actualWorkSummary) {
      setActualWork(currentJob.execution.actualWorkSummary)
      setLabourDeployed(currentJob.execution.actualLabourDetails || '')
      setAfterPhoto(currentJob.execution.afterPhoto || currentJob.afterPhotos?.[0] || SAMPLE_AFTER_PHOTOS[0].url)
      setCompletionRemarks(currentJob.completionRemarks || '')
    } else if (currentJob) {
      setActualWork(`Completed full physical intervention on ${currentJob.title}. Replaced degraded elements and verified circuit continuity.`)
      setLabourDeployed('1 Senior Technician (Lead) + 2 Assistant Technicians. 3.5 total on-site hours.')
      setAfterPhoto(SAMPLE_AFTER_PHOTOS[0].url)
      setCompletionRemarks('Repair verified with insulation tester. Area restored, debris cleaned, all warning cones removed.')
    }
  }, [currentJob])

  const isInProgress = currentJob?.status === 'IN_PROGRESS'
  const isCompleted = currentJob?.status === 'COMPLETED' || currentJob?.status === 'PENDING_VERIFICATION' || currentJob?.status === 'CLOSED'
  const isAssigned = currentJob?.status === 'ASSIGNED' || currentJob?.status === 'WORK_ORDER_CREATED'

  function handleStart() {
    if (!currentJob) return
    onStartWork(currentJob.id)
    setSubmittedMessage(`Work Order ${currentJob.workOrderId || currentJob.id} is now IN PROGRESS. Field crew dispatched.`)
  }

  function handleComplete(e) {
    e.preventDefault()
    if (!currentJob) return

    const completionData = {
      actualWorkSummary: actualWork,
      actualLabourDetails: labourDeployed,
      afterPhoto: customPhotoUrl.trim() || afterPhoto,
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
      <div className="contractor-card" style={{ textAlign: 'center', padding: 48 }}>
        <h3>No Work Order Selected</h3>
        <p style={{ color: 'var(--text-soft)' }}>Please select a job from the Work Orders tab.</p>
        <button onClick={() => onNavigate('workorders')} className="btn-contractor-primary" style={{ marginTop: 16 }}>
          View Work Orders &rarr;
        </button>
      </div>
    )
  }

  const beforeImage = currentJob.inspection?.inspectionPhoto || currentJob.beforePhotos?.[0] || 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80'
  const activeAfterImage = customPhotoUrl.trim() || afterPhoto

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <button
            onClick={() => onNavigate('workorders')}
            className="btn-contractor-ghost"
            style={{ padding: 0, marginBottom: 4 }}
          >
            &larr; Back to Work Orders
          </button>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            Work Order Execution & Completion Proof
          </h1>
          <p style={{ color: 'var(--text-soft)', fontSize: 13.5, margin: '2px 0 0' }}>
            Screen 6: Lifecycle management (ASSIGNED &rarr; IN PROGRESS &rarr; COMPLETED) with mandatory after-repair photo proof.
          </p>
        </div>

        {/* Switch Job */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Switch Job:</label>
          <select
            value={currentJob.id}
            onChange={(e) => {
              setActiveJobId(e.target.value)
              const sel = jobs.find((j) => j.id === e.target.value)
              if (sel) onSelectJob(sel)
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line-strong)',
              fontSize: 13,
              fontWeight: 600,
              background: '#ffffff',
            }}
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
        <div
          style={{
            padding: '14px 18px',
            background: '#ecfdf5',
            border: '1.5px solid #10b981',
            borderRadius: 'var(--radius-md)',
            color: '#065f46',
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 20,
          }}
        >
          ✓ {submittedMessage}
        </div>
      )}

      {/* Lifecycle Status Stepper (ASSIGNED -> IN_PROGRESS -> COMPLETED) */}
      <div
        className="contractor-card"
        style={{
          marginBottom: 24,
          padding: '20px 24px',
          background: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            EXECUTION STATUS LIFECYCLE
          </span>
          <span className={`status-pill ${currentJob.status.toLowerCase()}`}>
            Current: {currentJob.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {/* Step 1: Assigned */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              border: isAssigned ? '2px solid #0284c7' : '1px solid var(--line)',
              background: isAssigned ? '#f0f9ff' : '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: isAssigned || isInProgress || isCompleted ? '#0284c7' : '#cbd5e1',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 800,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                1
              </span>
              <strong style={{ fontSize: 13, color: 'var(--text)' }}>ASSIGNED</strong>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 4 }}>
              Dispatched by Desk Clerk; site inspected.
            </div>
          </div>

          {/* Step 2: In Progress */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              border: isInProgress ? '2px solid #f59e0b' : '1px solid var(--line)',
              background: isInProgress ? '#fffbeb' : '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: isInProgress || isCompleted ? '#f59e0b' : '#cbd5e1',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 800,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                2
              </span>
              <strong style={{ fontSize: 13, color: 'var(--text)' }}>IN PROGRESS</strong>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 4 }}>
              Ground repairs actively underway.
            </div>
          </div>

          {/* Step 3: Completed */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              border: isCompleted ? '2px solid #16a34a' : '1px solid var(--line)',
              background: isCompleted ? '#f0fdf4' : '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: isCompleted ? '#16a34a' : '#cbd5e1',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 800,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                3
              </span>
              <strong style={{ fontSize: 13, color: 'var(--text)' }}>COMPLETED</strong>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 4 }}>
              Photo proof submitted; pending RWA check.
            </div>
          </div>
        </div>

        {/* Start Work Action if Assigned */}
        {isAssigned && (
          <div style={{ marginTop: 18, padding: 14, background: '#f0f9ff', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#0369a1', fontWeight: 600 }}>
              Ready to deploy crew on ground? Click to initiate active status.
            </span>
            <button
              onClick={handleStart}
              className="btn-contractor-primary"
              style={{ background: '#f59e0b', borderColor: '#d97706' }}
            >
              🚀 Start Work (Mark IN_PROGRESS)
            </button>
          </div>
        )}
      </div>

      {/* Side-by-Side Photo Comparison Strip (Before vs After) */}
      <div className="contractor-card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px', color: 'var(--text)' }}>
          Mandatory Photo Evidence Verification
        </h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-soft)', margin: '0 0 16px' }}>
          Municipal audit requires clear photographic proof comparing site failure before and after repair.
        </p>

        <div className="photo-compare-grid">
          {/* Before Photo */}
          <div className="photo-preview-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, fontWeight: 700 }}>
              <span style={{ color: '#dc2626' }}>BEFORE REPAIR (INSPECTION PROOF)</span>
              <span style={{ color: 'var(--text-muted)' }}>Initial Site State</span>
            </div>
            <img src={beforeImage} alt="Before repair" className="photo-preview-img" />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              Asset: {currentJob.location?.assetName} • GPS: {currentJob.location?.gps}
            </div>
          </div>

          {/* After Photo */}
          <div className="photo-preview-box" style={{ borderColor: '#16a34a', background: '#f0fdf4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, fontWeight: 700 }}>
              <span style={{ color: '#16a34a' }}>AFTER REPAIR (COMPLETION PROOF)</span>
              <span style={{ color: '#15803d' }}>Ready for Verification</span>
            </div>
            <img src={activeAfterImage} alt="After repair" className="photo-preview-img" />
            <div style={{ fontSize: 11, color: '#166534', marginTop: 6 }}>
              Verified Resolution Photo Proof
            </div>
          </div>
        </div>
      </div>

      {/* Completion Form (Active if IN_PROGRESS or allow editing) */}
      <div className="contractor-card" style={{ border: '1.5px solid var(--line-strong)' }}>
        <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 14px', color: 'var(--text)' }}>
          {isCompleted ? 'Completed Execution Record' : 'Record Actual Work & Submit Completion Proof'}
        </h3>

        <form onSubmit={handleComplete} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 1. Actual Work Performed */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              Actual Work Performed (Technical Description) <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              rows={3}
              required
              disabled={isCompleted}
              value={actualWork}
              onChange={(e) => setActualWork(e.target.value)}
              placeholder="e.g. Replaced 150W industrial driver, installed new MCB protection and re-calibrated twilight timer..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line-strong)',
                fontSize: 13.5,
                fontFamily: 'inherit',
                background: isCompleted ? '#f8fafc' : '#ffffff',
              }}
            />
          </div>

          {/* 2. Actual Labour & Service Quantity */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              Actual Labour & Service Quantity Utilized <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              required
              disabled={isCompleted}
              value={labourDeployed}
              onChange={(e) => setLabourDeployed(e.target.value)}
              placeholder="e.g. 2x Electrician hours, 3x General Labour hours, 10m Cable installed"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line-strong)',
                fontSize: 13.5,
                background: isCompleted ? '#f8fafc' : '#ffffff',
              }}
            />
          </div>

          {/* 3. After Photo Selection */}
          {!isCompleted && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Select After-Repair Resolution Photo Evidence
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                {SAMPLE_AFTER_PHOTOS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAfterPhoto(p.url)
                      setCustomPhotoUrl('')
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 4,
                      fontSize: 11.5,
                      border: afterPhoto === p.url ? '1.5px solid #16a34a' : '1px solid var(--line)',
                      background: afterPhoto === p.url ? '#dcfce7' : '#ffffff',
                      color: afterPhoto === p.url ? '#15803d' : 'var(--text-soft)',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Or paste external after-repair photo URL..."
                value={customPhotoUrl}
                onChange={(e) => setCustomPhotoUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--line)',
                  fontSize: 12,
                }}
              />
            </div>
          )}

          {/* 4. Completion Remarks */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              Completion Remarks & Quality Certifications
            </label>
            <input
              type="text"
              disabled={isCompleted}
              value={completionRemarks}
              onChange={(e) => setCompletionRemarks(e.target.value)}
              placeholder="e.g. Work inspected by Lead Engineer; site restored to pristine condition."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line-strong)',
                fontSize: 13.5,
                background: isCompleted ? '#f8fafc' : '#ffffff',
              }}
            />
          </div>

          {/* Submission action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            {isCompleted ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#166534', fontWeight: 700, fontSize: 13.5 }}>
                <span>✓ Completed & Transferred to RWA for verification</span>
              </div>
            ) : (
              <button
                type="submit"
                className="btn-contractor-primary"
                style={{ background: '#16a34a', padding: '11px 24px', fontSize: 14 }}
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
