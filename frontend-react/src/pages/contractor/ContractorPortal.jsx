import { useState, useEffect, useCallback } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import { contractorApi } from '../../services/api.js'
import ContractorDashboard from './ContractorDashboard.jsx'
import AssignedWorkOrders from './AssignedWorkOrders.jsx'
import SiteInspection from './SiteInspection.jsx'
import AmcEstimateBuilder from './AmcEstimateBuilder.jsx'
import ApprovalStatus from './ApprovalStatus.jsx'
import WorkExecution from './WorkExecution.jsx'
import ReworkDispute from './ReworkDispute.jsx'
import { CONTRACTOR_PROFILE, INITIAL_CONTRACTOR_JOBS } from './mockContractorData.js'
import './styles/ContractorPortal.css'

function mapBackendJobToUi(wo) {
  const beforePhotos = Array.isArray(wo.beforePhotos) && wo.beforePhotos.length > 0
    ? wo.beforePhotos
    : (wo.evidence || []).filter((e) => (e.evidence_type || e.type) === 'BEFORE').map((e) => e.file_url || e.fileUrl)
  const afterPhotos = Array.isArray(wo.afterPhotos) && wo.afterPhotos.length > 0
    ? wo.afterPhotos
    : (wo.evidence || []).filter((e) => (e.evidence_type || e.type) === 'AFTER').map((e) => e.file_url || e.fileUrl)

  const inspection = wo.inspectionNotes || wo.inspected_at || wo.inspectedAt ? {
    observedProblem: wo.inspectionNotes || 'Site inspected by contractor team.',
    equipmentCondition: 'Moderate Damage',
    requiredWork: 'Remediation per AMC guidelines',
    inspectionPhoto: beforePhotos[0] || null,
    remarks: wo.inspectionNotes || '',
    inspectedAt: wo.inspectedAt || wo.inspected_at || new Date().toISOString(),
  } : null

  const estimate = (wo.estimateAmount > 0 || (wo.lineItems && wo.lineItems.length > 0)) ? {
    items: (wo.lineItems || []).map((item) => ({
      rateCardId: item.rateCardId || item.itemCode || 'RATE-01',
      service: item.description || item.service || 'Remediation Service',
      unit: item.unit || 'Unit',
      rate: Number(item.officialRate || item.rate || item.unitCost || 500),
      qty: Number(item.quantity || item.qty || 1),
      subtotal: Number(item.totalAmount || ((item.quantity || item.qty || 1) * (item.officialRate || item.rate || 500))),
    })),
    total: Number(wo.estimateAmount || 0),
    status: wo.status === 'AWAITING_DEPT_HEAD' ? 'PENDING_APPROVAL' : 'APPROVED',
    submittedAt: wo.createdAt,
  } : null

  const execution = (wo.status === 'IN_PROGRESS' || wo.status === 'COMPLETED' || wo.completed_at || wo.completedAt) ? {
    startedAt: wo.started_at || wo.createdAt,
    completedAt: wo.completed_at || wo.completedAt,
    actualWorkSummary: wo.completionRemarks || wo.completion_remarks || '',
    actualLabourDetails: 'Field contractor technical crew deployed.',
    afterPhoto: afterPhotos[0] || '',
  } : null

  return {
    id: wo.complaintId || wo.complaintCode || wo.id,
    backendWoId: wo.id,
    workOrderId: wo.workOrderId || wo.workOrderCode || `WO-${wo.id?.slice(0, 8)}`,
    workOrderCode: wo.workOrderCode || wo.workOrderId,
    complaintId: wo.complaintId || wo.id,
    complaintCode: wo.complaintCode || wo.complaintId || wo.id,
    title: wo.title || 'Field Work Order',
    category: wo.category || 'General',
    subCategory: wo.subCategory || wo.subcategory || '',
    location: typeof wo.location === 'object' && wo.location !== null ? wo.location : {
      sector: 'Sector 54',
      block: 'Block A',
      street: 'Gulmohar Marg',
    },
    severity: wo.severity || wo.priority || 'Medium',
    priority: wo.priority || wo.severity || 'Medium',
    slaDeadline: wo.slaDeadline || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    status: wo.status,
    description: wo.description || wo.specialInstructions || '',
    reportedBy: wo.reportedBy || { name: 'Dr. Arvind Swaminathan', role: 'RWA Secretary' },
    createdAt: wo.createdAt || new Date().toISOString(),
    beforePhotos,
    afterPhotos,
    inspection,
    estimate,
    execution,
    dispute: wo.dispute || (wo.status === 'DISPUTED' ? { reason: 'RWA requested rework' } : null),
    rework: null,
    rawBackendData: wo,
  }
}

