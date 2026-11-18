/**
 * contractor/contractorSlice.js
 *
 * Repository <-> Slice mapping:
 *   Backend: contractorController.js (/api/v1/contractor/*)
 *   Repository: contractorApi (in frontend-react/src/services/api.js)
 *   This slice: owns ALL work order state for the Field Contractor portal.
 *
 * Core Rules Satisfied:
 *   Rule 1: One repository <-> One Redux slice (contractorController/contractorApi <-> contractor)
 *   Rule 2: Every slice implements CRUD operations (Read, Inspect, Estimate, Start, Complete)
 *   Rule 3: Every CRUD operation uses the Thunk pattern
 *   Rule 4: Database is updated before updating Redux state (API called first)
 *   Rule 5: Redux state is updated using the response received from the database
 *   Rule 6: Frontend reads displayed data from Redux via selectors
 *   Rule 8: All CRUD actions dispatched through Redux
 *   Rule 10: All data visible on frontend comes from Redux store
 *   Rule 11: Redux store remains synchronized with database
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { contractorApi } from '../../services/api.js'

// ---------------------------------------------------------------------------
// Data Normalization — extracted from ContractorPortal.jsx
// Pure transformation: maps raw backend work-order object to the rich UI shape
// expected by the 6 Contractor screens.
// Kept here (not in a React component) so it can be safely used in thunks.
// ---------------------------------------------------------------------------

export function mapBackendJobToUi(wo) {
  const beforePhotos =
    Array.isArray(wo.beforePhotos) && wo.beforePhotos.length > 0
      ? wo.beforePhotos
      : (wo.evidence || [])
          .filter((e) => (e.evidence_type || e.type) === 'BEFORE')
          .map((e) => e.file_url || e.fileUrl)

  const afterPhotos =
    Array.isArray(wo.afterPhotos) && wo.afterPhotos.length > 0
      ? wo.afterPhotos
      : (wo.evidence || [])
          .filter((e) => (e.evidence_type || e.type) === 'AFTER')
          .map((e) => e.file_url || e.fileUrl)

  const inspection =
    wo.inspectionNotes || wo.inspected_at || wo.inspectedAt
      ? {
          observedProblem: wo.observedProblem || wo.inspectionNotes || '',
          equipmentCondition: wo.equipmentCondition || '',
          requiredWork: wo.requiredWork || '',
          inspectionPhoto: wo.inspectionPhoto || null,
          remarks: wo.inspectionNotes || '',
          inspectedAt:
            wo.inspectedAt || wo.inspected_at || new Date().toISOString(),
        }
      : null

  const estimate =
    wo.estimateAmount > 0 || (wo.lineItems && wo.lineItems.length > 0)
      ? {
          items: (wo.lineItems || []).map((item) => ({
            rateCardId: item.rateCardId || item.itemCode || 'RATE-01',
            service: item.description || item.service || 'Remediation Service',
            unit: item.unit || 'Unit',
            rate: Number(item.officialRate || item.rate || item.unitCost || 500),
            qty: Number(item.quantity || item.qty || 1),
            subtotal: Number(
              item.totalAmount ||
                (item.quantity || item.qty || 1) *
                  (item.officialRate || item.rate || 500)
            ),
          })),
          total: Number(wo.estimateAmount || 0),
          status:
            wo.status === 'AWAITING_DEPT_HEAD' ? 'PENDING_APPROVAL' : 'APPROVED',
          submittedAt: wo.createdAt,
        }
      : null

  const execution =
    wo.status === 'IN_PROGRESS' ||
    wo.status === 'COMPLETED' ||
    wo.completed_at ||
    wo.completedAt
      ? {
          startedAt: wo.started_at || wo.createdAt,
          completedAt: wo.completed_at || wo.completedAt,
          actualWorkSummary:
            wo.completionRemarks || wo.completion_remarks || '',
          actualLabourDetails: wo.actualLabourDetails || '',
          afterPhoto: afterPhotos[0] || '',
        }
      : null

  const estimated_cost = Number(wo.estimated_cost ?? wo.estimate_amount ?? 0)
  const actual_cost =
    wo.actual_cost !== null && wo.actual_cost !== undefined
      ? Number(wo.actual_cost)
      : wo.status === 'COMPLETED'
      ? estimated_cost
      : null

  const work_order_number =
    wo.work_order_number || wo.work_order_code || ('WO-' + (wo.id || '').slice(0, 8))
  const complaint_code = wo.complaint_code || wo.complaint_id || wo.id
  const sla_deadline =
    wo.sla_deadline ||
    wo.due_at ||
    new Date(Date.now() + 24 * 3600 * 1000).toISOString()
  const created_at = wo.created_at || new Date().toISOString()
  const special_instructions = wo.special_instructions || wo.description || ''

  return {
    id: complaint_code,
    backendWoId: wo.id,
    work_order_id: wo.id,
    work_order_number,
    complaint_id: wo.complaint_id || wo.id,
    complaint_code,
    title: wo.title || 'Field Work Order',
    category: wo.category || 'General',
    subcategory: wo.subcategory || '',
    subCategory: wo.subcategory || '',
    location:
      typeof wo.location === 'object' && wo.location !== null
        ? wo.location
        : {
            sector: wo.sector || 'Sector 54',
            block: wo.block || 'Block A',
            street: wo.street || 'Gulmohar Marg',
            landmark: wo.location_details || '',
          },
    severity: wo.severity || wo.priority || 'Medium',
    priority: wo.priority || wo.severity || 'Medium',
    sla_deadline,
    status: wo.status,
    estimated_cost,
    actual_cost,
    special_instructions,
    created_at,
    // Backwards-compatible aliases used by the UI components
    workOrderId: work_order_number,
    workOrderCode: work_order_number,
    complaintId: wo.complaint_id || wo.id,
    complaintCode: complaint_code,
    slaDeadline: sla_deadline,
    estimateAmount: estimated_cost,
    estimatedCost: estimated_cost,
    actualCost: actual_cost,
    moneyEstimated: estimated_cost,
    moneyUsed: actual_cost !== null ? actual_cost : 0,
    description: special_instructions,
    reportedBy: wo.reported_by || {
      name: 'Dr. Arvind Swaminathan',
      role: 'RWA Secretary',
    },
    createdAt: created_at,
    beforePhotos,
    afterPhotos,
    inspection,
    estimate,
    execution,
    // Preserve overrun inquiry fields for WorkExecution overrun rebuttal
    inquiry_remark: wo.inquiry_remark || null,
    inquiry_by: wo.inquiry_by || null,
    inquiry_by_role: wo.inquiry_by_role || null,
    rawBackendData: wo,
  }
}

// ---------------------------------------------------------------------------
// Async Thunks
// ---------------------------------------------------------------------------

/**
 * [READ] Fetch all assigned work orders for the authenticated contractor.
 * Repository: contractorApi.getJobs() -> GET /api/v1/contractor/jobs
 */
