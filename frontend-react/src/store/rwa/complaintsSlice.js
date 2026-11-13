import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { complaintApi } from '../../services/api.js'

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const fetchComplaints = createAsyncThunk(
  'complaints/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const data = await complaintApi.getComplaints()
      return Array.isArray(data) ? data : []
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

export const submitComplaint = createAsyncThunk(
  'complaints/submit',
  async (formData, { dispatch, rejectWithValue }) => {
    try {
      const created = await complaintApi.createComplaint(formData)
      const newRecord = created?.data || created
      // Re-fetch to get the full updated list from server
      dispatch(fetchComplaints())
      return newRecord
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

// ─── Slice ───────────────────────────────────────────────────────────────────

const complaintsSlice = createSlice({
  name: 'complaints',
  initialState: {
    items: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {
    // Allow optimistic update from verificationSlice
    updateComplaintStatus(state, action) {
      const { id, changes } = action.payload
      const idx = state.items.findIndex(
        (c) => c.id === id || c.complaint_code === id
      )
      if (idx !== -1) {
        state.items[idx] = { ...state.items[idx], ...changes }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchComplaints
      .addCase(fetchComplaints.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchComplaints.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(fetchComplaints.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
  },
})

export const { updateComplaintStatus } = complaintsSlice.actions

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectAllComplaints = (state) => state.complaints.items
export const selectComplaintsStatus = (state) => state.complaints.status
export const selectComplaintsError = (state) => state.complaints.error
export const selectPendingVerificationCount = (state) =>
  state.complaints.items.filter((c) =>
    ['PENDING_VERIFICATION', 'COMPLETED', 'WORK_COMPLETED'].includes(
      (c.status || '').toUpperCase().replace(/[\s_-]+/g, '_')
    )
  ).length

export default complaintsSlice.reducer
