// Redux slice for Township COO portal — maps 1-to-1 to cooApi
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { cooApi } from '../../services/api.js'

// Fetch COO executive dashboard summary
export const fetchCooDashboard = createAsyncThunk(
  'coo/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try { return await cooApi.getDashboard() }
    catch (err) { return rejectWithValue(err.message || 'Failed to fetch dashboard') }
  }
)

// Fetch all municipal departments
export const fetchCooDepartments = createAsyncThunk(
  'coo/fetchDepartments',
  async (_, { rejectWithValue }) => {
    try { return await cooApi.getDepartments() }
    catch (err) { return rejectWithValue(err.message || 'Failed to fetch departments') }
  }
)

// Update a department's metadata (name, code, budget, description)
export const updateCooDepartment = createAsyncThunk(
  'coo/updateDepartment',
  async ({ id, payload }, { dispatch, rejectWithValue }) => {
    try {
      const result = await cooApi.updateDepartment(id, payload)
      dispatch(fetchCooDepartments())
      return result
    } catch (err) { return rejectWithValue(err.message || 'Failed to update department') }
  }
)

// Assign a department head to a department
export const assignDeptHead = createAsyncThunk(
  'coo/assignDeptHead',
  async ({ deptId, headId }, { dispatch, rejectWithValue }) => {
    try {
      const result = await cooApi.assignDepartmentHead(deptId, headId)
      dispatch(fetchCooDepartments())
      return result
    } catch (err) { return rejectWithValue(err.message || 'Failed to assign department head') }
  }
)

// Fetch all department heads
export const fetchCooDeptHeads = createAsyncThunk(
  'coo/fetchDeptHeads',
  async (_, { rejectWithValue }) => {
    try { return await cooApi.getDepartmentHeads() }
    catch (err) { return rejectWithValue(err.message || 'Failed to fetch department heads') }
  }
)

// Create a new department head account
export const createCooDeptHead = createAsyncThunk(
  'coo/createDeptHead',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const result = await cooApi.createDepartmentHead(payload)
      dispatch(fetchCooDeptHeads())
      dispatch(fetchCooDepartments())
      return result
    } catch (err) { return rejectWithValue(err.message || 'Failed to create department head') }
  }
)

// Unassign a department head from their department
export const unassignCooDeptHead = createAsyncThunk(
  'coo/unassignDeptHead',
  async (headId, { dispatch, rejectWithValue }) => {
    try {
      const result = await cooApi.unassignDepartmentHead(headId)
      dispatch(fetchCooDeptHeads())
      dispatch(fetchCooDepartments())
      return result
    } catch (err) { return rejectWithValue(err.message || 'Failed to unassign department head') }
  }
)

// Fetch staff roster for a specific department
export const fetchCooDeptStaff = createAsyncThunk(
  'coo/fetchDeptStaff',
  async (deptId, { rejectWithValue }) => {
    try { return await cooApi.getDepartmentStaff(deptId) }
    catch (err) { return rejectWithValue(err.message || 'Failed to fetch department staff') }
  }
)

// Fetch township-wide work orders (supports filter params)
export const fetchCooWorkOrders = createAsyncThunk(
  'coo/fetchWorkOrders',
  async (params, { rejectWithValue }) => {
    try { return await cooApi.getWorkOrders(params) }
    catch (err) { return rejectWithValue(err.message || 'Failed to fetch work orders') }
  }
)

// Fetch a single work order by ID
export const fetchCooWorkOrderById = createAsyncThunk(
  'coo/fetchWorkOrderById',
  async (id, { rejectWithValue }) => {
    try { return await cooApi.getWorkOrderById(id) }
    catch (err) { return rejectWithValue(err.message || 'Failed to fetch work order') }
  }
)

// Escalate a work order to emergency priority
export const escalateCooWorkOrder = createAsyncThunk(
  'coo/escalateWorkOrder',
  async ({ id, payload }, { dispatch, rejectWithValue }) => {
    try {
      const result = await cooApi.escalateWorkOrder(id, payload)
      dispatch(fetchCooWorkOrders())
      return result
    } catch (err) { return rejectWithValue(err.message || 'Failed to escalate work order') }
  }
)

