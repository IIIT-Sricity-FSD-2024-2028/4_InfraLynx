/**
 * clerk/workOrdersSlice.js
 *
 * Repository ↔ Slice mapping:
 *   Backend: workOrderController.js  (create, fetch work orders)
 *   Repository function: clerkApi.createWorkOrder(), clerkApi.getWorkOrders()
 *   This slice: owns ALL work order state for the Clerk portal.
 *
 * Thunk pattern:
 *   1. Thunk calls the repository (api.js function)
 *   2. DB is updated first (via backend API call)
 *   3. Redux state is updated using the response returned from the DB
 *   4. Components read from Redux via useSelector — never fetch independently
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { clerkApi } from '../../services/api.js'

// ─── Async Thunks ────────────────────────────────────────────────────────────

/**
 * Thunk: Fetch all work orders for the clerk's department.
 * Repository: clerkApi.getWorkOrders()
 * Called by ClerkTracker on mount to populate the tracker view.
 */
export const fetchWorkOrders = createAsyncThunk(
  'clerkWorkOrders/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await clerkApi.getWorkOrders(params)
      return Array.isArray(data) ? data : []
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

/**
 * Thunk: Create a new Work Order from a validated complaint.
 * Repository: clerkApi.createWorkOrder(payload)
 * DB is updated first; Redux state is updated with the response.
 * Also dispatches fetchWorkOrders to sync the full list after creation.
 */
export const createWorkOrder = createAsyncThunk(
  'clerkWorkOrders/create',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const res = await clerkApi.createWorkOrder(payload)
      const created = res?.data || res
      // Re-sync the work orders list from DB after creation
      dispatch(fetchWorkOrders())
      return created
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

// ─── Slice ───────────────────────────────────────────────────────────────────

const workOrdersSlice = createSlice({
  name: 'clerkWorkOrders',
  initialState: {
    items: [],          // All work orders for this clerk's department
    status: 'idle',     // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,        // Error message string if any operation fails
    lastCreated: null,  // Most recently created work order (for success notice)
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // ── fetchWorkOrders ──────────────────────────────────────────────────
      .addCase(fetchWorkOrders.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchWorkOrders.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload   // Replace store with fresh DB data
      })
      .addCase(fetchWorkOrders.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })

      // ── createWorkOrder ──────────────────────────────────────────────────
      .addCase(createWorkOrder.pending, (state) => {
        state.error = null
      })
      .addCase(createWorkOrder.fulfilled, (state, action) => {
        // DB response is the source of truth — add to store from response
        const created = action.payload
        if (created) {
          state.items.unshift(created)  // Prepend newest WO
          state.lastCreated = created
        }
      })
      .addCase(createWorkOrder.rejected, (state, action) => {
        state.error = action.payload
      })
  },
})

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectAllWorkOrders   = (state) => state.clerkWorkOrders.items
export const selectWorkOrdersStatus = (state) => state.clerkWorkOrders.status
export const selectLastCreatedWO    = (state) => state.clerkWorkOrders.lastCreated

export default workOrdersSlice.reducer