export default function ContractorPortal({ onExitToLanding }) {
  const {
    complaints = [],
    updateComplaintStatus,
  } = useTIMS()

  // Local state for contractor jobs (merges initial baseline with context complaints)
  const [jobs, setJobs] = useState(() => {
    const saved = sessionStorage.getItem('tims_contractor_jobs_v1')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return INITIAL_CONTRACTOR_JOBS
      }
    }
    return INITIAL_CONTRACTOR_JOBS
  })

  // Navigation tab state: 'dashboard' | 'workorders' | 'inspection' | 'estimate' | 'approvals' | 'execution' | 'rework'
  const [currentScreen, setCurrentScreen] = useState('dashboard')
  const [selectedJob, setSelectedJob] = useState(null)
  const [successNotice, setSuccessNotice] = useState(null)
  const [apiConnected, setApiConnected] = useState(false)

  // Fetch live jobs from backend API on mount
  useEffect(() => {
    let isMounted = true

    async function loadBackendJobs() {
      try {
        const liveWorkOrders = await contractorApi.getJobs()
        if (isMounted && Array.isArray(liveWorkOrders) && liveWorkOrders.length > 0) {
          setApiConnected(true)
          const mappedJobs = liveWorkOrders.map(mapBackendJobToUi)

          setJobs((prev) => {
            // Merge live jobs with previous state, giving priority to live backend data
            const updated = [...mappedJobs]
            prev.forEach((pj) => {
              const alreadyExists = updated.some(
                (mj) =>
                  mj.id === pj.id ||
                  mj.workOrderId === pj.workOrderId ||
                  mj.backendWoId === pj.backendWoId ||
                  mj.backendWoId === pj.id
              )
              if (!alreadyExists) {
                updated.push(pj)
              }
            })
            return updated
          })
        }
      } catch (err) {
        // Fallback gracefully to offline state
        console.info('[ContractorPortal] Backend sync running in offline fallback mode:', err.message)
      }
    }

    loadBackendJobs()

    return () => {
      isMounted = false
    }
  }, [])

  // Persist contractor local jobs in tab-isolated sessionStorage
  useEffect(() => {
    sessionStorage.setItem('tims_contractor_jobs_v1', JSON.stringify(jobs))
  }, [jobs])

  // Real-time synchronization: If a complaint in shared context was updated or assigned, reflect here
  useEffect(() => {
    complaints.forEach((cmp) => {
      if (cmp.assignedContractor || cmp.workOrderId || cmp.status === 'ASSIGNED' || cmp.status === 'DISPUTED') {
        setJobs((prev) => {
          const exists = prev.find((j) => j.id === cmp.id)
          if (!exists) {
            // New job from clerk or citizen
            const newJob = {
              id: cmp.id,
              workOrderId: cmp.workOrderId || `WO-2026-${Math.floor(100 + Math.random() * 900)}`,
              title: cmp.title,
              category: cmp.category,
              subCategory: cmp.subCategory,
              location: cmp.location,
              severity: cmp.severity,
              slaDeadline: cmp.slaDeadline,
              status: cmp.status === 'REPORTED' || cmp.status === 'UNDER_REVIEW' ? 'ASSIGNED' : cmp.status,
              description: cmp.description,
              reportedBy: cmp.reportedBy,
              createdAt: cmp.createdAt,
              beforePhotos: cmp.beforePhotos || [],
              afterPhotos: cmp.afterPhotos || [],
              inspection: cmp.inspectionRemarks ? { remarks: cmp.inspectionRemarks } : null,
              estimate: cmp.estimateAmount ? { total: cmp.estimateAmount } : null,
              execution: cmp.completedAt ? { completedAt: cmp.completedAt } : null,
              dispute: cmp.dispute || null,
            }
            return [newJob, ...prev]
          } else if (cmp.status === 'DISPUTED' && exists.status !== 'DISPUTED') {
            // Reflect dispute immediately
            return prev.map((j) => (j.id === cmp.id ? { ...j, status: 'DISPUTED', dispute: cmp.dispute } : j))
          }
          return prev
        })
      }
    })
  }, [complaints])

  function handleNavigate(screen) {
    setCurrentScreen(screen)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSelectJob(job) {
    setSelectedJob(job)
  }

  // Action: Save Site Inspection
  async function handleSaveInspection(jobId, inspectionData) {
    const targetJob = jobs.find((j) => j.id === jobId)
    const workOrderId = targetJob?.backendWoId || targetJob?.workOrderId || targetJob?.workOrderCode || jobId
    const complaintId = targetJob?.complaintId || targetJob?.id || jobId

    // Bridge to backend contractor API
    try {
      await contractorApi.submitInspection({
        workOrderId,
        complaintId,
        inspectionNotes: `${inspectionData.observedProblem || ''} | Condition: ${inspectionData.equipmentCondition || ''} | Required: ${inspectionData.requiredWork || ''} | Remarks: ${inspectionData.remarks || ''}`,
        severityConfirmed: targetJob?.severity || 'Medium',
      })

      if (inspectionData.inspectionPhoto) {
        await contractorApi.uploadEvidence({
          workOrderId,
          complaintId,
          evidenceType: 'BEFORE',
          photos: [inspectionData.inspectionPhoto],
          caption: inspectionData.observedProblem || 'Initial site inspection assessment proof',
        })
      }
    } catch (err) {
      console.warn('[ContractorPortal] Backend submitInspection note:', err.message)
    }

    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== jobId) return j
        return {
          ...j,
          inspection: inspectionData,
          beforePhotos: [inspectionData.inspectionPhoto, ...(j.beforePhotos || [])],
        }
      })
    )

    // Notify context if status is updated
    if (updateComplaintStatus) {
      updateComplaintStatus(
        jobId,
        'UNDER_REVIEW',
        `Site inspection logged by contractor: ${inspectionData.observedProblem}`
      )
    }

    setSuccessNotice({
      message: `Site inspection successfully saved for ${jobId}. Ready to create AMC estimate.`,
    })
  }

  // Action: Submit AMC Estimate
  async function handleSubmitEstimate(jobId, estimateData, nextStatus) {
    const targetJob = jobs.find((j) => j.id === jobId)
    const workOrderId = targetJob?.backendWoId || targetJob?.workOrderId || targetJob?.workOrderCode || jobId
    const complaintId = targetJob?.complaintId || targetJob?.id || jobId

    let finalStatus = nextStatus

    // Bridge to backend contractor API
    try {
      const lineItemsPayload = (estimateData.items || []).map((it) => ({
        rateCardId: it.rateCardId,
        itemCode: it.rateCardId,
        description: it.service,
        service: it.service,
        unit: it.unit,
        rate: Number(it.rate || 0),
        unitCost: Number(it.rate || 0),
        quantity: Number(it.qty || 1),
        qty: Number(it.qty || 1),
      }))

      const res = await contractorApi.submitEstimate({
        workOrderId,
        complaintId,
        lineItems: lineItemsPayload,
      })

      if (res?.data?.workOrder?.status) {
        finalStatus = res.data.workOrder.status
      }
    } catch (err) {
      console.warn('[ContractorPortal] Backend submitEstimate note:', err.message)
    }

    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== jobId) return j
        return {
          ...j,
          estimate: estimateData,
          status: finalStatus,
        }
      })
    )

    if (updateComplaintStatus) {
      updateComplaintStatus(
        jobId,
        finalStatus,
        `AMC Estimate submitted: ₹${estimateData.total?.toLocaleString('en-IN')}`
      )
    }

    setSuccessNotice({
      message: `AMC Estimate of ₹${estimateData.total?.toLocaleString('en-IN')} submitted for ${jobId}.`,
    })
  }

  // Action: Start Work
  async function handleStartWork(jobId) {
    const targetJob = jobs.find((j) => j.id === jobId)
    const targetId = targetJob?.backendWoId || targetJob?.workOrderId || targetJob?.workOrderCode || jobId

    // Bridge to backend contractor API
    try {
      await contractorApi.updateJobStatus(targetId, {
        status: 'IN_PROGRESS',
        remarks: 'Contractor commenced physical work on site.',
      })
    } catch (err) {
      console.warn('[ContractorPortal] Backend updateJobStatus note:', err.message)
    }

    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== jobId) return j
        return {
          ...j,
          status: 'IN_PROGRESS',
          execution: {
            startedAt: new Date().toISOString(),
          },
        }
      })
    )

    if (updateComplaintStatus) {
      updateComplaintStatus(jobId, 'IN_PROGRESS', 'Contractor commenced ground repair work.')
    }

    setSuccessNotice({
      message: `Work Order ${jobId} transitioned to IN PROGRESS. Field crew deployed.`,
    })
  }

  // Action: Submit Completion
  async function handleSubmitCompletion(jobId, completionData) {
    const targetJob = jobs.find((j) => j.id === jobId)
    const targetId = targetJob?.backendWoId || targetJob?.workOrderId || targetJob?.workOrderCode || jobId
    const complaintId = targetJob?.complaintId || targetJob?.id || jobId

    // Bridge to backend contractor API
    try {
      if (completionData.afterPhoto) {
        await contractorApi.uploadEvidence({
          workOrderId: targetId,
          complaintId,
          evidenceType: 'AFTER',
          photos: [completionData.afterPhoto],
          caption: completionData.actualWorkSummary || 'Post-repair completion proof',
        })
      }

      await contractorApi.updateJobStatus(targetId, {
        status: 'COMPLETED',
        remarks: `${completionData.actualWorkSummary || ''} | Labour: ${completionData.actualLabourDetails || ''} | Notes: ${completionData.completionRemarks || ''}`,
      })
    } catch (err) {
      console.warn('[ContractorPortal] Backend submitCompletion note:', err.message)
    }

    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== jobId) return j
        return {
          ...j,
          status: 'PENDING_VERIFICATION',
          completedAt: completionData.completedAt,
          completionRemarks: completionData.completionRemarks,
          afterPhotos: [completionData.afterPhoto],
          execution: {
            ...j.execution,
            ...completionData,
          },
        }
      })
    )

    if (updateComplaintStatus) {
      updateComplaintStatus(
        jobId,
        'PENDING_VERIFICATION',
        `Repair completed by contractor. Proof uploaded: ${completionData.actualWorkSummary}`
      )
    }

    setSuccessNotice({
      message: `Work Order ${jobId} marked as COMPLETED! Forwarded to RWA for verification.`,
    })
  }

  // Action: Submit Rework
  async function onSubmitRework(jobId, reworkData) {
    const targetJob = jobs.find((j) => j.id === jobId)
    const targetId = targetJob?.backendWoId || targetJob?.workOrderId || targetJob?.workOrderCode || jobId
    const complaintId = targetJob?.complaintId || targetJob?.id || jobId

    // Bridge to backend contractor API
    try {
      if (reworkData.newPhoto) {
        await contractorApi.uploadEvidence({
          workOrderId: targetId,
          complaintId,
          evidenceType: 'AFTER',
          photos: [reworkData.newPhoto],
          caption: reworkData.correctiveAction || 'Corrective rework completion proof',
        })
      }

      await contractorApi.updateJobStatus(targetId, {
        status: 'COMPLETED',
        remarks: `Corrective rework completed under AMC warranty: ${reworkData.correctiveAction || ''}. Notes: ${reworkData.remarks || ''}`,
      })
    } catch (err) {
      console.warn('[ContractorPortal] Backend submitRework note:', err.message)
    }

    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== jobId) return j
        return {
          ...j,
          status: 'PENDING_VERIFICATION',
          afterPhotos: [reworkData.newPhoto, ...(j.afterPhotos || [])],
          rework: reworkData,
        }
      })
    )

    if (updateComplaintStatus) {
      updateComplaintStatus(
        jobId,
        'PENDING_VERIFICATION',
        `Corrective rework completed under AMC warranty. Re-submitted for RWA sign-off.`
      )
    }

    setSuccessNotice({
      message: `Corrective rework submitted for ${jobId}. Status updated to PENDING_VERIFICATION.`,
    })
  }



  // Tab Badge counts
  const assignedCount = jobs.filter((j) => j.status === 'ASSIGNED' || j.status === 'WORK_ORDER_CREATED').length
  const inspectionNeeded = jobs.filter((j) => j.status === 'ASSIGNED' && !j.inspection).length
  const inProgressCount = jobs.filter((j) => j.status === 'IN_PROGRESS').length
  const revisionCount = jobs.filter((j) => j.status === 'REVISION_REQUESTED').length
  const disputedCount = jobs.filter((j) => j.status === 'DISPUTED').length

  return (
    <div className="contractor-shell">
      {/* ── Sticky Header ────────────────────────────────────────── */}
      <header className="contractor-header">
        <div className="contractor-header-top">
          {/* Brand Logo & Role Tag */}
          <div className="contractor-brand-group">
            <div className="contractor-brand-link" onClick={() => handleNavigate('dashboard')}>
              <img src="/assets/CRIMS_logo.png" alt="TIMS" className="contractor-brand-logo" />
              <div>
                <span className="contractor-brand-title">TIMS</span>
                <span className="contractor-brand-sub">Township Infrastructure Management</span>
              </div>
            </div>

            <div className="contractor-role-badge">
              <span className="contractor-role-dot" />
              Field Contractor
            </div>

            {/* AMC Contract Reference Badge */}
            <div className="contractor-contract-tag">
              AMC Ref: <strong>{CONTRACTOR_PROFILE.amcContractId}</strong>
            </div>

            {/* Backend Sync Indicator Badge */}
            <div
              className="contractor-contract-tag"
              style={{
                backgroundColor: apiConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: apiConnected ? '#059669' : '#d97706',
                border: apiConnected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: apiConnected ? '#10b981' : '#f59e0b',
                  marginRight: 6,
                }}
              />
              {apiConnected ? 'Neon PostgreSQL API Connected' : 'In-Memory / Offline Mode'}
            </div>
          </div>

          {/* User Details & Exit Actions */}
          <div className="contractor-user-actions">
            <div className="contractor-user-badge">
              <div className="contractor-user-name">
                {CONTRACTOR_PROFILE.lead} • {CONTRACTOR_PROFILE.name}
              </div>
              <div className="contractor-user-role">
                {CONTRACTOR_PROFILE.title} • {CONTRACTOR_PROFILE.rating} ★ Rating
              </div>
            </div>



            {onExitToLanding && (
              <button onClick={onExitToLanding} className="contractor-btn-exit">
                Exit Portal ↗
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs Navigation Bar ───────────────────────────────── */}
        <div className="contractor-tabs-wrapper">
          <div className="contractor-tabs-container">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              {
                id: 'workorders',
                label: 'Assigned Work Orders',
                badge: assignedCount > 0 ? assignedCount : null,
                badgeType: 'blue',
              },
              {
                id: 'inspection',
                label: 'Site Inspection',
                badge: inspectionNeeded > 0 ? inspectionNeeded : null,
                badgeType: 'amber',
              },
              { id: 'estimate', label: 'AMC Estimate Builder' },
              {
                id: 'approvals',
                label: 'Approval Status',
                badge: revisionCount > 0 ? `${revisionCount} Rev` : null,
                badgeType: 'amber',
              },
              {
                id: 'execution',
                label: 'Work Execution',
                badge: inProgressCount > 0 ? inProgressCount : null,
                badgeType: 'blue',
              },
              {
                id: 'rework',
                label: 'Rework / Dispute',
                badge: disputedCount > 0 ? `${disputedCount} Rework` : null,
                badgeType: 'red',
              },
            ].map((tab) => {
              const isActive = currentScreen === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleNavigate(tab.id)}
                  className={`contractor-tab-btn ${isActive ? 'active' : ''}`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`contractor-tab-badge ${
                        tab.badgeType === 'amber'
                          ? 'amber'
                          : tab.badgeType === 'blue'
                          ? 'blue'
                          : ''
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* ── Main Screen Body ────────────────────────────────────── */}
      <main className="contractor-main-container">
        {currentScreen === 'dashboard' && (
          <ContractorDashboard
            jobs={jobs}
            onNavigate={handleNavigate}
            onSelectJob={handleSelectJob}
            successNotice={successNotice}
            onDismissNotice={() => setSuccessNotice(null)}
          />
        )}

        {currentScreen === 'workorders' && (
          <AssignedWorkOrders
            jobs={jobs}
            onNavigate={handleNavigate}
            onSelectJob={handleSelectJob}
          />
        )}

        {currentScreen === 'inspection' && (
          <SiteInspection
            jobs={jobs}
            selectedJob={selectedJob}
            onSelectJob={handleSelectJob}
            onSaveInspection={handleSaveInspection}
            onNavigate={handleNavigate}
          />
        )}

        {currentScreen === 'estimate' && (
          <AmcEstimateBuilder
            jobs={jobs}
            selectedJob={selectedJob}
            onSelectJob={handleSelectJob}
            onSubmitEstimate={handleSubmitEstimate}
            onNavigate={handleNavigate}
          />
        )}

        {currentScreen === 'approvals' && (
          <ApprovalStatus
            jobs={jobs}
            selectedJob={selectedJob}
            onSelectJob={handleSelectJob}
            onNavigate={handleNavigate}
          />
        )}

        {currentScreen === 'execution' && (
          <WorkExecution
            jobs={jobs}
            selectedJob={selectedJob}
            onSelectJob={handleSelectJob}
            onStartWork={handleStartWork}
            onSubmitCompletion={handleSubmitCompletion}
            onNavigate={handleNavigate}
          />
        )}

        {currentScreen === 'rework' && (
          <ReworkDispute
            jobs={jobs}
            selectedJob={selectedJob}
            onSelectJob={handleSelectJob}
            onSubmitRework={onSubmitRework}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      {/* ── Civic Footer ────────────────────────────────────────── */}
      <footer className="contractor-footer">
        TIMS Township Infrastructure Management System • Member 3: Field Contractor Module • Inspect &rarr; Estimate &rarr; Execute &rarr; Complete
      </footer>
    </div>
  )
}
