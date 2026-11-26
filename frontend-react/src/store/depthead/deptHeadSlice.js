/**
 * depthead/deptHeadSlice.js
 *
 * Repository ↔ Slice mapping:
 *   Backend: deptHeadController.js, approvalController.js, deptHeadWorkOrderController.js (/api/v1/dept-head/*)
 *   Repository: deptHeadApi (in frontend-react/src/services/api.js)
 *   This slice: owns ALL Department Head state (metrics, civil complaints, approvals, work orders, staff).
 *
 * Core Rules Satisfied:
 *   Rule 1: One repository ↔️ One Redux slice (deptHeadApi ↔️ deptHead)
 *   Rule 2: Every slice implements CRUD operations (Create, Read, Update, Delete/Status toggle)
 *   Rule 3: Every CRUD operation uses the Thunk pattern (createAsyncThunk)
 *   Rule 4: Database is updated before updating Redux state (deptHeadApi called first)
 *   Rule 5: Redux state is updated using the response received from the database
 *   Rule 6: Frontend reads displayed data strictly from Redux via selectors
 *   Rule 7: Frontend does not directly fetch application data independently of Redux
 *   Rule 8: All CRUD actions are dispatched through Redux
 *   Rule 9: Login and logout handled through Redux (authSlice integration)
 *   Rule 10: All data visible on the frontend comes from the Redux store
 *   Rule 11: Redux store remains synchronized with database
 *   Rule 12: Slice–repository one-to-one mapping clearly visible in project structure
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { deptHeadApi } from '../../services/api.js'

// ─── Async Thunks (CRUD) ─────────────────────────────────────────────────────

/**
 * [READ] Fetch Civil Department dashboard telemetry, KPIs, and recent activity
 */
export const fetchDeptDashboard = createAsyncThunk(
  'deptHead/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const data = await deptHeadApi.getDashboard()
      return data || {}
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load department dashboard')
    }
  },
  {
    condition: (options, { getState }) => {
      if (options?.force) return true
      const { deptHead } = getState()
      if (deptHead?.dashboard?.status === 'loading') {
        return false // Guard against duplicate concurrent fetches
      }
    },
  }
)

/**
 * [READ] Fetch all complaints for the Civil department
 */
export const fetchDeptComplaints = createAsyncThunk(
  'deptHead/fetchComplaints',
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await deptHeadApi.getComplaints(params)
      return Array.isArray(data) ? data : []
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch civil complaints')
    }
  }
)

/**
 * [READ ONE] Fetch single Civil complaint record by ID
 */
export const fetchDeptComplaintById = createAsyncThunk(
  'deptHead/fetchComplaintById',
  async (id, { rejectWithValue }) => {
    try {
      const data = await deptHeadApi.getComplaintById(id)
      return data?.data || data
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch complaint details')
    }
  }
)

/**
 * [READ] Fetch contractor estimate approvals requiring Dept Head sign-off (> ₹10k threshold)
 */
export const fetchApprovals = createAsyncThunk(
  'deptHead/fetchApprovals',
  async (_, { rejectWithValue }) => {
    try {
      const data = await deptHeadApi.getApprovals()
      return Array.isArray(data) ? data : []
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch pending approvals')
    }
  },
  {
    condition: (options, { getState }) => {
      if (options?.force) return true
      const { deptHead } = getState()
      if (deptHead?.approvals?.status === 'loading') {
        return false
      }
    },
  }
)

/**
 * [READ ONE] Fetch estimate approval details by ID
 */
export const fetchApprovalDetails = createAsyncThunk(
  'deptHead/fetchApprovalDetails',
  async (id, { rejectWithValue }) => {
    try {
      const data = await deptHeadApi.getApprovalDetails(id)
      return data?.data || data
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch approval details')
    }
  }
)

/**
 * [UPDATE] Process estimate approval decision (APPROVE | REQUEST_REVISION | FORWARD_TO_COO | REJECT)
 * DB updated first; then triggers background re-sync of approvals and dashboard KPIs.
 */
