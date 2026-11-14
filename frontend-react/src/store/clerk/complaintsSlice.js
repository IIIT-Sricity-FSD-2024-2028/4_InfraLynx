/**
 * clerk/complaintsSlice.js
 *
 * Repository ↔ Slice mapping:
 *   Backend: clerkController.js  (triage, validate, reject)
 *   Backend: complaintApi        (getComplaints - shared read endpoint)
 *   This slice: owns ALL complaint state for the Clerk portal.
 *
 * Thunk pattern:
 *   1. Thunk calls the repository (api.js function)
 *   2. DB is updated first (via backend API call)
 *   3. Redux state is updated using the response returned from the DB
 *   4. Components read from Redux via useSelector — never fetch independently
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { complaintApi, clerkApi } from '../../services/api.js'

// ─── Async Thunks ────────────────────────────────────────────────────────────

/**
 * Thunk: Fetch all complaints from the backend.
 * Repository: complaintApi.getComplaints()
 * Called by ClerkPortal on mount and on screen change.
 */
export const fetchComplaints = createAsyncThunk(
  'clerkComplaints/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const data = await complaintApi.getComplaints()
      return Array.isArray(data) ? data : []
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

/**
 * Thunk: Move complaint from REPORTED → UNDER_REVIEW when clerk opens it.
 * Repository: clerkApi.triageComplaint(id)
 * DB is updated first; Redux state is updated with the response.
 */
export const triageComplaint = createAsyncThunk(
  'clerkComplaints/triage',
  async (complaintId, { rejectWithValue }) => {
    try {
      const res = await clerkApi.triageComplaint(complaintId)
      // Return the updated complaint from DB response
      return res?.data || res || { id: complaintId, status: 'UNDER_REVIEW' }
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

/**
 * Thunk: Validate a complaint — transitions UNDER_REVIEW → VALIDATED.
 * Repository: clerkApi.validateComplaint(id)
 * DB is updated first; Redux state is updated with the response.
 */
export const validateComplaint = createAsyncThunk(
  'clerkComplaints/validate',
  async ({ id, historyEntry }, { rejectWithValue }) => {
    try {
      const res = await clerkApi.validateComplaint(id)
      const updated = res?.data || res || {}
      // Merge the history entry added by the clerk UI
      return { id, ...updated, status: updated.status || 'VALIDATED', _historyEntry: historyEntry }
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

/**
 * Thunk: Reject a complaint — transitions UNDER_REVIEW → REJECTED.
 * Repository: clerkApi.rejectComplaint(id, payload)
 * DB is updated first; Redux state is updated with the response.
 */
export const rejectComplaint = createAsyncThunk(
  'clerkComplaints/reject',
  async ({ id, reason, remarks, historyEntry }, { rejectWithValue }) => {
    try {
      const res = await clerkApi.rejectComplaint(id, { reason, remarks })
      const updated = res?.data || res || {}
      return { id, ...updated, status: updated.status || 'REJECTED', _historyEntry: historyEntry }
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

// ─── Slice ───────────────────────────────────────────────────────────────────

const complaintsSlice = createSlice({
  name: 'clerkComplaints',
  initialState: {
    items: [],              // All complaints loaded from backend
    status: 'idle',         // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,            // Error message string if fetch fails
    lastUpdatedId: null,    // ID of the most recently mutated complaint (for UI feedback)
  },
  reducers: {
    /**
     * Synchronously update a single complaint's fields in Redux state.
     * Used by WorkOrderCreate after a work order is dispatched, to reflect
     * the new status locally without waiting for a full refetch.
     */
    patchComplaint(state, action) {
      const { id, changes } = action.payload
      const idx = state.items.findIndex(c => c.id === id || c.complaint_code === id)
      if (idx !== -1) {
        state.items[idx] = { ...state.items[idx], ...changes }
        state.lastUpdatedId = id
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // ── fetchComplaints ──────────────────────────────────────────────────
      .addCase(fetchComplaints.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchComplaints.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload   // Replace store with fresh DB data
      })
      .addCase(fetchComplaints.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })

      // ── triageComplaint ──────────────────────────────────────────────────
      .addCase(triageComplaint.fulfilled, (state, action) => {
        // Update state using DB response — do not assume the new status
        const updated = action.payload
        const idx = state.items.findIndex(c => c.id === updated.id || c.complaint_code === updated.id)
        if (idx !== -1) {
          state.items[idx] = { ...state.items[idx], ...updated }
          state.lastUpdatedId = updated.id
        }
      })

      // ── validateComplaint ────────────────────────────────────────────────
      .addCase(validateComplaint.fulfilled, (state, action) => {
        const { id, _historyEntry, ...rest } = action.payload
        const idx = state.items.findIndex(c => c.id === id || c.complaint_code === id)
        if (idx !== -1) {
          const prev = state.items[idx]
          state.items[idx] = {
            ...prev,
            ...rest,
            // Append clerk history entry to existing audit trail
            history: _historyEntry
              ? [...(prev.history || []), _historyEntry]
              : prev.history,
          }
          state.lastUpdatedId = id
        }
      })

      // ── rejectComplaint ──────────────────────────────────────────────────
      .addCase(rejectComplaint.fulfilled, (state, action) => {
        const { id, _historyEntry, ...rest } = action.payload
        const idx = state.items.findIndex(c => c.id === id || c.complaint_code === id)
        if (idx !== -1) {
          const prev = state.items[idx]
          state.items[idx] = {
            ...prev,
            ...rest,
            history: _historyEntry
              ? [...(prev.history || []), _historyEntry]
              : prev.history,
          }
          state.lastUpdatedId = id
        }
      })
  },
})

export const { patchComplaint } = complaintsSlice.actions

// ─── Selectors ───────────────────────────────────────────────────────────────
// Components import and use these selectors with useSelector() — never raw state

export const selectAllClerkComplaints  = (state) => state.clerkComplaints.items
export const selectClerkComplaintsStatus = (state) => state.clerkComplaints.status
export const selectClerkComplaintsError  = (state) => state.clerkComplaints.error
export const selectLastUpdatedId         = (state) => state.clerkComplaints.lastUpdatedId

export default complaintsSlice.reducer
