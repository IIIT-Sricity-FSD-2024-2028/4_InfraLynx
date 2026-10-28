import { useState, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
  Horticulture: {
    icon: '🌳',
    description: 'Parks, green belts, fallen trees, green waste, urban sanitation',
    subcategories: [
      { id: 'tree_hazard', name: 'Overhanging / Fallen Tree Hazard', defaultAsset: 'HORT-TR-018 (Green Belt Tree)' },
      { id: 'green_waste', name: 'Uncollected Green Waste / Trimmings', defaultAsset: 'HORT-GW-012 (Waste Dump Point)' },
      { id: 'park_maint', name: 'Park Lawn & Landscaping Damage', defaultAsset: 'HORT-PK-004 (Central Park Lawn)' },
      { id: 'bin_overflow', name: 'Garbage Bin Overflow / Littering', defaultAsset: 'SAN-BIN-031 (Sector Compactor)' },
      { id: 'overgrowth', name: 'Wild Overgrowth Blocking Pathway', defaultAsset: 'HORT-WL-009 (Perimeter Walkway)' },
    ],
  },
}

const reportSchema = z.object({
  category: z.enum(['Civil', 'Electrical', 'Water', 'Horticulture'], {
    required_error: 'Category is required',
  }),
  subCategory: z.string().min(2, 'Subcategory selection is required'),
  sector: z.string().min(2, 'Sector selection is required'),
  block: z.string().min(2, 'Block selection is required'),
  street: z.string().min(3, 'Street/road name must be at least 3 characters'),
  assetName: z.string().min(3, 'Asset reference is required'),
  landmark: z.string().optional(),
  description: z.string().min(10, 'Please provide at least 10 characters describing the issue'),
})

