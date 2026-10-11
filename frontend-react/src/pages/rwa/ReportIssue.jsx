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
  },
}

export default function ReportIssue({
  onNavigate,
  onSelectComplaint,
  onComplaintSubmitted,
  onAddComplaint,
  currentUser: propUser,
}) {
  const { addComplaint: contextAddComplaint, currentUser: contextUser } = useTIMS()
  const currentUser = propUser || contextUser || {
    name: 'Dr. Arvind Swaminathan',
    role: 'RWA',
    title: 'RWA Secretary',
    sector: 'Sector 54',
  }
  const addFn = onAddComplaint || contextAddComplaint
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [category, setCategory] = useState('Civil')
  const [subCategory, setSubCategory] = useState(CATEGORY_DATA.Civil.subcategories[0].name)
  const [sector, setSector] = useState(currentUser?.sector || 'Sector 54')
  const [block, setBlock] = useState('Block B')
  const [street, setStreet] = useState('Gulmohar Marg')
  const [assetName, setAssetName] = useState(CATEGORY_DATA.Civil.subcategories[0].defaultAsset)
  const [landmark, setLandmark] = useState('')
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

  function handleCategoryChange(newCat) {
    setCategory(newCat)
    const firstSub = CATEGORY_DATA[newCat].subcategories[0]
    setSubCategory(firstSub.name)
    setAssetName(firstSub.defaultAsset)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!description.trim()) {
      alert('Please enter an issue description.')
      return
    }

    try {
      setSubmitting(true)
      const created = await addFn({
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
        description,
        photos,
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
    } catch (err) {
      alert(`Failed to submit complaint: ${err.message}`)
    } finally {
      setSubmitting(false)
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
          Log community breakdown reports for Sector 54 on behalf of {currentUser?.name || 'Dr. Arvind Swaminathan'} ({currentUser?.title || 'RWA Secretary'}).
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
                <option value="Sector 54">Sector 54 (Golf Course Road Hub)</option>
                <option value="Sector 53">Sector 53 (DLF Phase 5)</option>
                <option value="Sector 42">Sector 42 (CyberCity Connect)</option>
                <option value="Sector 56">Sector 56 (Aralias Enclave)</option>
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
                <option value="Block A">Block A (The Aralias & Villas)</option>
                <option value="Block B">Block B (The Magnolias Towers)</option>
                <option value="Block C">Block C (Cyber Terraces)</option>
                <option value="Block D">Block D (Commercial Galleria)</option>
              </select>
            </div>

            {/* Street */}
            <div>
              <span className="location-field-label">Street / Road</span>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="e.g. Gulmohar Marg, Palm Avenue, Amaltas Drive"
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

        {/* Step 4: Description */}
        <div>
          <label className="form-label">
            4. Detailed Description & Citizen Observation <span className="form-required">*</span>
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the nature of the issue, symptoms observed, extent of damage, and any immediate hazard..."
            className="form-textarea"
          />
        </div>

        {/* Step 5: Photo Upload using useRef */}
        <div>
          <div className="upload-header">
            <label className="form-label" style={{ marginBottom: 0 }}>
              5. Photographic Evidence (Site Condition)
            </label>
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
              Supports JPG, PNG, WEBP up to 10MB
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
            disabled={submitting}
          >
            {submitting ? 'Submitting Report...' : 'Submit Official Complaint'}
          </button>
        </div>
      </form>
    </div>
  )
}
