import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'rwaUi',
  initialState: {
    currentScreen: 'dashboard', // 'dashboard' | 'report' | 'track' | 'verify'
    selectedComplaintId: null,  // string complaint ID
    successNotice: null,        // { id, title, message } | null
    filters: {
      searchQuery: '',
      selectedCategory: 'ALL',
      selectedStatus: 'ALL',
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
    setRwaSearchQuery(state, action) {
      state.filters.searchQuery = action.payload
    },
    setRwaCategoryFilter(state, action) {
      state.filters.selectedCategory = action.payload
    },
    setRwaStatusFilter(state, action) {
      state.filters.selectedStatus = action.payload
    },
  },
})

export const {
  navigateTo,
  selectComplaint,
  setSuccessNotice,
  dismissNotice,
  setRwaSearchQuery,
  setRwaCategoryFilter,
  setRwaStatusFilter,
} = uiSlice.actions

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectCurrentScreen = (state) => state.rwaUi.currentScreen
export const selectSelectedComplaintId = (state) => state.rwaUi.selectedComplaintId
export const selectSuccessNotice = (state) => state.rwaUi.successNotice
export const selectRwaSearchQuery = (state) => state.rwaUi.filters.searchQuery
export const selectRwaCategoryFilter = (state) => state.rwaUi.filters.selectedCategory
export const selectRwaStatusFilter = (state) => state.rwaUi.filters.selectedStatus

// Derived: returns full complaint object from complaints slice
export const selectSelectedComplaint = (state) => {
  const id = state.rwaUi.selectedComplaintId
  if (!id) return null
  return state.complaints.items.find((c) => c.id === id) || null
}

export default uiSlice.reducer
