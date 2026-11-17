// Central Redux store for TIMS frontend
import { configureStore } from '@reduxjs/toolkit'
import authReducer from './auth/authSlice.js'
import complaintsReducer from './rwa/complaintsSlice.js'
import verificationReducer from './rwa/verificationSlice.js'
import uiReducer from './rwa/uiSlice.js'
import clerkComplaintsReducer from './clerk/complaintsSlice.js'
import clerkWorkOrdersReducer from './clerk/workOrdersSlice.js'
import financeInvoicesReducer from './finance/invoicesSlice.js'
import financeRateCardsReducer from './finance/rateCardsSlice.js'
import masterDataReducer from './master/masterDataSlice.js'

export const store = configureStore({
  reducer: {
    // Auth slice
    auth: authReducer,

    // RWA portal slices
    complaints: complaintsReducer,
    verification: verificationReducer,
    rwaUi: uiReducer,

    // Clerk portal slices
    clerkComplaints: clerkComplaintsReducer,
    clerkWorkOrders: clerkWorkOrdersReducer,

    // Finance portal slices
    financeInvoices: financeInvoicesReducer,
    financeRateCards: financeRateCardsReducer,

    // Master data slice
    masterData: masterDataReducer,
  },
})
