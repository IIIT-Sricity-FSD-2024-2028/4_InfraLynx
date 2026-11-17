import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'rwaUi',
  initialState: {
    currentScreen: 'dashboard', // 'dashboard' | 'report' | 'track' | 'verify'
    selectedComplaintId: null,  // string complaint ID
    successNotice: null,        // { id, title, message } | null
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
  },
})

export const { navigateTo, selectComplaint, setSuccessNotice, dismissNotice } =
  uiSlice.actions

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectCurrentScreen = (state) => state.rwaUi.currentScreen
export const selectSelectedComplaintId = (state) => state.rwaUi.selectedComplaintId
export const selectSuccessNotice = (state) => state.rwaUi.successNotice

// Derived: returns full complaint object from complaints slice
export const selectSelectedComplaint = (state) => {
  const id = state.rwaUi.selectedComplaintId
  if (!id) return null
  return state.complaints.items.find((c) => c.id === id) || null
}

export default uiSlice.reducer