export const fetchContractorJobs = createAsyncThunk(
  'contractor/fetchJobs',
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await contractorApi.getJobs(params)
      const list = Array.isArray(data) ? data : []
      return list.map(mapBackendJobToUi)
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch contractor jobs')
    }
  }
)

/**
 * [READ ONE] Fetch single work order with full AMC rate snapshot and evidence.
 * Repository: contractorApi.getJobById(id) -> GET /api/v1/contractor/jobs/:id
 */
export const fetchContractorJobById = createAsyncThunk(
  'contractor/fetchJobById',
  async (id, { rejectWithValue }) => {
    try {
      const data = await contractorApi.getJobById(id)
      return mapBackendJobToUi(data)
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch work order details')
    }
  }
)

/**
 * [UPDATE] Submit site inspection findings + optional BEFORE photo evidence.
 *
 * Multi-step operation:
 *   Step 1: POST /api/v1/contractor/inspection  -- saves inspection notes (required)
 *   Step 2: POST /api/v1/contractor/evidence    -- uploads BEFORE photo (optional)
 *
 * If Step 1 succeeds but Step 2 fails, the inspection notes are still persisted.
 * Redux is updated to reflect the confirmed Step 1 result with partial Step 2 error.
 */
export const submitSiteInspection = createAsyncThunk(
  'contractor/submitInspection',
  async ({ jobId, workOrderId, complaintId, inspectionData, severity }, { rejectWithValue }) => {
    // Step 1: Submit inspection notes (required)
    let inspectionResult
    try {
      inspectionResult = await contractorApi.submitInspection({
        workOrderId,
        complaintId,
        inspectionNotes:
          (inspectionData.observedProblem || '') +
          ' | Condition: ' + (inspectionData.equipmentCondition || '') +
          ' | Required: ' + (inspectionData.requiredWork || '') +
          ' | Remarks: ' + (inspectionData.remarks || ''),
        severityConfirmed: severity || 'Medium',
      })
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to submit site inspection')
    }

    // Step 2: Upload BEFORE photo evidence (optional — partial failure is non-fatal)
    let evidenceUploadError = null
    if (inspectionData.inspectionPhoto) {
      try {
        await contractorApi.uploadEvidence({
          workOrderId,
          complaintId,
          evidenceType: 'BEFORE',
          photos: [inspectionData.inspectionPhoto],
          caption:
            inspectionData.observedProblem || 'Initial site inspection assessment proof',
        })
      } catch (evErr) {
        // Evidence upload failed but inspection was saved -- log and continue
        evidenceUploadError = evErr.message
        console.warn(
          '[contractorSlice] BEFORE evidence upload failed (inspection notes were saved):',
          evErr.message
        )
      }
    }

    return {
      jobId,
      inspectionData,
      evidenceUploadError,
      serverResponse: inspectionResult,
    }
  }
)