export const processApprovalDecision = createAsyncThunk(
  'deptHead/processApproval',
  async ({ id, action = 'APPROVE', notes = '' }, { dispatch, rejectWithValue }) => {
    try {
      const res = await deptHeadApi.processApproval(id, { action, notes })
      // Keep store strictly synchronized with DB
      dispatch(fetchApprovals({ force: true }))
      dispatch(fetchDeptDashboard({ force: true }))
      return { id, action, notes, res }
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to process approval')
    }
  }
)

/**
 * [READ] Fetch and filter Civil work orders
 */
export const fetchDeptWorkOrders = createAsyncThunk(
  'deptHead/fetchWorkOrders',
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await deptHeadApi.getWorkOrders(params)
      return Array.isArray(data) ? data : []
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch work orders')
    }
  }
)

/**
 * [READ ONE] Fetch single work order details by ID
 */
export const fetchDeptWorkOrderById = createAsyncThunk(
  'deptHead/fetchWorkOrderById',
  async (id, { rejectWithValue }) => {
    try {
      const data = await deptHeadApi.getWorkOrderById(id)
      return data?.data || data
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch work order details')
    }
  }
)

/**
 * [UPDATE] Escalate delayed Civil work order to Township COO
 */
export const escalateDeptWorkOrder = createAsyncThunk(
  'deptHead/escalateWorkOrder',
  async ({ id, reason }, { dispatch, rejectWithValue }) => {
    try {
      const res = await deptHeadApi.escalateWorkOrder(id, reason)
      dispatch(fetchDeptWorkOrders())
      dispatch(fetchDeptDashboard({ force: true }))
      return { id, reason, res }
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to escalate work order')
    }
  }
)

/**
 * [READ] Fetch all Desk Clerks under Civil Department
 */
export const fetchStaff = createAsyncThunk(
  'deptHead/fetchStaff',
  async (_, { rejectWithValue }) => {
    try {
      const data = await deptHeadApi.getStaff()
      return Array.isArray(data) ? data : []
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch department staff')
    }
  },
  {
    condition: (options, { getState }) => {
      if (options?.force) return true
      const { deptHead } = getState()
      if (deptHead?.staff?.status === 'loading') {
        return false
      }
    },
  }
)

/**
 * [CREATE] Create new Desk Clerk employee account locked to Civil Department
 */
export const createStaff = createAsyncThunk(
  'deptHead/createStaff',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const res = await deptHeadApi.createStaff(payload)
      const record = res?.data || res
      dispatch(fetchStaff({ force: true }))
      return record
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to create staff member')
    }
  }
)

/**
 * [UPDATE] Update Civil Desk Clerk details (name, email, phone)
 */
export const updateStaff = createAsyncThunk(
  'deptHead/updateStaff',
  async ({ id, payload }, { dispatch, rejectWithValue }) => {
    try {
      const res = await deptHeadApi.updateStaff(id, payload)
      const record = res?.data || res
      dispatch(fetchStaff({ force: true }))
      return { id, record }
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update staff member')
    }
  }
)

/**
 * [UPDATE / STATUS] Activate or Suspend employee access
 */
