import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTIMS } from '../../context/TIMSContext.jsx'
import ContractorDashboard from './ContractorDashboard.jsx'
import AssignedWorkOrders from './AssignedWorkOrders.jsx'
import SiteInspection from './SiteInspection.jsx'
import AmcEstimateBuilder from './AmcEstimateBuilder.jsx'
import ApprovalStatus from './ApprovalStatus.jsx'
import WorkExecution from './WorkExecution.jsx'
import ErrorBoundary from '../../components/common/ErrorBoundary.jsx'
import {
  fetchContractorJobs,
  submitSiteInspection,
  submitAmcEstimate,
  startWorkOrder,
  submitJobCompletion,
  setSelectedJob,
  clearLastActionMessage,
  selectAllContractorJobs,
  selectContractorLoading,
  selectContractorSelectedJob,
  selectLastActionMessage,
  selectInspectionError,
  selectEstimateError,
  selectStatusUpdateError,
} from '../../store/contractor/contractorSlice.js'
import './styles/ContractorPortal.css'

export default function ContractorPortal({ onExitToLanding }) {
  // Auth & shared context (only used for currentUser display and amcRateCards)
  const { currentUser } = useTIMS()

  const dispatch = useDispatch()

  // ── Redux state ──────────────────────────────────────────────────────────
  const jobs        = useSelector(selectAllContractorJobs)
  const loading     = useSelector(selectContractorLoading)
  const selectedJob = useSelector(selectContractorSelectedJob)
  const successNotice = useSelector(selectLastActionMessage)
  const inspectionError   = useSelector(selectInspectionError)
  const estimateError     = useSelector(selectEstimateError)
  const statusUpdateError = useSelector(selectStatusUpdateError)

  // ── Local UI-only state (not shared data, so stays local) ────────────────
  // Navigation tab state: 'dashboard' | 'workorders' | 'inspection' | 'estimate' | 'approvals' | 'execution'
  const [currentScreen, setCurrentScreen] = useState('dashboard')

  // ── Fetch jobs on mount ──────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchContractorJobs())
  }, [dispatch])

  // ── Navigation handlers ───────────────────────────────────────────────────
  function handleNavigate(screen) {
    setCurrentScreen(screen)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSelectJob(job) {
    dispatch(setSelectedJob(job))
  }

  function handleDismissNotice() {
    dispatch(clearLastActionMessage())
  }

  // ── Action: Save Site Inspection ──────────────────────────────────────────
  async function handleSaveInspection(jobId, inspectionData) {
    const targetJob = jobs.find((j) => j.id === jobId)
    const workOrderId =
      targetJob?.backendWoId || targetJob?.workOrderId || targetJob?.workOrderCode || jobId
    const complaintId = targetJob?.complaintId || targetJob?.id || jobId

    const result = await dispatch(
      submitSiteInspection({
        jobId,
        workOrderId,
        complaintId,
        inspectionData,
        severity: targetJob?.severity || 'Medium',
      })
    )

    // Propagate rejection so SiteInspection.jsx can catch and show user-facing error
    if (submitSiteInspection.rejected.match(result)) {
      throw new Error(result.payload || 'Inspection submission failed')
    }
  }

  // ── Action: Submit AMC Estimate ───────────────────────────────────────────
  async function handleSubmitEstimate(jobId, estimateData, _nextStatus) {
    const targetJob = jobs.find((j) => j.id === jobId)
    const workOrderId =
      targetJob?.backendWoId || targetJob?.workOrderId || targetJob?.workOrderCode || jobId
    const complaintId = targetJob?.complaintId || targetJob?.id || jobId

    const result = await dispatch(
      submitAmcEstimate({
        jobId,
        workOrderId,
        complaintId,
        estimateData,
      })
    )

    if (submitAmcEstimate.rejected.match(result)) {
      throw new Error(result.payload || 'Estimate submission failed')
    }
  }

  // ── Action: Start Work ────────────────────────────────────────────────────
  async function handleStartWork(jobId) {
    const targetJob = jobs.find((j) => j.id === jobId)
    const backendWoId =
      targetJob?.backendWoId || targetJob?.workOrderId || targetJob?.workOrderCode || jobId

    const hasUnapprovedEstimate =
      (Boolean(targetJob?.estimate) ||
        Number(targetJob?.estimateAmount || targetJob?.estimated_cost || 0) > 0) &&
      targetJob?.status !== 'APPROVED' &&
      targetJob?.status !== 'REWORK_REQUESTED'
    const isAwaiting =
      ['AWAITING_DEPT_HEAD', 'ESTIMATE_SUBMITTED', 'PENDING_APPROVAL', 'AWAITING_COO', 'ESCALATED_TO_COO'].includes(
        targetJob?.status
      ) || hasUnapprovedEstimate
    const isApproved =
      targetJob?.status === 'APPROVED' || targetJob?.status === 'REWORK_REQUESTED'

    if (isAwaiting || !isApproved) {
      alert('Cannot start work: Department Head approval is required before commencing work.')
      return
    }

    const result = await dispatch(startWorkOrder({ jobId, backendWoId }))

    if (startWorkOrder.rejected.match(result)) {
      alert(result.payload || 'Cannot start work: Department Head approval is required.')
    }
  }

  // ── Action: Submit Completion ─────────────────────────────────────────────
  async function handleSubmitCompletion(jobId, completionData) {
    const targetJob = jobs.find((j) => j.id === jobId)
    const backendWoId =
      targetJob?.backendWoId || targetJob?.workOrderId || targetJob?.workOrderCode || jobId
    const complaintId =
      targetJob?.complaintId || targetJob?.complaintCode || targetJob?.id || jobId
    const estimatedCost = Number(
      targetJob?.moneyEstimated || targetJob?.estimatedCost || targetJob?.estimateAmount || 0
    )

    const result = await dispatch(
      submitJobCompletion({
        jobId,
        backendWoId,
        complaintId,
        completionData,
        estimatedCost,
      })
    )

    if (submitJobCompletion.rejected.match(result)) {
      throw new Error(result.payload || 'Completion submission failed')
    }
  }

  // ── Tab Badge counts (derived from Redux jobs) ────────────────────────────
  const assignedCount   = jobs.filter((j) => j.status === 'ASSIGNED' || j.status === 'WORK_ORDER_CREATED').length
  const inspectionNeeded = jobs.filter((j) => j.status === 'ASSIGNED' && !j.inspection).length
  const inProgressCount = jobs.filter((j) => j.status === 'IN_PROGRESS').length
  const revisionCount   = jobs.filter((j) => j.status === 'REVISION_REQUESTED').length

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
          </div>

          {/* User Details & Exit Actions */}
          <div className="contractor-user-actions">
            <div className="contractor-user-badge">
              <div className="contractor-user-name">
                {currentUser?.name || 'Field Contractor'}
              </div>
              <div className="contractor-user-role">
                {currentUser?.contractor_name || currentUser?.contractorName || 'AMC Partner'} •{' '}
                {currentUser?.department_name || currentUser?.departmentName || 'Sector 54'}
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

      {/* ── Loading Indicator ────────────────────────────────────── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 13, color: '#64748b', background: '#f8fafc' }}>
          Syncing contractor data…
        </div>
      )}

      {/* ── Main Screen Body ────────────────────────────────────── */}
      <main className="contractor-main-container">
        <ErrorBoundary>
          {currentScreen === 'dashboard' && (
            <ContractorDashboard
              jobs={jobs}
              onNavigate={handleNavigate}
              onSelectJob={handleSelectJob}
              successNotice={successNotice ? { message: successNotice } : null}
              onDismissNotice={handleDismissNotice}
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
              inspectionError={inspectionError}
            />
          )}

          {currentScreen === 'estimate' && (
            <AmcEstimateBuilder
              jobs={jobs}
              selectedJob={selectedJob}
              onSelectJob={handleSelectJob}
              onSubmitEstimate={handleSubmitEstimate}
              onNavigate={handleNavigate}
              estimateError={estimateError}
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
              statusUpdateError={statusUpdateError}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* ── Civic Footer ────────────────────────────────────────── */}
      <footer className="contractor-footer">
        Township Infrastructure Management System
      </footer>
    </div>
  )
}