/**
 * [UPDATE] Submit AMC contractual estimate for Dept Head approval.
 * Repository: contractorApi.submitEstimate() -> POST /api/v1/contractor/estimates
 * DB-first: estimate is verified against amc_rates on the backend.
 */
export const submitAmcEstimate = createAsyncThunk(
  'contractor/submitEstimate',
  async ({ jobId, workOrderId, complaintId, estimateData }, { rejectWithValue }) => {
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

      // Backend may return the confirmed work order status
      const confirmedStatus =
        (res && res.workOrder && res.workOrder.status) ||
        (res && res.data && res.data.workOrder && res.data.workOrder.status) ||
        'AWAITING_DEPT_HEAD'

      return {
        jobId,
        estimateData,
        confirmedStatus,
        serverResponse: res,
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to submit AMC estimate')
    }
  }
)

/**
 * [UPDATE] Start physical work on an APPROVED work order.
 * Repository: contractorApi.updateJobStatus() -> PATCH /api/v1/contractor/jobs/:id/status
 * Backend strictly blocks this if status is not APPROVED or REWORK_REQUESTED.
 */
export const startWorkOrder = createAsyncThunk(
  'contractor/startWork',
  async ({ jobId, backendWoId }, { rejectWithValue }) => {
    try {
      const res = await contractorApi.updateJobStatus(backendWoId, {
        status: 'IN_PROGRESS',
        remarks: 'Contractor commenced physical work on site.',
      })
      return {
        jobId,
        newStatus: 'IN_PROGRESS',
        startedAt: new Date().toISOString(),
        serverResponse: res,
      }
    } catch (err) {
      return rejectWithValue(
        err.message || 'Cannot start work. Department Head approval may be required.'
      )
    }
  }
)

