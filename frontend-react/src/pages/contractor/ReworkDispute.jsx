import { useState, useEffect } from 'react'

const SAMPLE_REWORK_PHOTOS = [
  { label: 'Culvert Flushed & Flowing', url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=800&q=80' },
  { label: 'Recalibrated Streetlight Assembly', url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80' },
  { label: 'Pipe Joint Re-sealed & Pressure Tested', url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80' },
]

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

  // Form states
  const [correctiveAction, setCorrectiveAction] = useState('')
  const [labourDeployed, setLabourDeployed] = useState('')
  const [newAfterPhoto, setNewAfterPhoto] = useState(SAMPLE_REWORK_PHOTOS[0].url)
  const [customPhotoUrl, setCustomPhotoUrl] = useState('')
  const [reworkRemarks, setReworkRemarks] = useState('')
  const [submittedMessage, setSubmittedMessage] = useState(null)

  useEffect(() => {
    if (currentJob?.rework) {
      setCorrectiveAction(currentJob.rework.correctiveAction || '')
      setLabourDeployed(currentJob.rework.labourDeployed || '')
      setNewAfterPhoto(currentJob.rework.newPhoto || SAMPLE_REWORK_PHOTOS[0].url)
      setReworkRemarks(currentJob.rework.remarks || '')
    } else if (currentJob) {
      setCorrectiveAction(`Conducted full on-site corrective intervention to rectify dispute points raised by RWA. Deployed motorized mechanical equipment.`)
      setLabourDeployed('2 Senior Technicians + high-pressure equipment crew. Work completed at zero additional cost under AMC clause 14.2.')
      setNewAfterPhoto(SAMPLE_REWORK_PHOTOS[0].url)
      setReworkRemarks('Disputed defects addressed. Water flow tested and verified clear. Site thoroughly washed.')
    }
  }, [currentJob])

  function handleReworkSubmit(e) {
    e.preventDefault()
    if (!currentJob) return

    const reworkData = {
      correctiveAction,
      labourDeployed,
      newPhoto: customPhotoUrl.trim() || newAfterPhoto,
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
      <div className="contractor-card" style={{ textAlign: 'center', padding: 48 }}>
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

  const originalBefore = currentJob.beforePhotos?.[0] || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80'
  const rejectedAfter = currentJob.afterPhotos?.[0] || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=800&q=80'
  const activeNewPhoto = customPhotoUrl.trim() || newAfterPhoto

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="btn-contractor-ghost"
            style={{ padding: 0, marginBottom: 4 }}
          >
            &larr; Back to Dashboard
          </button>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800, color: '#991b1b', margin: 0 }}>
            Rework & Dispute Resolution Desk
          </h1>
          <p style={{ color: 'var(--text-soft)', fontSize: 13.5, margin: '2px 0 0' }}>
            Screen 7: Analyze RWA rejection, review prior photographic evidence, and submit zero-cost corrective rework.
          </p>
        </div>

        {/* Job selector */}
        {disputedJobs.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Dispute:</label>
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
                border: '1.5px solid #dc2626',
                fontSize: 13,
                fontWeight: 600,
                background: '#fff',
              }}
            >
              {disputedJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.workOrderId || j.id} — {j.title.slice(0, 30)}...
                </option>
              ))}
            </select>
          </div>
        )}
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

      {/* Prominent Dispute Reason & Mandate Alert */}
      <div
        style={{
          background: '#fef2f2',
          border: '1.5px solid #ef4444',
          borderRadius: 'var(--radius-md)',
          padding: '18px 22px',
          marginBottom: 24,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🚨</span>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                OFFICIAL RWA DISPUTE FILED
              </span>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#991b1b', margin: '2px 0 0' }}>
                Dispute Reason: &ldquo;{disputeInfo.reason}&rdquo;
              </h3>
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              background: '#fee2e2',
              color: '#991b1b',
              padding: '3px 8px',
              borderRadius: 4,
              fontWeight: 700,
            }}
          >
            AMC CLAUSE 14.2 APPLIES (ZERO-COST REWORK)
          </span>
        </div>

        <p style={{ fontSize: 13.5, color: '#7f1d1d', lineHeight: 1.55, margin: '8px 0 0' }}>
          <strong>Resident Inspection Remarks:</strong> &ldquo;{disputeInfo.remarks}&rdquo;
        </p>

        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: '#991b1b' }}>
          <span>Disputed By: <strong>{disputeInfo.disputedBy}</strong></span>
          <span>•</span>
          <span>Timestamp: <strong>{new Date(disputeInfo.disputedAt).toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Previous Evidence: Original Before vs Rejected Previous After Photo */}
      <div className="contractor-card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              Audit of Previous Evidence (Basis of Dispute)
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-soft)', margin: '2px 0 0' }}>
              Inspect the initial failure and the contractor photo rejected by RWA.
            </p>
          </div>
        </div>

        <div className="photo-compare-grid">
          {/* Original Before */}
          <div className="photo-preview-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, fontWeight: 700 }}>
              <span style={{ color: '#475569' }}>ORIGINAL REPORTED DEFECT</span>
              <span style={{ color: 'var(--text-muted)' }}>Initial Report</span>
            </div>
            <img src={originalBefore} alt="Original defect" className="photo-preview-img" />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              Asset: {currentJob.location?.assetName}
            </div>
          </div>

          {/* Rejected Previous After */}
          <div className="photo-preview-box" style={{ borderColor: '#ef4444', background: '#fef2f2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, fontWeight: 700 }}>
              <span style={{ color: '#dc2626' }}>PREVIOUS REPAIR (REJECTED BY RWA)</span>
              <span style={{ color: '#dc2626', fontWeight: 800 }}>FAILED INSPECTION ✕</span>
            </div>
            <img src={rejectedAfter} alt="Rejected after" className="photo-preview-img" />
            <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 6 }}>
              Defect: {disputeInfo.reason}
            </div>
          </div>
        </div>
      </div>

      {/* Corrective Action Submission Form */}
      <div className="contractor-card" style={{ border: '2px solid #0284c7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 22 }}>🔄</span>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              Submit New Work Details & Re-verification Evidence
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-soft)', margin: '2px 0 0' }}>
              Document the corrective steps executed to address the RWA grievance.
            </p>
          </div>
        </div>

        <form onSubmit={handleReworkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 1. Corrective Work Executed */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              Corrective Work Details Executed <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              rows={3}
              required
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="Detail the specific corrective actions taken to resolve the RWA complaint..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line-strong)',
                fontSize: 13.5,
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* 2. Additional Labour & Equipment Deployed */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              Additional Crew & Equipment Deployed (AMC Zero-Cost Warranty) <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={labourDeployed}
              onChange={(e) => setLabourDeployed(e.target.value)}
              placeholder="e.g. 2 Senior Technicians + specialized motorized rodding equipment"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line-strong)',
                fontSize: 13.5,
              }}
            />
          </div>

          {/* 3. New After-Repair Photo */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              New Corrective Photographic Evidence <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              {SAMPLE_REWORK_PHOTOS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setNewAfterPhoto(p.url)
                    setCustomPhotoUrl('')
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 4,
                    fontSize: 11.5,
                    border: newAfterPhoto === p.url ? '1.5px solid #0284c7' : '1px solid var(--line)',
                    background: newAfterPhoto === p.url ? '#e0f2fe' : '#ffffff',
                    color: newAfterPhoto === p.url ? '#0369a1' : 'var(--text-soft)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Preview of new photo */}
            <div className="photo-preview-box" style={{ borderColor: '#0284c7', background: '#f0f9ff', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, fontWeight: 700 }}>
                <span style={{ color: '#0369a1' }}>NEW CORRECTIVE AFTER-PHOTO (RE-VERIFICATION)</span>
                <span style={{ color: '#16a34a' }}>Clean Ground State</span>
              </div>
              <img src={activeNewPhoto} alt="New corrective photo" className="photo-preview-img" />
              <div style={{ fontSize: 11, color: '#0369a1', marginTop: 6 }}>
                Fresh Evidence Captured: {new Date().toLocaleTimeString()}
              </div>
            </div>

            <input
              type="text"
              placeholder="Or paste external new photo URL..."
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

          {/* 4. Remarks */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              Contractor Re-Submission Remarks for RWA Sign-off
            </label>
            <input
              type="text"
              value={reworkRemarks}
              onChange={(e) => setReworkRemarks(e.target.value)}
              placeholder="e.g. Defect completely rectified. Requesting RWA Secretary for digital sign-off."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line-strong)',
                fontSize: 13.5,
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="btn-contractor-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-contractor-primary"
              style={{ background: '#0284c7', padding: '11px 24px', fontSize: 14 }}
            >
              Submit Rework for Re-Verification &rarr;
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
