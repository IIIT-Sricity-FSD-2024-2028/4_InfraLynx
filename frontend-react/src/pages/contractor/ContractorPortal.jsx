import { useState, useEffect } from 'react'
import { useTIMS } from '../../context/TIMSContext.jsx'
import ContractorDashboard from './ContractorDashboard.jsx'
import AssignedWorkOrders from './AssignedWorkOrders.jsx'
import SiteInspection from './SiteInspection.jsx'
import AmcEstimateBuilder from './AmcEstimateBuilder.jsx'
import ApprovalStatus from './ApprovalStatus.jsx'
import WorkExecution from './WorkExecution.jsx'
import ReworkDispute from './ReworkDispute.jsx'
import { CONTRACTOR_PROFILE, INITIAL_CONTRACTOR_JOBS } from './mockContractorData.js'
import './styles/ContractorPortal.css'

export default function ContractorPortal({ onExitToLanding }) {
  const {
    complaints = [],
    updateComplaintStatus,
    resetDemoData,
  } = useTIMS()

  // Local state for contractor jobs (merges initial baseline with context complaints)
  const [jobs, setJobs] = useState(() => {
    const saved = localStorage.getItem('tims_contractor_jobs_v1')
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

  // Persist contractor local jobs
  useEffect(() => {
    localStorage.setItem('tims_contractor_jobs_v1', JSON.stringify(jobs))
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
  function handleSaveInspection(jobId, inspectionData) {
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
  function handleSubmitEstimate(jobId, estimateData, nextStatus) {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== jobId) return j
        return {
          ...j,
          estimate: estimateData,
          status: nextStatus,
        }
      })
    )

    if (updateComplaintStatus) {
      updateComplaintStatus(
        jobId,
        nextStatus,
        `AMC Estimate submitted: ₹${estimateData.total?.toLocaleString('en-IN')}`
      )
    }

    setSuccessNotice({
      message: `AMC Estimate of ₹${estimateData.total?.toLocaleString('en-IN')} submitted for ${jobId}.`,
    })
  }

  // Action: Start Work
  function handleStartWork(jobId) {
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
  function handleSubmitCompletion(jobId, completionData) {
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
  function onSubmitRework(jobId, reworkData) {
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

  // Reset local demo data
  function handleResetContractorData() {
    if (window.confirm('Reset contractor jobs to default initial demo records?')) {
      localStorage.removeItem('tims_contractor_jobs_v1')
      setJobs(INITIAL_CONTRACTOR_JOBS)
      setSelectedJob(null)
      setSuccessNotice({ message: 'Contractor data restored to default demo state.' })
      if (resetDemoData) resetDemoData()
      handleNavigate('dashboard')
    }
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

            <button
              onClick={handleResetContractorData}
              title="Reset in-memory contractor data"
              className="contractor-btn-reset"
            >
              ↺ Reset Data
            </button>

            {onExitToLanding && (
              <button onClick={onExitToLanding} className="contractor-btn-exit">
                Exit Portal ↗
              </button>
            )}
          </div>
        </div>

        {/* ── Screen Tabs Navigation Bar ─────────────────────────── */}
        <div className="contractor-tabs-wrapper">
          <div className="contractor-tabs-container">
            {[
              { id: 'dashboard', label: 'Screen 1: Dashboard' },
              {
                id: 'workorders',
                label: 'Screen 2: Assigned Work Orders',
                badge: assignedCount > 0 ? assignedCount : null,
                badgeType: 'blue',
              },
              {
                id: 'inspection',
                label: 'Screen 3: Site Inspection',
                badge: inspectionNeeded > 0 ? inspectionNeeded : null,
                badgeType: 'amber',
              },
              { id: 'estimate', label: 'Screen 4: AMC Estimate Builder' },
              {
                id: 'approvals',
                label: 'Screen 5: Approval Status',
                badge: revisionCount > 0 ? `${revisionCount} Rev` : null,
                badgeType: 'amber',
              },
              {
                id: 'execution',
                label: 'Screen 6: Work Execution',
                badge: inProgressCount > 0 ? inProgressCount : null,
                badgeType: 'blue',
              },
              {
                id: 'rework',
                label: 'Screen 7: Rework / Dispute',
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