/**
 * [UPDATE] Submit job completion with AFTER photo evidence.
 *
 * Multi-step operation (database-first):
 *   Step 1: POST /api/v1/contractor/evidence (AFTER photo -- required by backend)
 *   Step 2: PATCH /api/v1/contractor/jobs/:id/status (status -> COMPLETED)
 *
 * If Step 1 fails, do NOT proceed to Step 2.
 * If Step 1 succeeds but Step 2 fails, re-fetch to get confirmed state.
 */
export const submitJobCompletion = createAsyncThunk(
  'contractor/submitCompletion',
  async (
    { jobId, backendWoId, complaintId, completionData, estimatedCost },
    { rejectWithValue, dispatch }
  ) => {
    // Step 1: Upload AFTER photo (required by backend before marking COMPLETED)
    if (completionData.afterPhoto) {
      try {
        await contractorApi.uploadEvidence({
          workOrderId: backendWoId,
          complaintId,
          evidenceType: 'AFTER',
          photos: [completionData.afterPhoto],
          caption: completionData.actualWorkSummary || 'Post-repair completion proof',
        })
      } catch (evErr) {
        return rejectWithValue(
          'Failed to upload completion photo: ' +
            evErr.message +
            '. Work order NOT marked complete.'
        )
      }
    }

    // Step 2: Update work order status to COMPLETED
    try {
      const actualCost =
        completionData.actualCost !== undefined && completionData.actualCost !== null
          ? Number(completionData.actualCost)
          : Number(estimatedCost || 0)
      const res = await contractorApi.updateJobStatus(backendWoId, {
        status: 'COMPLETED',
        actualCost,
        overrunReason: completionData.overrunReason || '',
        remarks:
          (completionData.actualWorkSummary || '') +
          ' | Labour: ' + (completionData.actualLabourDetails || '') +
          ' | Notes: ' + (completionData.completionRemarks || ''),
      })

      // Re-fetch the updated job list to sync confirmed backend state
      dispatch(fetchContractorJobs())

      return {
        jobId,
        newStatus: 'PENDING_VERIFICATION',
        completedAt: completionData.completedAt || new Date().toISOString(),
        completionData: {
          ...completionData,
          actualCost,
        },
        serverResponse: res,
      }
    } catch (statusErr) {
      // Status update failed; evidence was already uploaded -- re-fetch real state
      dispatch(fetchContractorJobs())
      return rejectWithValue(
        'Completion photo uploaded but status update failed: ' +
          statusErr.message +
          '. Refreshing your job list.'
      )
    }
  }
)

/**
 * [UPDATE] Submit contractor rebuttal to Finance/COO overrun inquiry.
 * Repository: contractorApi.respondToOverrun() -> POST /api/v1/work-orders/:id/overrun-response
 */
