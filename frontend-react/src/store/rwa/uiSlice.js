import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'rwaUi',
  initialState: {
    currentScreen: 'dashboard', // 'dashboard' | 'report' | 'track' | 'verify'
    selectedComplaintId: null,  // string complaint ID
    successNotice: null,        // { id, title, message } | null
    editingComplaint: null,     // complaint open in EditReportModal
    cancellingComplaint: null,  // complaint open in CancelReportModal
    filters: {
      searchQuery: '',
      selectedCategory: 'ALL',
      selectedStatus: 'ALL',
    },
    reportIssue: {
      submitting: false,
      photos: [],
    },
    verificationUi: {
      rating: 5,
      confirmRemarks: '',
      actionDoneMessage: null,
    },
  },
  reducers: {
    navigateTo(state, action) {
      state.currentScreen = action.payload
    },
    selectComplaint(state, action) {
      // accepts a complaint object OR just an id string
      const val = action.payload
      state.selectedComplaintId = val ? (typeof val === 'string' ? val : val.id) : null
    },
    setSuccessNotice(state, action) {
      state.successNotice = action.payload
    },
    dismissNotice(state) {
      state.successNotice = null
    },
    setEditingComplaint(state, action) {
      state.editingComplaint = action.payload
    },
    setCancellingComplaint(state, action) {
      state.cancellingComplaint = action.payload
    },
    setRwaSearchQuery(state, action) {
      state.filters.searchQuery = action.payload
    },
    setRwaCategoryFilter(state, action) {
      state.filters.selectedCategory = action.payload
    },
    setRwaStatusFilter(state, action) {
      state.filters.selectedStatus = action.payload
    },
    setReportSubmitting(state, action) {
      state.reportIssue.submitting = action.payload
    },
    addReportPhoto(state, action) {
      state.reportIssue.photos.push(action.payload)
    },
    removeReportPhoto(state, action) {
      state.reportIssue.photos = state.reportIssue.photos.filter((_, i) => i !== action.payload)
    },
    clearReportPhotos(state) {
      state.reportIssue.photos = []
    },
    setVerificationRating(state, action) {
      state.verificationUi.rating = action.payload
    },
    setVerificationRemarks(state, action) {
      state.verificationUi.confirmRemarks = action.payload
    },
    setVerificationDoneMessage(state, action) {
      state.verificationUi.actionDoneMessage = action.payload
    },
  },
})

export const {
  navigateTo,
  selectComplaint,
  setSuccessNotice,
  dismissNotice,
  setEditingComplaint,
  setCancellingComplaint,
  setRwaSearchQuery,
  setRwaCategoryFilter,
  setRwaStatusFilter,
  setReportSubmitting,
  addReportPhoto,
  removeReportPhoto,
  clearReportPhotos,
  setVerificationRating,
  setVerificationRemarks,
  setVerificationDoneMessage,
} = uiSlice.actions

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectCurrentScreen = (state) => state.rwaUi.currentScreen
export const selectSelectedComplaintId = (state) => state.rwaUi.selectedComplaintId
export const selectSuccessNotice = (state) => state.rwaUi.successNotice
export const selectEditingComplaint = (state) => state.rwaUi.editingComplaint
export const selectCancellingComplaint = (state) => state.rwaUi.cancellingComplaint
export const selectRwaSearchQuery = (state) => state.rwaUi.filters.searchQuery
export const selectRwaCategoryFilter = (state) => state.rwaUi.filters.selectedCategory
export const selectRwaStatusFilter = (state) => state.rwaUi.filters.selectedStatus
export const selectReportSubmitting = (state) => state.rwaUi.reportIssue.submitting
export const selectReportPhotos = (state) => state.rwaUi.reportIssue.photos
export const selectVerificationUi = (state) => state.rwaUi.verificationUi

// Derived: returns full complaint object from complaints slice
export const selectSelectedComplaint = (state) => {
  const id = state.rwaUi.selectedComplaintId
  if (!id) return null
  return state.complaints.items.find((c) => c.id === id) || null
}

export default uiSlice.reducer
