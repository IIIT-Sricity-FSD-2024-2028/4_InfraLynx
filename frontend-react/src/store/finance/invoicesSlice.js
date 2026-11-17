// Redux slice for Finance invoices (financeApi)
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { financeApi } from '../../services/api.js'

// Fetch all invoices
export const fetchInvoices = createAsyncThunk(
  'financeInvoices/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await financeApi.getInvoices(params)
      return Array.isArray(data) ? data : []
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch invoices')
    }
  }
)

// Fetch single invoice by ID
export const fetchInvoiceById = createAsyncThunk(
  'financeInvoices/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const data = await financeApi.getInvoiceById(id)
      return data
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch invoice')
    }
  }
)

// Fetch 3-way reconciliation check
export const fetch3WayCheck = createAsyncThunk(
  'financeInvoices/fetch3WayCheck',
  async (id, { rejectWithValue }) => {
    try {
      const data = await financeApi.get3WayCheck(id)
      return data
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch 3-way check')
    }
  }
)

// Authorize an invoice for payment release
export const authorizeInvoice = createAsyncThunk(
  'financeInvoices/authorize',
  async ({ id, rawId }, { dispatch, rejectWithValue }) => {
    try {
      const targetId = rawId || id
      const result = await financeApi.authorizeInvoice(targetId)
      dispatch(fetchInvoices())
      return { id, rawId, result, updatedStatus: 'AUTHORIZED' }
    } catch (err) {
      return rejectWithValue(err.message || 'Authorization failed')
    }
  }
)

// Flag a variance discrepancy on an invoice
export const flagVariance = createAsyncThunk(
  'financeInvoices/flagVariance',
  async ({ id, rawId, reason }, { dispatch, rejectWithValue }) => {
    try {
      const targetId = rawId || id
      const result = await financeApi.flagVariance(targetId, reason)
      dispatch(fetchInvoices())
      return { id, rawId, result, updatedStatus: 'VARIANCE_FLAGGED' }
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to flag variance')
    }
  }
)

// Release payment for an authorized invoice
export const releasePayment = createAsyncThunk(
  'financeInvoices/releasePayment',
  async ({ id, rawId, paymentConfig }, { dispatch, rejectWithValue }) => {
    try {
      const targetId = rawId || id
      const result = await financeApi.releasePayment(targetId, paymentConfig)
      dispatch(fetchInvoices())
      return { id, rawId, result, paymentConfig, updatedStatus: 'PAID' }
    } catch (err) {
      return rejectWithValue(err.message || 'Payment release failed')
    }
  }
)

