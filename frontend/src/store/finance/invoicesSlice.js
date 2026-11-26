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

// Flag a specific invoice line item for review
export const flagLineItem = createAsyncThunk(
  'financeInvoices/flagLineItem',
  async ({ invoiceId, itemKey, reason }, { dispatch, rejectWithValue }) => {
    try {
      const result = await financeApi.flagLineItem(invoiceId, itemKey, reason)
      dispatch(fetchInvoices())
      return { invoiceId, itemKey, reason, result }
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to flag line item')
    }
  }
)

// Send overrun inquiry to contractor
export const addOverrunInquiry = createAsyncThunk(
  'financeInvoices/addOverrunInquiry',
  async ({ woId, remark }, { dispatch, rejectWithValue }) => {
    try {
      const result = await financeApi.addOverrunInquiry(woId, remark)
      dispatch(fetchInvoices())
      return { woId, remark, result }
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to issue inquiry')
    }
  }
)

// Resolve overrun inquiry (ACCEPT or CAP_ESTIMATE)
export const resolveOverrunInquiry = createAsyncThunk(
  'financeInvoices/resolveOverrunInquiry',
  async ({ woId, action, finalAmount }, { dispatch, rejectWithValue }) => {
    try {
      const result = await financeApi.resolveOverrunInquiry(woId, {
        action,
        final_amount: finalAmount,
      })
      dispatch(fetchInvoices())
      return { woId, action, finalAmount, result }
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to settle overrun')
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
    flaggedItems: {},
    inquirySentMsg: null,
    overrunResolutionMsg: null,
    filters: {
      selectedDept: 'ALL',
      selectedStatus: 'ALL',
      searchQuery: '',
    },
    // FinancePortal UI
    currentScreen: 'dashboard',
    // InvoiceAuditModal UI
    varianceReasonInput: '',
    showVarianceForm: false,
    paymentMode: 'RTGS / Township Escrow',
    paymentReference: '',
    isReleasing: false,
    inquiryRemarkInput: '',
    showInquiryForm: false,
  },
  reducers: {
    setSelectedInvoice(state, action) {
      state.selectedInvoice = action.payload
      state.reconciliationReport = null
      state.flaggedItems = {}
      state.inquirySentMsg = null
      state.overrunResolutionMsg = null
      // reset modal UI whenever a new invoice is opened
      state.showVarianceForm = false
      state.varianceReasonInput = ''
      state.showInquiryForm = false
      state.inquiryRemarkInput = ''
      if (action.payload) {
        state.paymentMode = action.payload.paymentMode || 'RTGS / Township Escrow'
        state.paymentReference = action.payload.paymentReference || action.payload.bankReference || ''
      }
    },
    clearSelectedInvoice(state) {
      state.selectedInvoice = null
      state.reconciliationReport = null
      state.flaggedItems = {}
      state.inquirySentMsg = null
      state.overrunResolutionMsg = null
    },
    clearInvoiceNotice(state) {
      state.notice = null
    },
    patchSelectedInvoice(state, action) {
      if (state.selectedInvoice) {
        state.selectedInvoice = { ...state.selectedInvoice, ...action.payload }
      }
    },
    setInvoiceDeptFilter(state, action) {
      state.filters.selectedDept = action.payload
    },
    setInvoiceStatusFilter(state, action) {
      state.filters.selectedStatus = action.payload
    },
    setInvoiceSearchQuery(state, action) {
      state.filters.searchQuery = action.payload
    },
    // FinancePortal navigation
    setFinanceCurrentScreen(state, action) { state.currentScreen = action.payload },
    // InvoiceAuditModal form/flag reducers
    setVarianceReasonInput(state, action) { state.varianceReasonInput = action.payload },
    setShowVarianceForm(state, action) { state.showVarianceForm = action.payload },
    setPaymentMode(state, action) { state.paymentMode = action.payload },
    setPaymentReference(state, action) { state.paymentReference = action.payload },
    setIsReleasing(state, action) { state.isReleasing = action.payload },
    setInquiryRemarkInput(state, action) { state.inquiryRemarkInput = action.payload },
    setShowInquiryForm(state, action) { state.showInquiryForm = action.payload },
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

      // flagLineItem
      .addCase(flagLineItem.fulfilled, (state, action) => {
        const { itemKey, reason } = action.payload
        state.flaggedItems[itemKey] = reason
      })

      // addOverrunInquiry
      .addCase(addOverrunInquiry.fulfilled, (state, action) => {
        const { remark } = action.payload
        state.inquirySentMsg = `Inquiry sent to contractor: "${remark}"`
      })

      // resolveOverrunInquiry
      .addCase(resolveOverrunInquiry.fulfilled, (state, action) => {
        const { action: resAction } = action.payload
        state.overrunResolutionMsg = `Overrun settled: ${
          resAction === 'ACCEPT'
            ? 'Accepted billed amount'
            : 'Capped at approved estimate'
        }.`
      })
  },
})

