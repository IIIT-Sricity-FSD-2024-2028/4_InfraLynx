import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { complaintApi } from '../../services/api.js'
import { updateComplaintStatus } from './complaintsSlice.js'

// ─── Async Thunk ─────────────────────────────────────────────────────────────

export const confirmFix = createAsyncThunk(
  'verification/confirmFix',
  async ({ id, payload }, { dispatch, rejectWithValue }) => {
    try {
      const updated = await complaintApi.verifyComplaint(id, payload)
      const resolved = updated?.data || updated
      // Optimistically update the complaint in complaintsSlice
      dispatch(
        updateComplaintStatus({
          id,
          changes: { ...resolved, status: 'CLOSED' },
        })
      )
      return { id, resolved }
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

// ─── Slice ───────────────────────────────────────────────────────────────────

const verificationSlice = createSlice({
  name: 'verification',
  initialState: {
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    lastVerifiedId: null,
    error: null,
  },
  reducers: {
    resetVerification(state) {
      state.status = 'idle'
      state.lastVerifiedId = null
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(confirmFix.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(confirmFix.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.lastVerifiedId = action.payload.id
      })
      .addCase(confirmFix.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
  },
})

export const { resetVerification } = verificationSlice.actions

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectVerificationStatus = (state) => state.verification.status
export const selectLastVerifiedId = (state) => state.verification.lastVerifiedId
export const selectVerificationError = (state) => state.verification.error

export default verificationSlice.reducer
