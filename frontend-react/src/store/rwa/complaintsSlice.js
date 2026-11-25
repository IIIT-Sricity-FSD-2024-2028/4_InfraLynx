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

export const updateComplaint = createAsyncThunk(
  'complaints/update',
  async ({ id, payload }, { dispatch, rejectWithValue }) => {
    try {
      const res = await complaintApi.updateComplaint(id, payload)
      const updated = res?.data || res
      dispatch(fetchComplaints())
      return updated
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

export const cancelComplaint = createAsyncThunk(
  'complaints/cancel',
  async ({ id, payload }, { dispatch, rejectWithValue }) => {
    try {
      const res = await complaintApi.cancelComplaint(id, payload)
      const cancelled = res?.data || res
      dispatch(fetchComplaints())
      return cancelled
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
    // Update complaint in Redux after a successful DB response from verificationSlice
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
      // updateComplaint
      .addCase(updateComplaint.fulfilled, (state, action) => {
        const updated = action.payload
        if (!updated?.id) return
        const idx = state.items.findIndex(
          (c) => c.id === updated.id || c.complaint_code === updated.id
        )
        if (idx !== -1) {
          state.items[idx] = { ...state.items[idx], ...updated }
        }
      })
      // cancelComplaint
      .addCase(cancelComplaint.fulfilled, (state, action) => {
        const cancelled = action.payload
        if (!cancelled?.id) return
        const idx = state.items.findIndex(
          (c) => c.id === cancelled.id || c.complaint_code === cancelled.id
        )
        if (idx !== -1) {
          state.items[idx] = { ...state.items[idx], ...cancelled }
        }
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