export const {
  setSelectedInvoice,
  clearSelectedInvoice,
  clearInvoiceNotice,
  patchSelectedInvoice,
  setInvoiceDeptFilter,
  setInvoiceStatusFilter,
  setInvoiceSearchQuery,
  setFinanceCurrentScreen,
  setVarianceReasonInput,
  setShowVarianceForm,
  setPaymentMode,
  setPaymentReference,
  setIsReleasing,
  setInquiryRemarkInput,
  setShowInquiryForm,
} = invoicesSlice.actions

export const selectAllInvoices          = (state) => state.financeInvoices?.items || []
export const selectInvoicesStatus       = (state) => state.financeInvoices?.status || 'idle'
export const selectInvoicesError        = (state) => state.financeInvoices?.error || null
export const selectSelectedInvoice      = (state) => state.financeInvoices?.selectedInvoice || null
export const selectReconciliationReport = (state) => state.financeInvoices?.reconciliationReport || null
export const selectInvoiceNotice        = (state) => state.financeInvoices?.notice || null
export const selectActionStatus         = (state) => state.financeInvoices?.actionStatus || 'idle'
export const selectActionError          = (state) => state.financeInvoices?.actionError || null
export const selectFlaggedItems         = (state) => state.financeInvoices?.flaggedItems || {}
export const selectInquirySentMsg       = (state) => state.financeInvoices?.inquirySentMsg || null
export const selectOverrunResolutionMsg = (state) => state.financeInvoices?.overrunResolutionMsg || null
export const selectInvoiceDeptFilter    = (state) => state.financeInvoices?.filters?.selectedDept || 'ALL'
export const selectInvoiceStatusFilter  = (state) => state.financeInvoices?.filters?.selectedStatus || 'ALL'
export const selectInvoiceSearchQuery   = (state) => state.financeInvoices?.filters?.searchQuery || ''
export const selectPendingAuditCount    = (state) =>
  (state.financeInvoices?.items || []).filter((i) => i.auditStatus === 'PENDING_AUDIT').length
// UI selectors — FinancePortal
export const selectFinanceCurrentScreen   = (state) => state.financeInvoices?.currentScreen || 'dashboard'
// UI selectors — InvoiceAuditModal
export const selectVarianceReasonInput    = (state) => state.financeInvoices?.varianceReasonInput || ''
export const selectShowVarianceForm       = (state) => state.financeInvoices?.showVarianceForm || false
export const selectPaymentMode            = (state) => state.financeInvoices?.paymentMode || 'RTGS / Township Escrow'
export const selectPaymentReference       = (state) => state.financeInvoices?.paymentReference || ''
export const selectIsReleasing            = (state) => state.financeInvoices?.isReleasing || false
export const selectInquiryRemarkInput     = (state) => state.financeInvoices?.inquiryRemarkInput || ''
export const selectShowInquiryForm        = (state) => state.financeInvoices?.showInquiryForm || false

export default invoicesSlice.reducer
