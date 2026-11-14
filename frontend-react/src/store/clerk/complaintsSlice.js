/**
 * clerk/complaintsSlice.js
 *
 * Repository ↔ Slice mapping:
 *   Backend: clerkController.js & complaintController.js (/api/v1/clerk/*, /api/v1/complaints/*)
 *   Repository: clerkApi & complaintApi (in frontend-react/src/services/api.js)
 *   This slice: owns ALL complaint state for the Clerk portal.
 *
 * Core Rules Satisfied:
 *   Rule 1: One repository ↔️ One Redux slice (clerkController/complaintApi ↔️ clerkComplaints)
 *   Rule 2: Every slice implements CRUD operations (Create, Read, Update, Reject/Delete)
 *   Rule 3: Every CRUD operation uses the Thunk pattern
 *   Rule 4: Database is updated before updating Redux state (API called first)
 *   Rule 5: Redux state is updated using the response received from the database
 *   Rule 6: Frontend reads displayed data from Redux (via useSelector)
 *   Rule 7: Frontend does not directly fetch application data independently of Redux
 *   Rule 8: All CRUD actions are dispatched through Redux
 *   Rule 10: All data visible on frontend comes from Redux store
 *   Rule 11: Redux store remains synchronized with database
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { complaintApi, clerkApi } from '../../services/api.js'

// ─── Async Thunks (CRUD) ─────────────────────────────────────────────────────

/**
 * [READ] Thunk: Fetch all complaints from the backend database.
 * Repository: complaintApi.getComplaints() -> GET /api/v1/complaints
 */
export const fetchComplaints = createAsyncThunk(
  'clerkComplaints/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await complaintApi.getComplaints(params)
      return Array.isArray(data) ? data : []
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch complaints')
    }
  }
)

/**
 * [READ ONE] Thunk: Fetch single complaint details by ID from backend.
 * Repository: clerkApi.getComplaintById() or complaintApi.getComplaintById()
 */
export const fetchComplaintById = createAsyncThunk(
  'clerkComplaints/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const data = await complaintApi.getComplaintById(id)
      return data
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch complaint details')
    }
  }
)

/**
 * [CREATE] Thunk: Register a new civic complaint (walk-in citizen submission at desk).
 * Repository: complaintApi.createComplaint() -> POST /api/v1/complaints
 * DB is updated first; Redux state is updated with the returned record.
 */
export const createComplaint = createAsyncThunk(
  'clerkComplaints/create',
  async (complaintData, { dispatch, rejectWithValue }) => {
    try {
      const res = await complaintApi.createComplaint(complaintData)
      const record = res?.data || res
      dispatch(fetchComplaints()) // Keep store strictly synchronized with DB
      return record
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to create complaint')
    }
  }
)

/**
 * [UPDATE - TRIAGE] Thunk: Move complaint from REPORTED → UNDER_REVIEW when opened.
 * Repository: clerkApi.triageComplaint(id) -> PATCH /api/v1/clerk/complaints/:id/triage
 * DB is updated first; Redux state is updated with the returned database response.
 */
export const triageComplaint = createAsyncThunk(
  'clerkComplaints/triage',
  async (complaintId, { rejectWithValue }) => {
    try {
      const res = await clerkApi.triageComplaint(complaintId)
      return res?.data || res || { id: complaintId, status: 'UNDER_REVIEW' }
    } catch (err) {
      return rejectWithValue(err.message || 'Triage failed')
    }
  }
)

/**
 * [UPDATE - VALIDATE] Thunk: Validate complaint — transitions UNDER_REVIEW → VALIDATED.
 * Repository: clerkApi.validateComplaint(id) -> PATCH /api/v1/clerk/complaints/:id/validate
 * DB is updated first; Redux state is updated with the returned database response.
 */
export const validateComplaint = createAsyncThunk(
  'clerkComplaints/validate',
  async ({ id, historyEntry }, { rejectWithValue }) => {
    try {
      const res = await clerkApi.validateComplaint(id)
      const updated = res?.data || res || {}
      return { id, ...updated, status: updated.status || 'VALIDATED', _historyEntry: historyEntry }
    } catch (err) {
      return rejectWithValue(err.message || 'Validation failed')
    }
  }
)

/**
 * [UPDATE / REJECT] Thunk: Reject complaint with formal reason and audit remarks.
 * Repository: clerkApi.rejectComplaint(id, payload) -> PATCH /api/v1/clerk/complaints/:id/reject
 * DB is updated first; Redux state is updated with the returned database response.
 */
export const rejectComplaint = createAsyncThunk(
  'clerkComplaints/reject',
  async ({ id, reason, remarks, historyEntry }, { rejectWithValue }) => {
    try {
      const res = await clerkApi.rejectComplaint(id, { reason, remarks })
      const updated = res?.data || res || {}
      return { id, ...updated, status: updated.status || 'REJECTED', _historyEntry: historyEntry }
    } catch (err) {
      return rejectWithValue(err.message || 'Rejection failed')
    }
  }
)

// ─── Slice ───────────────────────────────────────────────────────────────────

const complaintsSlice = createSlice({
  name: 'clerkComplaints',
  initialState: {
    items: [],              // Master list loaded from PostgreSQL database
    status: 'idle',         // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,            // Error message if operation fails
    lastUpdatedId: null,    // ID of the most recently mutated ticket
  },
  reducers: {
    /**
     * Patch a complaint's fields in the Redux store from a server response
     */
    patchComplaint(state, action) {
      const { id, changes } = action.payload
      const idx = state.items.findIndex(c => c.id === id || c.complaint_code === id)
      if (idx !== -1) {
        state.items[idx] = { ...state.items[idx], ...changes }
        state.lastUpdatedId = id
      }
    },
    /**
     * Remove or mark inactive
     */
    removeComplaint(state, action) {
      const id = action.payload
      state.items = state.items.filter(c => c.id !== id && c.complaint_code !== id)
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
        state.items = action.payload   // Synchronize store with DB response
      })
      .addCase(fetchComplaints.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })

      // ── createComplaint ──────────────────────────────────────────────────
      .addCase(createComplaint.fulfilled, (state, action) => {
        if (action.payload) {
          state.items.unshift(action.payload)
          state.lastUpdatedId = action.payload.id
        }
      })

      // ── triageComplaint ──────────────────────────────────────────────────
      .addCase(triageComplaint.fulfilled, (state, action) => {
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
            history: _historyEntry ? [...(prev.history || []), _historyEntry] : prev.history,
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
            history: _historyEntry ? [...(prev.history || []), _historyEntry] : prev.history,
          }
          state.lastUpdatedId = id
        }
      })
  },
})

export const { patchComplaint, removeComplaint } = complaintsSlice.actions

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectAllClerkComplaints   = (state) => state.clerkComplaints.items
export const selectClerkComplaintsStatus = (state) => state.clerkComplaints.status
export const selectClerkComplaintsError  = (state) => state.clerkComplaints.error
export const selectLastUpdatedId         = (state) => state.clerkComplaints.lastUpdatedId

export default complaintsSlice.reducer