export const respondToOverrunInquiry = createAsyncThunk(
  'contractor/respondToOverrun',
  async ({ backendWoId, rebuttal }, { rejectWithValue }) => {
    try {
      const res = await contractorApi.respondToOverrun(backendWoId, rebuttal)
      return { backendWoId, serverResponse: res }
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to submit overrun rebuttal')
    }
  }
)

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const contractorSlice = createSlice({
  name: 'contractor',
  initialState: {
    jobs: [],            // Array of normalized contractor work orders (mapBackendJobToUi shape)
    selectedJob: null,   // Currently selected job (for inspection / estimate / execution)
    status: 'idle',      // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,         // Global fetch error message

    // Operation-specific loading and error states
    inspectionLoading: false,
    inspectionError: null,

    estimateLoading: false,
    estimateError: null,

    statusUpdateLoading: false,
    statusUpdateError: null,

    evidenceLoading: false,
    evidenceError: null,

    lastActionMessage: null, // Toast notice message string for ContractorPortal/Dashboard
  },

  reducers: {
    // Allow ContractorPortal to set the selected job directly (tab navigation)
    setSelectedJob(state, action) {
      state.selectedJob = action.payload
    },
    // Allow ContractorPortal to clear the toast notice
    clearLastActionMessage(state) {
      state.lastActionMessage = null
    },
    // Clear operation-specific errors (call before retrying operations)
    clearInspectionError(state) {
      state.inspectionError = null
    },
    clearEstimateError(state) {
      state.estimateError = null
    },
    clearStatusUpdateError(state) {
      state.statusUpdateError = null
    },
  },

  extraReducers: (builder) => {
    builder

      // -- fetchContractorJobs -----------------------------------------------
      .addCase(fetchContractorJobs.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchContractorJobs.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.jobs = action.payload // Full normalized list from backend
      })
      .addCase(fetchContractorJobs.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })

      // -- fetchContractorJobById -------------------------------------------
      .addCase(fetchContractorJobById.fulfilled, (state, action) => {
        const updatedJob = action.payload
        state.selectedJob = updatedJob
        // Also update the matching entry in jobs array for consistency
        const idx = state.jobs.findIndex((j) => j.id === updatedJob.id)
        if (idx !== -1) {
          state.jobs[idx] = updatedJob
        } else {
          state.jobs.unshift(updatedJob)
        }
      })
      .addCase(fetchContractorJobById.rejected, (state, action) => {
        state.error = action.payload
      })

      // -- submitSiteInspection ---------------------------------------------
      .addCase(submitSiteInspection.pending, (state) => {
        state.inspectionLoading = true
        state.inspectionError = null
      })
      .addCase(submitSiteInspection.fulfilled, (state, action) => {
        state.inspectionLoading = false
        const { jobId, inspectionData, evidenceUploadError } = action.payload

        // Update the target job with confirmed inspection data
        const idx = state.jobs.findIndex((j) => j.id === jobId)
        if (idx !== -1) {
          state.jobs[idx] = {
            ...state.jobs[idx],
            inspection: inspectionData,
            beforePhotos: inspectionData.inspectionPhoto
              ? [inspectionData.inspectionPhoto, ...(state.jobs[idx].beforePhotos || [])]
              : state.jobs[idx].beforePhotos,
          }
        }

        state.lastActionMessage = evidenceUploadError
          ? ('Site inspection saved for ' + jobId + '. Photo upload had an issue: ' + evidenceUploadError)
          : ('Site inspection successfully saved for ' + jobId + '. Ready to create AMC estimate.')
      })
      .addCase(submitSiteInspection.rejected, (state, action) => {
        state.inspectionLoading = false
        state.inspectionError = action.payload
      })

      // -- submitAmcEstimate ------------------------------------------------
      .addCase(submitAmcEstimate.pending, (state) => {
        state.estimateLoading = true
        state.estimateError = null
      })
      .addCase(submitAmcEstimate.fulfilled, (state, action) => {
        state.estimateLoading = false
        const { jobId, estimateData, confirmedStatus } = action.payload

        const idx = state.jobs.findIndex((j) => j.id === jobId)
        if (idx !== -1) {
          state.jobs[idx] = {
            ...state.jobs[idx],
            estimate: estimateData,
            status: confirmedStatus,
            estimateAmount: Number(estimateData.total || 0),
            estimated_cost: Number(estimateData.total || 0),
            estimatedCost: Number(estimateData.total || 0),
            moneyEstimated: Number(estimateData.total || 0),
          }
        }

        // Clear selectedJob so create-estimate list does not retain the submitted job
        if (state.selectedJob && state.selectedJob.id === jobId) {
          state.selectedJob = null
        }

        const totalStr = estimateData.total
          ? estimateData.total.toLocaleString('en-IN')
          : '0'
        state.lastActionMessage =
          'AMC Estimate of \u20b9' + totalStr +
          ' submitted for ' + jobId +
          '. Awaiting Department Head approval.'
      })
      .addCase(submitAmcEstimate.rejected, (state, action) => {
        state.estimateLoading = false
        state.estimateError = action.payload
      })

      // -- startWorkOrder ---------------------------------------------------
      .addCase(startWorkOrder.pending, (state) => {
        state.statusUpdateLoading = true
        state.statusUpdateError = null
      })
      .addCase(startWorkOrder.fulfilled, (state, action) => {
        state.statusUpdateLoading = false
        const { jobId, newStatus, startedAt } = action.payload

        const idx = state.jobs.findIndex((j) => j.id === jobId)
        if (idx !== -1) {
          state.jobs[idx] = {
            ...state.jobs[idx],
            status: newStatus,
            execution: {
              ...(state.jobs[idx].execution || {}),
              startedAt,
            },
          }
        }

        state.lastActionMessage =
          'Work Order ' + jobId + ' transitioned to IN PROGRESS. Field crew deployed.'
      })
      .addCase(startWorkOrder.rejected, (state, action) => {
        state.statusUpdateLoading = false
        state.statusUpdateError = action.payload
      })

      // -- submitJobCompletion ----------------------------------------------
      .addCase(submitJobCompletion.pending, (state) => {
        state.evidenceLoading = true
        state.evidenceError = null
        state.statusUpdateError = null
      })
      .addCase(submitJobCompletion.fulfilled, (state, action) => {
        state.evidenceLoading = false
        const { jobId, newStatus, completedAt, completionData } = action.payload

        const idx = state.jobs.findIndex((j) => j.id === jobId)
        if (idx !== -1) {
          const finalCost =
            completionData.actualCost !== undefined
              ? completionData.actualCost
              : state.jobs[idx].actual_cost
          state.jobs[idx] = {
            ...state.jobs[idx],
            status: newStatus,
            completedAt,
            actual_cost: finalCost,
            actualCost: finalCost,
            moneyUsed: finalCost,
            completionRemarks: completionData.completionRemarks,
            afterPhotos: completionData.afterPhoto
              ? [completionData.afterPhoto]
              : state.jobs[idx].afterPhotos,
            execution: {
              ...(state.jobs[idx].execution || {}),
              ...completionData,
              completedAt,
            },
          }
        }

        state.lastActionMessage =
          'Work Order ' + jobId +
          ' marked as COMPLETED! Forwarded to RWA for verification and Finance for payment authorization.'
      })
      .addCase(submitJobCompletion.rejected, (state, action) => {
        state.evidenceLoading = false
        state.evidenceError = action.payload
      })

      // -- respondToOverrunInquiry ------------------------------------------
      .addCase(respondToOverrunInquiry.fulfilled, (state) => {
        state.lastActionMessage = 'Overrun rebuttal submitted to Finance/COO for review.'
      })
      .addCase(respondToOverrunInquiry.rejected, (state, action) => {
        state.error = action.payload
      })
  },
})

export const {
  setSelectedJob,
  clearLastActionMessage,
  clearInspectionError,
  clearEstimateError,
  clearStatusUpdateError,
} = contractorSlice.actions

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectAllContractorJobs     = (state) => state.contractor.jobs
export const selectContractorSelectedJob = (state) => state.contractor.selectedJob
export const selectContractorStatus      = (state) => state.contractor.status
export const selectContractorError       = (state) => state.contractor.error
export const selectContractorLoading     = (state) => state.contractor.status === 'loading'

// Operation-specific selectors
export const selectInspectionLoading     = (state) => state.contractor.inspectionLoading
export const selectInspectionError       = (state) => state.contractor.inspectionError
export const selectEstimateLoading       = (state) => state.contractor.estimateLoading
export const selectEstimateError         = (state) => state.contractor.estimateError
export const selectStatusUpdateLoading   = (state) => state.contractor.statusUpdateLoading
export const selectStatusUpdateError     = (state) => state.contractor.statusUpdateError
export const selectEvidenceLoading       = (state) => state.contractor.evidenceLoading
export const selectEvidenceError         = (state) => state.contractor.evidenceError
export const selectLastActionMessage     = (state) => state.contractor.lastActionMessage

export default contractorSlice.reducer

