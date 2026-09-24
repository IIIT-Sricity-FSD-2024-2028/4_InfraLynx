import { useState, useEffect } from 'react'

const SAMPLE_INSPECTION_PHOTOS = [
  { label: 'Substation Panel Fault', url: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=800&q=80' },
  { label: 'Streetlight Cable Damage', url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80' },
  { label: 'Pavement Asphalt Cavity', url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80' },
  { label: 'Ruptured Pipe Flange', url: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80' },
]

export default function SiteInspection({
  jobs = [],
  selectedJob,
  onSelectJob,
  onSaveInspection,
  onNavigate,
}) {
  const [activeJobId, setActiveJobId] = useState(selectedJob ? selectedJob.id : (jobs[0]?.id || ''))

  const currentJob = jobs.find((j) => j.id === activeJobId) || selectedJob || jobs[0]

  // Form State
  const [problemObserved, setProblemObserved] = useState('')
  const [equipmentCondition, setEquipmentCondition] = useState('Moderate Damage')
  const [requiredWork, setRequiredWork] = useState('')
  const [beforePhoto, setBeforePhoto] = useState(SAMPLE_INSPECTION_PHOTOS[0].url)
  const [customPhotoUrl, setCustomPhotoUrl] = useState('')
  const [remarks, setRemarks] = useState('')
  const [isSaved, setIsSaved] = useState(false)

  // Populate existing inspection data if present
  useEffect(() => {
    if (currentJob?.inspection) {
      setProblemObserved(currentJob.inspection.observedProblem || '')
      setEquipmentCondition(currentJob.inspection.equipmentCondition || 'Moderate Damage')
      setRequiredWork(currentJob.inspection.requiredWork || '')
      setBeforePhoto(currentJob.inspection.inspectionPhoto || SAMPLE_INSPECTION_PHOTOS[0].url)
      setRemarks(currentJob.inspection.remarks || '')
    } else if (currentJob) {
      // Sensible defaults based on category
      setProblemObserved(`Technical inspection conducted on ${currentJob.title}. Initial symptoms verified on ground.`)
      setEquipmentCondition('Moderate Damage')
      setRequiredWork('Replace defective components under AMC rate terms and verify operational load.')
      setBeforePhoto(currentJob.beforePhotos?.[0] || SAMPLE_INSPECTION_PHOTOS[0].url)
      setRemarks(`Inspected by Field Contractor team. Site secured with safety perimeter.`)
    }
    setIsSaved(false)
  }, [currentJob])

  function handleSave(proceedToEstimate = false) {
    if (!currentJob) return

    const inspectionData = {
      observedProblem: problemObserved,
      equipmentCondition,
      requiredWork,
      inspectionPhoto: customPhotoUrl.trim() || beforePhoto,
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

  if (!currentJob) {
    return (
      <div className="contractor-card" style={{ textAlign: 'center', padding: 48 }}>
        <h3>No Work Order Selected for Inspection</h3>
        <p style={{ color: 'var(--text-soft)' }}>Please select a job from the Work Orders tab.</p>
        <button onClick={() => onNavigate('workorders')} className="btn-contractor-primary" style={{ marginTop: 16 }}>
          View Work Orders &rarr;
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Top Banner / Breadcrumb */}
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
            Site Inspection & Technical Assessment
          </h1>
          <p style={{ color: 'var(--text-soft)', fontSize: 13.5, margin: '2px 0 0' }}>
            Screen 3: Log ground condition, observed failure mode, before-repair photo, and scope for AMC estimate.
          </p>
        </div>

        {/* Job Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
            Switch Work Order:
          </label>
          <select
            value={currentJob.id}
            onChange={(e) => {
              setActiveJobId(e.target.value)
              const selected = jobs.find((j) => j.id === e.target.value)
              if (selected) onSelectJob(selected)
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line-strong)',
              fontSize: 13,
              fontWeight: 600,
              background: '#ffffff',
              color: 'var(--text)',
            }}
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.workOrderId || j.id} — {j.title.slice(0, 32)}... ({j.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {isSaved && (
        <div
          style={{
            padding: '12px 18px',
            background: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: 'var(--radius-sm)',
            color: '#065f46',
            fontSize: 13.5,
            fontWeight: 600,
            marginBottom: 20,
          }}
        >
          ✓ Inspection record saved successfully. You can now build the contractual AMC estimate.
        </div>
      )}

      {/* Two Column Layout: Left = Citizen/RWA Details, Right = Contractor Inspection Form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 24 }} className="inspection-grid">
        {/* Left Column: Complaint & Site Context */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Work Order Overview Card */}
          <div className="contractor-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: '#e0f2fe',
                    color: '#0369a1',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {currentJob.workOrderId || 'WO-PENDING'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                  Ref: {currentJob.id}
                </span>
              </div>
              <span className={`status-pill ${currentJob.status.toLowerCase()}`}>
                {currentJob.status.replace(/_/g, ' ')}
              </span>
            </div>

            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>
              {currentJob.title}
            </h3>

            <div style={{ fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.6, marginBottom: 16 }}>
              <strong>Citizen / RWA Complaint:</strong> {currentJob.description}
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                fontSize: 12.5,
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11 }}>SECTOR & BLOCK</span>
                <strong>{currentJob.location?.sector}, {currentJob.location?.block}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11 }}>STREET / LANDMARK</span>
                <strong>{currentJob.location?.street || currentJob.location?.landmark || 'Main Road'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11 }}>ASSET ID</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{currentJob.location?.assetId || 'ASSET-GEN'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11 }}>GPS POSITION</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{currentJob.location?.gps || '28.5355° N, 77.3910° E'}</strong>
              </div>
            </div>
          </div>

          {/* RWA Attached Photos */}
          <div className="contractor-card">
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px', color: 'var(--text)' }}>
              Initial Evidence (Uploaded by Citizen / RWA)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              {(currentJob.beforePhotos?.length ? currentJob.beforePhotos : [SAMPLE_INSPECTION_PHOTOS[0].url]).map((photo, idx) => (
                <div key={idx} style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid var(--line)' }}>
                  <img
                    src={photo}
                    alt={`RWA Photo ${idx + 1}`}
                    style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{ padding: '6px 8px', fontSize: 11, color: 'var(--text-soft)', background: '#f8fafc' }}>
                    Citizen Proof #{idx + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Technical Site Inspection Form */}
        <div className="contractor-card" style={{ border: '1.5px solid #0284c7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <span style={{ fontSize: 20 }}>🛠️</span>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                Field Technical Inspection Form
              </h3>
              <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>
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
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Problem Observed on Ground <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                rows={3}
                required
                value={problemObserved}
                onChange={(e) => setProblemObserved(e.target.value)}
                placeholder="Describe actual mechanical / electrical failure, damage level, and root cause..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--line-strong)',
                  fontSize: 13.5,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* 2. Structural / Equipment Condition */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Structural / Equipment Condition <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                value={equipmentCondition}
                onChange={(e) => setEquipmentCondition(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--line-strong)',
                  fontSize: 13.5,
                  background: '#ffffff',
                }}
              >
                <option value="Minor Wear">Minor Wear (Routine consumable replacement)</option>
                <option value="Moderate Damage">Moderate Damage (Components need overhaul / rewiring)</option>
                <option value="Severe Breakdown">Severe Breakdown (Full replacement required)</option>
                <option value="Critical Safety Hazard">Critical Safety Hazard (Immediate isolation required)</option>
              </select>
            </div>

            {/* 3. Required Work Scope */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Required Work & Material Scope <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                rows={3}
                required
                value={requiredWork}
                onChange={(e) => setRequiredWork(e.target.value)}
                placeholder="Specify labour requirements, spare parts, and tools needed under AMC terms..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--line-strong)',
                  fontSize: 13.5,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* 4. Before Photo Upload & Preview */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Contractor Before-Repair Photo Evidence <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                {SAMPLE_INSPECTION_PHOTOS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setBeforePhoto(p.url)
                      setCustomPhotoUrl('')
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 4,
                      fontSize: 11.5,
                      border: beforePhoto === p.url ? '1.5px solid #0284c7' : '1px solid var(--line)',
                      background: beforePhoto === p.url ? '#e0f2fe' : '#ffffff',
                      color: beforePhoto === p.url ? '#0369a1' : 'var(--text-soft)',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Photo preview box */}
              <div className="photo-preview-box" style={{ marginBottom: 10 }}>
                <img
                  src={customPhotoUrl.trim() || beforePhoto}
                  alt="Contractor Inspection Before Preview"
                  className="photo-preview-img"
                  onError={(e) => {
                    e.target.src = SAMPLE_INSPECTION_PHOTOS[0].url
                  }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  Geo-tagged Before Photo: {currentJob.location?.gps} • Timestamp: {new Date().toLocaleTimeString()}
                </div>
              </div>

              {/* Custom Image URL input option */}
              <input
                type="text"
                placeholder="Or paste external photo image URL..."
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

            {/* 5. Remarks */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Inspection Remarks & Safety Notes
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Additional notes for Department Head or Desk Clerk..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--line-strong)',
                  fontSize: 13.5,
                }}
              />
            </div>

            {/* Submit & Next Button Group */}
            <div style={{ display: 'flex', gap: 12, marginTop: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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
                Save & Create AMC Estimate &rarr;
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .inspection-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