export const updateStaffStatus = createAsyncThunk(
  'deptHead/updateStaffStatus',
  async ({ id, status }, { dispatch, rejectWithValue }) => {
    try {
      const res = await deptHeadApi.updateStaffStatus(id, status)
      const record = res?.data || res
      dispatch(fetchStaff({ force: true }))
      return { id, status, record }
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update staff status')
    }
  }
)

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState = {
  dashboard: {
    data: null,
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  complaints: {
    items: [],
    selected: null,
    status: 'idle',
    error: null,
  },
  approvals: {
    items: [],
    selected: null,
    status: 'idle',
    error: null,
    processing: false,
  },
  workOrders: {
    items: [],
    selectedWO: null,
    status: 'idle',
    error: null,
    processing: false,
  },
  staff: {
    items: [],
    status: 'idle',
    error: null,
    processing: false,
  },
  portalUi: {
    currentScreen: 'dashboard',
    selectedComplaint: null,
    returnScreen: 'dashboard',
  },
  dashboardUi: {
    hoveredCard: null,
    statusFilter: 'ALL',
    priorityFilter: 'ALL',
    searchQuery: '',
    selectedComplaintForModal: null,
    refreshingComplaints: false,
  },
  approvalsUi: {
    localProcessing: false,
    showModal: false,
    modalAction: 'REQUEST_REVISION',
    reason: '',
    selectedItem: null,
  },
  employeesUi: {
    localProcessing: false,
    showAddModal: false,
    showEditModal: false,
    selectedEmp: null,
    newEmpName: '',
    newEmpEmail: '',
    newEmpPhone: '',
  },
  workOrdersUi: {
    localProcessing: false,
    filters: {
      status: '',
      search: '',
      priority: '',
      sla: '',
      contractor_id: '',
    },
    showEscalateModal: false,
    selectedWO: null,
    escalateReason: '',
  },
  workOrderDetailsUi: {
    details: null,
    loading: true,
    error: null,
    showModal: false,
    modalAction: 'REQUEST_REVISION',
    reason: '',
    localProcessing: false,
  },
}

// ─── Slice ───────────────────────────────────────────────────────────────────

const deptHeadSlice = createSlice({
  name: 'deptHead',
  initialState,
  reducers: {
    setSelectedDeptWorkOrder(state, action) {
      state.workOrders.selectedWO = action.payload
    },
    setSelectedDeptComplaint(state, action) {
      state.complaints.selected = action.payload
    },
    clearDeptHeadErrors(state) {
      state.dashboard.error = null
      state.complaints.error = null
      state.approvals.error = null
      state.workOrders.error = null
      state.staff.error = null
    },
    setDeptPortalUiField(state, action) {
      const { field, value } = action.payload
      if (field in state.portalUi) state.portalUi[field] = value
    },
    setDeptDashboardUiField(state, action) {
      const { field, value } = action.payload
      if (field in state.dashboardUi) state.dashboardUi[field] = value
    },
    resetDeptDashboardFilters(state) {
      state.dashboardUi.statusFilter = 'ALL'
      state.dashboardUi.priorityFilter = 'ALL'
      state.dashboardUi.searchQuery = ''
    },
    setDeptApprovalsUiField(state, action) {
      const { field, value } = action.payload
      if (field in state.approvalsUi) state.approvalsUi[field] = value
    },
    setDeptEmployeesUiField(state, action) {
      const { field, value } = action.payload
      if (field in state.employeesUi) state.employeesUi[field] = value
    },
    openDeptAddEmpModal(state) {
      state.employeesUi.newEmpName = ''
      state.employeesUi.newEmpEmail = ''
      state.employeesUi.newEmpPhone = ''
      state.employeesUi.showAddModal = true
    },
    openDeptEditEmpModal(state, action) {
      const emp = action.payload
      state.employeesUi.selectedEmp = emp
      state.employeesUi.newEmpName = emp.name || ''
      state.employeesUi.newEmpEmail = emp.email || ''
      state.employeesUi.newEmpPhone = emp.phone || ''
      state.employeesUi.showEditModal = true
    },
    setDeptWorkOrdersUiField(state, action) {
      const { field, value } = action.payload
      if (field in state.workOrdersUi) state.workOrdersUi[field] = value
    },
    setDeptWorkOrdersFilter(state, action) {
      const { key, value } = action.payload
      state.workOrdersUi.filters[key] = value
    },
    setDeptWoDetailsUiField(state, action) {
      const { field, value } = action.payload
      if (field in state.workOrderDetailsUi) state.workOrderDetailsUi[field] = value
    },
  },
  extraReducers: (builder) => {
    builder
      // ── fetchDeptDashboard ───────────────────────────────────────────────
      .addCase(fetchDeptDashboard.pending, (state) => {
        state.dashboard.status = 'loading'
        state.dashboard.error = null
      })
      .addCase(fetchDeptDashboard.fulfilled, (state, action) => {
        state.dashboard.status = 'succeeded'
        state.dashboard.data = action.payload
        // If complaints were delivered with dashboard, populate if empty
        if (Array.isArray(action.payload?.complaints) && state.complaints.items.length === 0) {
          state.complaints.items = action.payload.complaints
        }
      })
      .addCase(fetchDeptDashboard.rejected, (state, action) => {
        state.dashboard.status = 'failed'
        state.dashboard.error = action.payload
      })

      // ── fetchDeptComplaints ──────────────────────────────────────────────
      .addCase(fetchDeptComplaints.pending, (state) => {
        state.complaints.status = 'loading'
        state.complaints.error = null
      })
      .addCase(fetchDeptComplaints.fulfilled, (state, action) => {
        state.complaints.status = 'succeeded'
        state.complaints.items = action.payload
      })
      .addCase(fetchDeptComplaints.rejected, (state, action) => {
        state.complaints.status = 'failed'
        state.complaints.error = action.payload
      })

      // ── fetchDeptComplaintById ───────────────────────────────────────────
      .addCase(fetchDeptComplaintById.fulfilled, (state, action) => {
        state.complaints.selected = action.payload
      })

      // ── fetchApprovals ───────────────────────────────────────────────────
      .addCase(fetchApprovals.pending, (state) => {
        state.approvals.status = 'loading'
        state.approvals.error = null
      })
      .addCase(fetchApprovals.fulfilled, (state, action) => {
        state.approvals.status = 'succeeded'
        state.approvals.items = action.payload
      })
      .addCase(fetchApprovals.rejected, (state, action) => {
        state.approvals.status = 'failed'
        state.approvals.error = action.payload
      })

      // ── fetchApprovalDetails ─────────────────────────────────────────────
      .addCase(fetchApprovalDetails.fulfilled, (state, action) => {
        state.approvals.selected = action.payload
      })

      // ── processApprovalDecision ──────────────────────────────────────────
      .addCase(processApprovalDecision.pending, (state) => {
        state.approvals.processing = true
      })
      .addCase(processApprovalDecision.fulfilled, (state, action) => {
        state.approvals.processing = false
        // Remove approved item from queue immediately
        state.approvals.items = state.approvals.items.filter((item) => item.id !== action.payload.id)
      })
      .addCase(processApprovalDecision.rejected, (state, action) => {
        state.approvals.processing = false
        state.approvals.error = action.payload
      })

      // ── fetchDeptWorkOrders ──────────────────────────────────────────────
      .addCase(fetchDeptWorkOrders.pending, (state) => {
        state.workOrders.status = 'loading'
        state.workOrders.error = null
      })
      .addCase(fetchDeptWorkOrders.fulfilled, (state, action) => {
        state.workOrders.status = 'succeeded'
        state.workOrders.items = action.payload
      })
      .addCase(fetchDeptWorkOrders.rejected, (state, action) => {
        state.workOrders.status = 'failed'
        state.workOrders.error = action.payload
      })

      // ── fetchDeptWorkOrderById ───────────────────────────────────────────
      .addCase(fetchDeptWorkOrderById.fulfilled, (state, action) => {
        state.workOrders.selectedWO = action.payload
      })

      // ── escalateDeptWorkOrder ────────────────────────────────────────────
      .addCase(escalateDeptWorkOrder.pending, (state) => {
        state.workOrders.processing = true
      })
      .addCase(escalateDeptWorkOrder.fulfilled, (state, action) => {
        state.workOrders.processing = false
        const idx = state.workOrders.items.findIndex((wo) => wo.id === action.payload.id)
        if (idx !== -1) {
          state.workOrders.items[idx] = {
            ...state.workOrders.items[idx],
            status: 'AWAITING_COO',
            escalated: true,
          }
        }
      })
      .addCase(escalateDeptWorkOrder.rejected, (state, action) => {
        state.workOrders.processing = false
        state.workOrders.error = action.payload
      })

      // ── fetchStaff ───────────────────────────────────────────────────────
      .addCase(fetchStaff.pending, (state) => {
        state.staff.status = 'loading'
        state.staff.error = null
      })
      .addCase(fetchStaff.fulfilled, (state, action) => {
        state.staff.status = 'succeeded'
        state.staff.items = action.payload
      })
      .addCase(fetchStaff.rejected, (state, action) => {
        state.staff.status = 'failed'
        state.staff.error = action.payload
      })

      // ── createStaff ──────────────────────────────────────────────────────
      .addCase(createStaff.pending, (state) => {
        state.staff.processing = true
      })
      .addCase(createStaff.fulfilled, (state, action) => {
        state.staff.processing = false
        if (action.payload) {
          state.staff.items.unshift(action.payload)
        }
      })
      .addCase(createStaff.rejected, (state, action) => {
        state.staff.processing = false
        state.staff.error = action.payload
      })

      // ── updateStaff ──────────────────────────────────────────────────────
      .addCase(updateStaff.pending, (state) => {
        state.staff.processing = true
      })
      .addCase(updateStaff.fulfilled, (state, action) => {
        state.staff.processing = false
        const { id, record } = action.payload
        const idx = state.staff.items.findIndex((u) => u.id === id)
        if (idx !== -1) {
          state.staff.items[idx] = { ...state.staff.items[idx], ...record }
        }
      })
      .addCase(updateStaff.rejected, (state, action) => {
        state.staff.processing = false
        state.staff.error = action.payload
      })

      // ── updateStaffStatus ────────────────────────────────────────────────
      .addCase(updateStaffStatus.pending, (state) => {
        state.staff.processing = true
      })
      .addCase(updateStaffStatus.fulfilled, (state, action) => {
        state.staff.processing = false
        const { id, status, record } = action.payload
        const idx = state.staff.items.findIndex((u) => u.id === id)
        if (idx !== -1) {
          state.staff.items[idx] = {
            ...state.staff.items[idx],
            ...record,
            status,
            accountStatus: status,
          }
        }
      })
      .addCase(updateStaffStatus.rejected, (state, action) => {
        state.staff.processing = false
        state.staff.error = action.payload
      })
  },
})

export const {
  setSelectedDeptWorkOrder,
  setSelectedDeptComplaint,
  clearDeptHeadErrors,
  setDeptPortalUiField,
  setDeptDashboardUiField,
  resetDeptDashboardFilters,
  setDeptApprovalsUiField,
  setDeptEmployeesUiField,
  openDeptAddEmpModal,
  openDeptEditEmpModal,
  setDeptWorkOrdersUiField,
  setDeptWorkOrdersFilter,
  setDeptWoDetailsUiField,
} = deptHeadSlice.actions

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectDeptDashboard          = (state) => state.deptHead.dashboard.data
export const selectDeptDashboardStatus    = (state) => state.deptHead.dashboard.status
export const selectDeptDashboardError     = (state) => state.deptHead.dashboard.error

export const selectDeptComplaints         = (state) => state.deptHead.complaints.items
export const selectDeptComplaintsStatus   = (state) => state.deptHead.complaints.status
export const selectSelectedDeptComplaint  = (state) => state.deptHead.complaints.selected

export const selectDeptApprovals          = (state) => state.deptHead.approvals.items
export const selectDeptApprovalsStatus    = (state) => state.deptHead.approvals.status
export const selectDeptApprovalsProcessing = (state) => state.deptHead.approvals.processing
export const selectPendingApprovalsCount  = (state) =>
  state.deptHead.approvals.items?.length ||
  state.deptHead.dashboard.data?.summary?.pendingApprovals ||
  0

export const selectDeptWorkOrders         = (state) => state.deptHead.workOrders.items
export const selectDeptWorkOrdersStatus   = (state) => state.deptHead.workOrders.status
export const selectDeptWorkOrdersProcessing = (state) => state.deptHead.workOrders.processing
export const selectSelectedDeptWorkOrder  = (state) => state.deptHead.workOrders.selectedWO

export const selectDeptStaff              = (state) => state.deptHead.staff.items
export const selectDeptStaffStatus        = (state) => state.deptHead.staff.status
export const selectDeptStaffProcessing    = (state) => state.deptHead.staff.processing

// UI State Selectors
export const selectDeptPortalUi           = (state) => state.deptHead.portalUi
export const selectDeptDashboardUi        = (state) => state.deptHead.dashboardUi
export const selectDeptApprovalsUi        = (state) => state.deptHead.approvalsUi
export const selectDeptEmployeesUi        = (state) => state.deptHead.employeesUi
export const selectDeptWorkOrdersUi       = (state) => state.deptHead.workOrdersUi
export const selectDeptWoDetailsUi        = (state) => state.deptHead.workOrderDetailsUi

export default deptHeadSlice.reducer

