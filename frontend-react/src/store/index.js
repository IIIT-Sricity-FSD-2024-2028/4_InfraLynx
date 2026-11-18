/**
 * Redux Store - Central store for the TIMS frontend
 *
 * Slice <-> Repository mapping (one-to-one):
 *   auth             <- auth/authSlice             <- authController / authApi (Login/Logout/Session)
 *   complaints       <- rwa/complaintsSlice        <- complaintController / complaintApi (RWA portal)
 *   verification     <- rwa/verificationSlice      <- complaintController verify (RWA portal)
 *   rwaUi            <- rwa/uiSlice                <- UI navigation state (RWA portal)
 *   clerkComplaints  <- clerk/complaintsSlice      <- clerkController / complaintApi (Clerk portal)
 *   clerkWorkOrders  <- clerk/workOrdersSlice      <- workOrderController / clerkApi (Clerk portal)
 *   contractor       <- contractor/contractorSlice <- contractorController / contractorApi (Field Contractor portal)
 */
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

// Contractor slice (Repository: contractorController / contractorApi) - Member 3
import contractorReducer from './contractor/contractorSlice.js'

export const store = configureStore({
  reducer: {
    // Authentication
    auth:             authReducer,

    // RWA portal
    complaints:       complaintsReducer,
    verification:     verificationReducer,
    rwaUi:            uiReducer,

    // Clerk portal
    clerkComplaints:  clerkComplaintsReducer,
    clerkWorkOrders:  clerkWorkOrdersReducer,

    // Field Contractor portal
    contractor:       contractorReducer,
  },
})
