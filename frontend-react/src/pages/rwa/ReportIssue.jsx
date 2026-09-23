import { useState, useRef } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import './styles/ReportIssue.css'

const CATEGORY_DATA = {
  Civil: {
    icon: '🏗️',
    description: 'Roads, pavements, boundary walls, drains, civil masonry',
    subcategories: [
      { id: 'pothole', name: 'Pothole / Road Damage', defaultAsset: 'CIV-RD-204 (Collector Road)' },
      { id: 'paver', name: 'Broken Paver Blocks / Footpath', defaultAsset: 'CIV-FP-112 (Walkway)' },
      { id: 'drain', name: 'Stormwater Drain Collapse', defaultAsset: 'CIV-SWD-089 (Drain Grate)' },
      { id: 'wall', name: 'Boundary Wall Crack / Hazard', defaultAsset: 'CIV-BW-019 (Perimeter Wall)' },
      { id: 'manhole', name: 'Damaged Manhole Cover', defaultAsset: 'CIV-MH-055 (Manhole)' },
    ],
    samplePhoto: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
  },
  Electrical: {
    icon: '⚡',
    description: 'Streetlights, feeder pillars, junction boxes, high-mast lights',
    subcategories: [
      { id: 'streetlight', name: 'Streetlight Failure / Blackout', defaultAsset: 'ELE-SL-109 (Pole Light)' },
      { id: 'highmast', name: 'High-Mast Light Outage', defaultAsset: 'ELE-HM-042 (High-Mast)' },
      { id: 'junction', name: 'Open Junction Box / Live Cable', defaultAsset: 'ELE-JB-077 (Junction Box)' },
      { id: 'feeder', name: 'Feeder Pillar Tripping', defaultAsset: 'ELE-FP-021 (Feeder Pillar)' },
      { id: 'spark', name: 'Transformer Spark / Buzzing', defaultAsset: 'ELE-TX-005 (Substation)' },
    ],
    samplePhoto: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80',
  },
  Water: {
    icon: '💧',
    description: 'Water pipelines, valves, overhead tanks, sewer backflow',
    subcategories: [
      { id: 'burst', name: 'Main Pipeline Burst / Major Leakage', defaultAsset: 'WTR-VALVE-108 (Sluice Chamber)' },
      { id: 'valve', name: 'Control Valve Leaking', defaultAsset: 'WTR-VAL-032 (Control Valve)' },
      { id: 'pressure', name: 'Severe Low Water Pressure', defaultAsset: 'WTR-PUMP-014 (Booster Pump)' },
      { id: 'overflow', name: 'Overhead Reservoir Overflow', defaultAsset: 'WTR-OHT-002 (Township Tank)' },
      { id: 'sewage', name: 'Sewage Line Blockage / Backflow', defaultAsset: 'WTR-SEW-061 (Sewer Line)' },
    ],
    samplePhoto: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
  },
}

const SEVERITY_LEVELS = [
  { id: 'Low', label: 'Low', sla: '72h SLA', desc: 'Cosmetic or minor inconvenience', color: '#16a34a' },
  { id: 'Medium', label: 'Medium', sla: '48h SLA', desc: 'Standard non-hazardous repair', color: '#2563eb' },
  { id: 'High', label: 'High', sla: '24h SLA', desc: 'Safety hazard or essential service disrupted', color: '#ea580c' },
  { id: 'Emergency', label: 'Emergency', sla: '6h SLA', desc: 'Immediate danger, flood, or fire risk', color: '#dc2626' },
]