// Fetch all pending COO approvals
export const fetchCooApprovals = createAsyncThunk(
  'coo/fetchApprovals',
  async (_, { rejectWithValue }) => {
    try { return await cooApi.getApprovals() }
    catch (err) { return rejectWithValue(err.message || 'Failed to fetch approvals') }
  }
)

// Process (approve/reject) a COO approval
export const processCooApproval = createAsyncThunk(
  'coo/processApproval',
  async ({ id, payload }, { dispatch, rejectWithValue }) => {
    try {
      const result = await cooApi.processApproval(id, payload)
      dispatch(fetchCooApprovals())
      return result
    } catch (err) { return rejectWithValue(err.message || 'Failed to process approval') }
  }
)

const cooSlice = createSlice({
  name: 'coo',
  initialState: {
    dashboard: null,
    departments: [],
    departmentHeads: [],
    departmentStaff: [],
    workOrders: [],
    selectedWorkOrder: null,
    approvals: [],
    status: 'idle',
    actionStatus: 'idle',
    error: null,
    actionError: null,
    notice: null,
  },
  reducers: {
    // Set work order for details modal
    setSelectedWorkOrder(state, action) {
      state.selectedWorkOrder = action.payload
    },
    // Clear selected work order when modal closes
    clearSelectedWorkOrder(state) {
      state.selectedWorkOrder = null
    },
    // Dismiss the success notice banner
    clearCooNotice(state) {
      state.notice = null
    },
  },
  extraReducers: (builder) => {
    // fetchCooDashboard
    builder
      .addCase(fetchCooDashboard.pending, (state) => { state.status = 'loading' })
      .addCase(fetchCooDashboard.fulfilled, (state, action) => {
        state.status = 'idle'
        state.dashboard = action.payload
      })
      .addCase(fetchCooDashboard.rejected, (state, action) => {
        state.status = 'idle'
        state.error = action.payload
      })

    // fetchCooDepartments
    builder
      .addCase(fetchCooDepartments.pending, (state) => { state.status = 'loading' })
      .addCase(fetchCooDepartments.fulfilled, (state, action) => {
        state.status = 'idle'
        state.departments = action.payload
      })
      .addCase(fetchCooDepartments.rejected, (state, action) => {
        state.status = 'idle'
        state.error = action.payload
      })

    // updateCooDepartment
    builder
      .addCase(updateCooDepartment.pending, (state) => { state.actionStatus = 'loading' })
      .addCase(updateCooDepartment.fulfilled, (state) => {
        state.actionStatus = 'idle'
        state.notice = 'Department updated successfully.'
      })
      .addCase(updateCooDepartment.rejected, (state, action) => {
        state.actionStatus = 'idle'
        state.actionError = action.payload
      })

    // assignDeptHead
    builder
      .addCase(assignDeptHead.pending, (state) => { state.actionStatus = 'loading' })
      .addCase(assignDeptHead.fulfilled, (state) => {
        state.actionStatus = 'idle'
        state.notice = 'Department head assigned successfully.'
      })
      .addCase(assignDeptHead.rejected, (state, action) => {
        state.actionStatus = 'idle'
        state.actionError = action.payload
      })

    // fetchCooDeptHeads
    builder
      .addCase(fetchCooDeptHeads.pending, (state) => { state.status = 'loading' })
      .addCase(fetchCooDeptHeads.fulfilled, (state, action) => {
        state.status = 'idle'
        state.departmentHeads = action.payload
      })
      .addCase(fetchCooDeptHeads.rejected, (state, action) => {
        state.status = 'idle'
        state.error = action.payload
      })

    // createCooDeptHead
    builder
      .addCase(createCooDeptHead.pending, (state) => { state.actionStatus = 'loading' })
      .addCase(createCooDeptHead.fulfilled, (state) => {
        state.actionStatus = 'idle'
        state.notice = 'Department head created successfully.'
      })
      .addCase(createCooDeptHead.rejected, (state, action) => {
        state.actionStatus = 'idle'
        state.actionError = action.payload
      })

    // unassignCooDeptHead
    builder
      .addCase(unassignCooDeptHead.pending, (state) => { state.actionStatus = 'loading' })
      .addCase(unassignCooDeptHead.fulfilled, (state) => {
        state.actionStatus = 'idle'
        state.notice = 'Department head unassigned successfully.'
      })
      .addCase(unassignCooDeptHead.rejected, (state, action) => {
        state.actionStatus = 'idle'
        state.actionError = action.payload
      })

    // fetchCooDeptStaff
    builder
      .addCase(fetchCooDeptStaff.pending, (state) => { state.status = 'loading' })
      .addCase(fetchCooDeptStaff.fulfilled, (state, action) => {
        state.status = 'idle'
        state.departmentStaff = action.payload
      })
      .addCase(fetchCooDeptStaff.rejected, (state, action) => {
        state.status = 'idle'
        state.error = action.payload
      })

    // fetchCooWorkOrders
    builder
      .addCase(fetchCooWorkOrders.pending, (state) => { state.status = 'loading' })
      .addCase(fetchCooWorkOrders.fulfilled, (state, action) => {
        state.status = 'idle'
        state.workOrders = action.payload
      })
      .addCase(fetchCooWorkOrders.rejected, (state, action) => {
        state.status = 'idle'
        state.error = action.payload
      })

    // fetchCooWorkOrderById
    builder
      .addCase(fetchCooWorkOrderById.pending, (state) => { state.status = 'loading' })
      .addCase(fetchCooWorkOrderById.fulfilled, (state, action) => {
        state.status = 'idle'
        state.selectedWorkOrder = action.payload
      })
      .addCase(fetchCooWorkOrderById.rejected, (state, action) => {
        state.status = 'idle'
        state.error = action.payload
      })

    // escalateCooWorkOrder
    builder
      .addCase(escalateCooWorkOrder.pending, (state) => { state.actionStatus = 'loading' })
      .addCase(escalateCooWorkOrder.fulfilled, (state) => {
        state.actionStatus = 'idle'
        state.notice = 'Work order escalated successfully.'
      })
      .addCase(escalateCooWorkOrder.rejected, (state, action) => {
        state.actionStatus = 'idle'
        state.actionError = action.payload
      })

    // fetchCooApprovals
    builder
      .addCase(fetchCooApprovals.pending, (state) => { state.status = 'loading' })
      .addCase(fetchCooApprovals.fulfilled, (state, action) => {
        state.status = 'idle'
        state.approvals = action.payload
      })
      .addCase(fetchCooApprovals.rejected, (state, action) => {
        state.status = 'idle'
        state.error = action.payload
      })

    // processCooApproval
    builder
      .addCase(processCooApproval.pending, (state) => { state.actionStatus = 'loading' })
      .addCase(processCooApproval.fulfilled, (state) => {
        state.actionStatus = 'idle'
        state.notice = 'Approval processed successfully.'
      })
      .addCase(processCooApproval.rejected, (state, action) => {
        state.actionStatus = 'idle'
        state.actionError = action.payload
      })
  },
})

export const { setSelectedWorkOrder, clearSelectedWorkOrder, clearCooNotice } = cooSlice.actions

// Selectors — all use optional chaining + safe fallback
export const selectCooDashboard         = (state) => state.coo?.dashboard || null
export const selectCooDepartments       = (state) => state.coo?.departments || []
export const selectCooDeptHeads         = (state) => state.coo?.departmentHeads || []
export const selectCooDeptStaff         = (state) => state.coo?.departmentStaff || []
export const selectCooWorkOrders        = (state) => state.coo?.workOrders || []
export const selectCooSelectedWorkOrder = (state) => state.coo?.selectedWorkOrder || null
export const selectCooApprovals         = (state) => state.coo?.approvals || []
export const selectCooStatus            = (state) => state.coo?.status || 'idle'
export const selectCooActionStatus      = (state) => state.coo?.actionStatus || 'idle'
export const selectCooNotice            = (state) => state.coo?.notice || null

export default cooSlice.reducer