const invoicesSlice = createSlice({
  name: 'financeInvoices',
  initialState: {
    items: [],
    selectedInvoice: null,
    reconciliationReport: null,
    status: 'idle',
    actionStatus: 'idle',
    error: null,
    actionError: null,
    notice: null,
  },
  reducers: {
    setSelectedInvoice(state, action) {
      state.selectedInvoice = action.payload
      state.reconciliationReport = null
    },
    clearSelectedInvoice(state) {
      state.selectedInvoice = null
      state.reconciliationReport = null
    },
    clearInvoiceNotice(state) {
      state.notice = null
    },
    patchSelectedInvoice(state, action) {
      if (state.selectedInvoice) {
        state.selectedInvoice = { ...state.selectedInvoice, ...action.payload }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchInvoices
      .addCase(fetchInvoices.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
        if (state.selectedInvoice) {
          const refreshed = action.payload.find(
            (i) =>
              (i.rawId && i.rawId === state.selectedInvoice.rawId) ||
              i.id === state.selectedInvoice.id
          )
          if (
            refreshed &&
            (refreshed.auditStatus !== state.selectedInvoice.auditStatus ||
              refreshed.status !== state.selectedInvoice.status)
          ) {
            state.selectedInvoice = refreshed
          }
        }
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })

      // fetchInvoiceById
      .addCase(fetchInvoiceById.fulfilled, (state, action) => {
        state.selectedInvoice = action.payload
      })

      // fetch3WayCheck
      .addCase(fetch3WayCheck.fulfilled, (state, action) => {
        state.reconciliationReport = action.payload
      })
      .addCase(fetch3WayCheck.rejected, (state) => {
        state.reconciliationReport = null
      })

      // authorizeInvoice
      .addCase(authorizeInvoice.pending, (state) => {
        state.actionStatus = 'loading'
        state.actionError = null
      })
      .addCase(authorizeInvoice.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded'
        const { id, updatedStatus } = action.payload
        const idx = state.items.findIndex((i) => i.id === id || i.rawId === id)
        if (idx !== -1) {
          state.items[idx] = { ...state.items[idx], auditStatus: updatedStatus, status: updatedStatus }
        }
        if (state.selectedInvoice && (state.selectedInvoice.id === id || state.selectedInvoice.rawId === id)) {
          state.selectedInvoice = { ...state.selectedInvoice, auditStatus: updatedStatus, status: updatedStatus }
        }
        state.notice = `Invoice ${id} successfully authorized! You can now disburse escrow payment.`
      })
      .addCase(authorizeInvoice.rejected, (state, action) => {
        state.actionStatus = 'failed'
        state.actionError = action.payload
      })

      // flagVariance
      .addCase(flagVariance.pending, (state) => {
        state.actionStatus = 'loading'
        state.actionError = null
      })
      .addCase(flagVariance.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded'
        const { id, updatedStatus } = action.payload
        const idx = state.items.findIndex((i) => i.id === id || i.rawId === id)
        if (idx !== -1) {
          state.items[idx] = { ...state.items[idx], auditStatus: updatedStatus, status: updatedStatus }
        }
        state.selectedInvoice = null
        state.reconciliationReport = null
        state.notice = `Variance discrepancy flagged for ${id}. Clarification request sent to Contractor & Department Head.`
      })
      .addCase(flagVariance.rejected, (state, action) => {
        state.actionStatus = 'failed'
        state.actionError = action.payload
      })

      // releasePayment
      .addCase(releasePayment.pending, (state) => {
        state.actionStatus = 'loading'
        state.actionError = null
      })
      .addCase(releasePayment.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded'
        const { id, updatedStatus, paymentConfig } = action.payload
        const idx = state.items.findIndex((i) => i.id === id || i.rawId === id)
        if (idx !== -1) {
          state.items[idx] = {
            ...state.items[idx],
            auditStatus: updatedStatus,
            status: updatedStatus,
            paymentMode: paymentConfig.paymentMode,
            paymentReference: paymentConfig.paymentReference,
            bankReference: paymentConfig.paymentReference,
            disbursedAt: new Date().toISOString(),
          }
        }
        if (state.selectedInvoice && (state.selectedInvoice.id === id || state.selectedInvoice.rawId === id)) {
          state.selectedInvoice = {
            ...state.selectedInvoice,
            auditStatus: updatedStatus,
            status: updatedStatus,
            paymentMode: paymentConfig.paymentMode,
            paymentReference: paymentConfig.paymentReference,
            bankReference: paymentConfig.paymentReference,
            disbursedAt: new Date().toISOString(),
          }
        }
        const billedAmount = state.items[state.items.findIndex((i) => i.id === id || i.rawId === id)]?.billedAmount || 0
        state.notice = `✓ Payment of ₹${Number(billedAmount).toLocaleString('en-IN')} disbursed for ${id}! Bank UTR: ${paymentConfig.paymentReference}`
      })
      .addCase(releasePayment.rejected, (state, action) => {
        state.actionStatus = 'failed'
        state.actionError = action.payload
      })
  },
})

export const {
  setSelectedInvoice,
  clearSelectedInvoice,
  clearInvoiceNotice,
  patchSelectedInvoice,
} = invoicesSlice.actions

export const selectAllInvoices          = (state) => state.financeInvoices?.items || []
export const selectInvoicesStatus       = (state) => state.financeInvoices?.status || 'idle'
export const selectInvoicesError        = (state) => state.financeInvoices?.error || null
export const selectSelectedInvoice      = (state) => state.financeInvoices?.selectedInvoice || null
export const selectReconciliationReport = (state) => state.financeInvoices?.reconciliationReport || null
export const selectInvoiceNotice        = (state) => state.financeInvoices?.notice || null
export const selectActionStatus         = (state) => state.financeInvoices?.actionStatus || 'idle'
export const selectActionError          = (state) => state.financeInvoices?.actionError || null
export const selectPendingAuditCount    = (state) =>
  (state.financeInvoices?.items || []).filter((i) => i.auditStatus === 'PENDING_AUDIT').length

export default invoicesSlice.reducer