export default function ReportIssue({ onNavigate, onSelectComplaint, onComplaintSubmitted }) {
  const { addComplaint, currentUser } = useTIMS()

  // Form State
  const [category, setCategory] = useState('Civil')
  const [subCategory, setSubCategory] = useState(CATEGORY_DATA.Civil.subcategories[0].name)
  const [sector, setSector] = useState(currentUser.sector || 'Sector 4')
  const [block, setBlock] = useState('Block A')
  const [street, setStreet] = useState('Oak Avenue')
  const [assetName, setAssetName] = useState(CATEGORY_DATA.Civil.subcategories[0].defaultAsset)
  const [landmark, setLandmark] = useState('')
  const [severity, setSeverity] = useState('Medium')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState([])

  // useRef for File Input element
  const fileInputRef = useRef(null)

  // Trigger file upload dialog via useRef
  function handleTriggerFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Handle local file selection
  function handleFileChange(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return

    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (uploadEvent) => {
        setPhotos((prev) => [...prev, uploadEvent.target.result])
      }
      reader.readAsDataURL(file)
    })
  }

  // Quick helper to attach realistic sample photo
  function handleAddSamplePhoto() {
    const sample = CATEGORY_DATA[category]?.samplePhoto
    if (sample && !photos.includes(sample)) {
      setPhotos((prev) => [...prev, sample])
    }
  }

  function handleCategoryChange(newCat) {
    setCategory(newCat)
    const firstSub = CATEGORY_DATA[newCat].subcategories[0]
    setSubCategory(firstSub.name)
    setAssetName(firstSub.defaultAsset)
  }

  function handleSubmit(e) {
    e.preventDefault()

    if (!description.trim()) {
      alert('Please enter an issue description.')
      return
    }

    const created = addComplaint({
      title: `${category}: ${subCategory}`,
      category,
      subCategory,
      location: {
        sector,
        block,
        street,
        assetId: assetName.split(' ')[0] || 'ASSET-01',
        assetName,
        landmark: landmark.trim() || `Near ${block} entrance`,
        gps: '28.5355° N, 77.3910° E',
      },
      severity,
      description,
      photos: photos.length > 0 ? photos : [CATEGORY_DATA[category].samplePhoto],
    })

    // Reset form
    setDescription('')
    setPhotos([])

    if (onComplaintSubmitted) {
      onComplaintSubmitted(created)
    } else {
      onSelectComplaint(created)
      onNavigate('dashboard')
    }
  }

  return (
    <div className="report-root">
      {/* Header */}
      <div className="report-header">
        <button
          onClick={() => onNavigate('dashboard')}
          className="btn-back"
        >
          ← Back to Dashboard
        </button>
        <h1 className="report-title">
          Report Infrastructure Issue
        </h1>
        <p className="report-subtitle">
          Log community breakdown reports with precise location and photo evidence for immediate departmental action.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="report-form"
      >
        {/* Step 1: Category Picker */}
        <div>
          <label className="form-label">
            1. Select Infrastructure Category <span className="form-required">*</span>
          </label>
          <div className="category-grid">
            {Object.keys(CATEGORY_DATA).map((catKey) => {
              const cat = CATEGORY_DATA[catKey]
              const isSelected = category === catKey
              return (
                <div
                  key={catKey}
                  onClick={() => handleCategoryChange(catKey)}
                  className={`category-card ${isSelected ? 'selected' : ''}`}
                >
                  <div className="category-icon">{cat.icon}</div>
                  <div className="category-name">
                    {catKey}
                  </div>
                  <div className="category-desc">
                    {cat.description}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Step 2: Issue Type / Subcategory */}
        <div>
          <label className="form-label">
            2. Issue Subcategory <span className="form-required">*</span>
          </label>
          <select
            value={subCategory}
            onChange={(e) => {
              const chosen = e.target.value
              setSubCategory(chosen)
              const match = CATEGORY_DATA[category].subcategories.find((s) => s.name === chosen)
              if (match) setAssetName(match.defaultAsset)
            }}
            className="form-select"
          >
            {CATEGORY_DATA[category].subcategories.map((sub) => (
              <option key={sub.id} value={sub.name}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        {/* Step 3: Location Hierarchy */}
        <div>
          <label className="form-label">
            3. Location & Asset Hierarchy <span className="form-required">*</span>
          </label>
          <div className="location-grid">
            {/* Sector */}
            <div>
              <span className="location-field-label">Sector</span>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="form-select"
              >
                <option value="Sector 2">Sector 2 (North Enclave)</option>
                <option value="Sector 4">Sector 4 (Central Greens)</option>
                <option value="Sector 7">Sector 7 (South Valley)</option>
                <option value="Sector 9">Sector 9 (East Meadows)</option>
              </select>
            </div>

            {/* Block */}
            <div>
              <span className="location-field-label">Block</span>
              <select
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                className="form-select"
              >
                <option value="Block A">Block A (Villas 1-40)</option>
                <option value="Block B">Block B (Apts 101-160)</option>
                <option value="Block C">Block C (Street 14 Enclave)</option>
                <option value="Block D">Block D (Commercial Hub)</option>
              </select>
            </div>

            {/* Street */}
            <div>
              <span className="location-field-label">Street / Road</span>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="e.g. Oak Avenue"
                className="location-input"
              />
            </div>

            {/* Asset Identifier */}
            <div>
              <span className="location-field-label">Asset Reference</span>
              <input
                type="text"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="e.g. CIV-RD-204"
                className="location-input mono"
              />
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <span className="location-field-label">Nearby Landmark</span>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Opposite Community Hall Gate 2, near transformer pillar"
              className="location-input"
            />
          </div>
        </div>

        {/* Step 4: Severity & SLA */}
        <div>
          <label className="form-label">
            4. Severity Level & Contractual SLA <span className="form-required">*</span>
          </label>
          <div className="severity-grid">
            {SEVERITY_LEVELS.map((lvl) => {
              const isSelected = severity === lvl.id
              return (
                <div
                  key={lvl.id}
                  onClick={() => setSeverity(lvl.id)}
                  className="severity-card"
                  style={{
                    borderColor: isSelected ? lvl.color : undefined,
                    borderWidth: isSelected ? '2px' : undefined,
                  }}
                >
                  <div className="severity-top">
                    <span style={{ fontWeight: 700, fontSize: 14, color: lvl.color }}>
                      {lvl.label}
                    </span>
                    <span className="severity-badge-sla">
                      {lvl.sla}
                    </span>
                  </div>
                  <span className="severity-desc">
                    {lvl.desc}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Step 5: Description */}
        <div>
          <label className="form-label">
            5. Detailed Description & Citizen Observation <span className="form-required">*</span>
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the nature of the issue, symptoms observed, extent of damage, and any immediate hazard..."
            className="form-textarea"
          />
        </div>

        {/* Step 6: Photo Upload using useRef */}
        <div>
          <div className="upload-header">
            <label className="form-label" style={{ marginBottom: 0 }}>
              6. Photographic Evidence (Site Condition)
            </label>
            <button
              type="button"
              onClick={handleAddSamplePhoto}
              className="btn-sample-photo"
            >
              + Use Sample {category} Photo
            </button>
          </div>

          {/* Hidden File Input using useRef */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }}
            multiple
          />

          {/* Drag & Drop / Click Zone */}
          <div
            onClick={handleTriggerFileInput}
            className="dropzone"
          >
            <div className="dropzone-icon">📷</div>
            <div className="dropzone-title">
              Click to browse or drag & drop inspection photos
            </div>
            <div className="dropzone-sub">
              Supports JPG, PNG up to 10MB (Simulated in-memory storage)
            </div>
          </div>

          {/* Uploaded Thumbnails Preview */}
          {photos.length > 0 && (
            <div className="thumbnails-strip">
              {photos.map((src, idx) => (
                <div key={idx} className="thumbnail-wrap">
                  <img
                    src={src}
                    alt={`Upload ${idx + 1}`}
                    className="thumbnail-img"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPhotos((prev) => prev.filter((_, i) => i !== idx))
                    }}
                    className="btn-delete-thumb"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Bar */}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="btn-cancel"
          >
            Cancel
          </button>

          <button
            id="btn-submit-complaint"
            type="submit"
            className="btn-submit"
          >
            Submit Official Complaint
          </button>
        </div>
      </form>
    </div>
  )
}
