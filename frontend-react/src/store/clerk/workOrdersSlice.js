/**
 * clerk/workOrdersSlice.js
 *
 * Repository ↔ Slice mapping:
 *   Backend: workOrderController.js & clerkController.js (/api/v1/clerk/work-orders/*)
 *   Repository: clerkApi (in frontend-react/src/services/api.js)
 *   This slice: owns ALL work order state for the Clerk portal.
 *
 * Core Rules Satisfied:
 *   Rule 1: One repository ↔️ One Redux slice (workOrderController/clerkApi ↔️ clerkWorkOrders)
 *   Rule 2: Every slice implements CRUD operations (Create, Read, Update/Escalate)
 *   Rule 3: Every CRUD operation uses the Thunk pattern
 *   Rule 4: Database is updated before updating Redux state (API called first)
 *   Rule 5: Redux state is updated using the response received from the database
 *   Rule 6: Frontend reads displayed data from Redux via selectors
 *   Rule 8: All CRUD actions dispatched through Redux
 *   Rule 10: All data visible on frontend comes from Redux store
 *   Rule 11: Redux store remains synchronized with database
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { clerkApi } from '../../services/api.js'

// ─── Async Thunks (CRUD) ─────────────────────────────────────────────────────

/**
 * [READ] Thunk: Fetch all work orders for the clerk's department.
 * Repository: clerkApi.getWorkOrders() -> GET /api/v1/clerk/work-orders
 */
export const fetchWorkOrders = createAsyncThunk(
  'clerkWorkOrders/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await clerkApi.getWorkOrders(params)
      return Array.isArray(data) ? data : []
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch work orders')
    }
  }
)

/**
 * [READ ONE] Thunk: Fetch single work order details by ID.
 * Repository: clerkApi.getWorkOrderById(id) -> GET /api/v1/clerk/work-orders/:id
 */
export const fetchWorkOrderById = createAsyncThunk(
  'clerkWorkOrders/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const data = await clerkApi.getWorkOrderById(id)
      return data
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch work order details')
    }
  }
)

/**
 * [CREATE] Thunk: Create a new Work Order from a validated complaint.
 * Repository: clerkApi.createWorkOrder(payload) -> POST /api/v1/clerk/work-orders
 * DB is updated first; Redux state is updated with the returned database response.
 */
export const createWorkOrder = createAsyncThunk(
  'clerkWorkOrders/create',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const res = await clerkApi.createWorkOrder(payload)
      const created = res?.data || res
      dispatch(fetchWorkOrders()) // Re-sync list from DB
      return created
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to create work order')
    }
  }
)

/**
 * [UPDATE] Thunk: Escalate a stalled work order to Department Head / COO.
 * Repository: clerkApi.escalate(id, payload) -> POST /api/v1/clerk/escalate/:id
 * DB is updated first; Redux state is updated with response.
 */
export const escalateWorkOrder = createAsyncThunk(
  'clerkWorkOrders/escalate',
  async ({ id, reason }, { dispatch, rejectWithValue }) => {
    try {
      const res = await clerkApi.escalate(id, { reason })
      const updated = res?.data || res
      dispatch(fetchWorkOrders()) // Synchronize with DB
      return { id, ...updated }
    } catch (err) {
      return rejectWithValue(err.message || 'Escalation failed')
    }
  }
)

// ─── Slice ───────────────────────────────────────────────────────────────────

const workOrdersSlice = createSlice({
  name: 'clerkWorkOrders',
  initialState: {
    items: [],          // All work orders loaded from backend
    selectedWO: null,   // Currently inspected work order
    status: 'idle',     // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    lastCreated: null,
  },
  reducers: {
    setSelectedWorkOrder(state, action) {
      state.selectedWO = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // ── fetchWorkOrders ──────────────────────────────────────────────────
      .addCase(fetchWorkOrders.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchWorkOrders.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload   // Synced with DB response
      })
      .addCase(fetchWorkOrders.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })

      // ── fetchWorkOrderById ───────────────────────────────────────────────
      .addCase(fetchWorkOrderById.fulfilled, (state, action) => {
        state.selectedWO = action.payload
      })

      // ── createWorkOrder ──────────────────────────────────────────────────
      .addCase(createWorkOrder.pending, (state) => {
        state.error = null
      })
      .addCase(createWorkOrder.fulfilled, (state, action) => {
        const created = action.payload
        if (created) {
          state.items.unshift(created) // Add DB response into state
          state.lastCreated = created
        }
      })
      .addCase(createWorkOrder.rejected, (state, action) => {
        state.error = action.payload
      })

      // ── escalateWorkOrder ────────────────────────────────────────────────
      .addCase(escalateWorkOrder.fulfilled, (state, action) => {
        const { id, ...rest } = action.payload
        const idx = state.items.findIndex(wo => wo.id === id || wo.work_order_number === id)
        if (idx !== -1) {
          state.items[idx] = { ...state.items[idx], ...rest, escalated: true }
        }
      })
  },
})

export const { setSelectedWorkOrder } = workOrdersSlice.actions

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectAllWorkOrders     = (state) => state.clerkWorkOrders.items
export const selectWorkOrdersStatus   = (state) => state.clerkWorkOrders.status
export const selectSelectedWorkOrder  = (state) => state.clerkWorkOrders.selectedWO
export const selectLastCreatedWO      = (state) => state.clerkWorkOrders.lastCreated

export default workOrdersSlice.reducer