export default function ReportIssue({
  onNavigate,
  onComplaintSubmitted,
  onAddComplaint,
  currentUser,
}) {
  const [photos, setPhotos] = useState([])
  const fileInputRef = useRef(null)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      category: 'Civil',
      subCategory: CATEGORY_DATA.Civil.subcategories[0].name,
      sector: currentUser?.sector || 'Sector 54',
      block: 'Block B',
      street: 'Gulmohar Marg',
      assetName: CATEGORY_DATA.Civil.subcategories[0].defaultAsset,
      landmark: '',
      description: '',
    },
  })

  const currentCategory = watch('category')
  const currentSubCategory = watch('subCategory')

  function handleTriggerFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

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

  function handleCategorySelect(newCat) {
    setValue('category', newCat, { shouldValidate: true, shouldDirty: true })
    const firstSub = CATEGORY_DATA[newCat].subcategories[0]
    setValue('subCategory', firstSub.name, { shouldValidate: true, shouldDirty: true })
    setValue('assetName', firstSub.defaultAsset, { shouldValidate: true, shouldDirty: true })
  }

  const onSubmit = async (data) => {
    try {
      const created = await onAddComplaint({
        title: `${data.category}: ${data.subCategory}`,
        category: data.category,
        subCategory: data.subCategory,
        location: {
          sector: data.sector,
          block: data.block,
          street: data.street,
          assetId: data.assetName.split(' ')[0] || 'ASSET-01',
          assetName: data.assetName,
          landmark: data.landmark?.trim() || `Near ${data.block} entrance`,
        },
        description: data.description,
        photos,
      })

      if (onComplaintSubmitted) {
        onComplaintSubmitted(created)
      } else {
        onNavigate('dashboard')
      }
    } catch (err) {
      alert(`Failed to submit complaint: ${err.message}`)
    }
  }

  return (
    <div className="report-root">
      {/* Header */}
      <div className="report-header">
        <button onClick={() => onNavigate('dashboard')} className="btn-back">
          ← Back to Dashboard
        </button>
        <h1 className="report-title">Report Infrastructure Issue</h1>
        <p className="report-subtitle">
          Log community breakdown reports for Sector 54 on behalf of {currentUser?.name || 'Dr. Arvind Swaminathan'} ({currentUser?.title || 'RWA Secretary'}).
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="report-form">
        {/* Step 1: Category Picker */}
        <div>
          <label className="form-label">
            1. Select Infrastructure Category <span className="form-required">*</span>
          </label>
          <div className="category-grid">
            {Object.keys(CATEGORY_DATA).map((catKey) => {
              const cat = CATEGORY_DATA[catKey]
              const isSelected = currentCategory === catKey
              return (
                <div
                  key={catKey}
                  onClick={() => handleCategorySelect(catKey)}
                  className={`category-card ${isSelected ? 'selected' : ''}`}
                >
                  <div className="category-icon">{cat.icon}</div>
                  <div className="category-name">{catKey}</div>
                  <div className="category-desc">{cat.description}</div>
                </div>
              )
            })}
          </div>
          {errors.category && (
            <span style={{ color: '#ef4444', fontSize: 13, marginTop: 4, display: 'block' }}>
              {errors.category.message}
            </span>
          )}
        </div>

        {/* Step 2: Issue Type / Subcategory */}
        <div>
          <label className="form-label">
            2. Issue Subcategory <span className="form-required">*</span>
          </label>
          <select
            {...register('subCategory')}
            onChange={(e) => {
              const chosen = e.target.value
              setValue('subCategory', chosen, { shouldValidate: true, shouldDirty: true })
              const match = CATEGORY_DATA[currentCategory]?.subcategories.find((s) => s.name === chosen)
              if (match) {
                setValue('assetName', match.defaultAsset, { shouldValidate: true, shouldDirty: true })
              }
            }}
            className="form-select"
          >
            {CATEGORY_DATA[currentCategory]?.subcategories.map((sub) => (
              <option key={sub.id} value={sub.name}>
                {sub.name}
              </option>
            ))}
          </select>
          {errors.subCategory && (
            <span style={{ color: '#ef4444', fontSize: 13, marginTop: 4, display: 'block' }}>
              {errors.subCategory.message}
            </span>
          )}
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
              <select {...register('sector')} className="form-select">
                <option value="Sector 54">Sector 54 (Golf Course Road Hub)</option>
                <option value="Sector 53">Sector 53 (DLF Phase 5)</option>
                <option value="Sector 42">Sector 42 (CyberCity Connect)</option>
                <option value="Sector 56">Sector 56 (Aralias Enclave)</option>
              </select>
            </div>

            {/* Block */}
            <div>
              <span className="location-field-label">Block</span>
              <select {...register('block')} className="form-select">
                <option value="Block A">Block A (The Aralias & Villas)</option>
                <option value="Block B">Block B (The Magnolias Towers)</option>
                <option value="Block C">Block C (Cyber Terraces)</option>
                <option value="Block D">Block D (Commercial Galleria)</option>
              </select>
            </div>

            {/* Street */}
            <div>
              <span className="location-field-label">Street / Road *</span>
              <input
                type="text"
                {...register('street')}
                placeholder="e.g. Gulmohar Marg, Palm Avenue"
                className="location-input"
              />
              {errors.street && (
                <span style={{ color: '#ef4444', fontSize: 12, marginTop: 2, display: 'block' }}>
                  {errors.street.message}
                </span>
              )}
            </div>

            {/* Asset Identifier */}
            <div>
              <span className="location-field-label">Asset Reference *</span>
              <input
                type="text"
                {...register('assetName')}
                placeholder="e.g. CIV-RD-204"
                className="location-input mono"
              />
              {errors.assetName && (
                <span style={{ color: '#ef4444', fontSize: 12, marginTop: 2, display: 'block' }}>
                  {errors.assetName.message}
                </span>
              )}
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <span className="location-field-label">Nearby Landmark</span>
            <input
              type="text"
              {...register('landmark')}
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
            {...register('description')}
            placeholder="Describe the nature of the issue, symptoms observed, extent of damage, and any immediate hazard..."
            className="form-textarea"
          />
          {errors.description && (
            <span style={{ color: '#ef4444', fontSize: 13, marginTop: 4, display: 'block' }}>
              {errors.description.message}
            </span>
          )}
        </div>

        {/* Step 5: Photo Upload using useRef */}
        <div>
          <div className="upload-header">
            <label className="form-label" style={{ marginBottom: 0 }}>
              5. Photographic Evidence (Site Condition)
            </label>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }}
            multiple
          />

          <div onClick={handleTriggerFileInput} className="dropzone">
            <div className="dropzone-icon">📷</div>
            <div className="dropzone-title">Click to browse or drag & drop inspection photos</div>
            <div className="dropzone-sub">Supports JPG, PNG, WEBP up to 10MB</div>
          </div>

          {photos.length > 0 && (
            <div className="thumbnails-strip">
              {photos.map((src, idx) => (
                <div key={idx} className="thumbnail-wrap">
                  <img src={src} alt={`Upload ${idx + 1}`} className="thumbnail-img" />
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
          <button type="button" onClick={() => onNavigate('dashboard')} className="btn-cancel">
            Cancel
          </button>

          <button
            id="btn-submit-complaint"
            type="submit"
            className="btn-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting Report...' : 'Submit Official Complaint'}
          </button>
        </div>
      </form>
    </div>
  )
}
