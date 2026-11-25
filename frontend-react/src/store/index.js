// Redux Store - Central store for the TIMS frontend
// Slice <-> Repository mapping (one-to-one):
//   auth             <- auth/authSlice             <- authController / authApi (Login/Logout/Session)
//   complaints       <- rwa/complaintsSlice        <- complaintController / complaintApi (RWA portal)
//   verification     <- rwa/verificationSlice      <- complaintController verify (RWA portal)
//   rwaUi            <- rwa/uiSlice                <- UI navigation state (RWA portal)
//   clerkComplaints  <- clerk/complaintsSlice      <- clerkController / complaintApi (Clerk portal)
//   clerkWorkOrders  <- clerk/workOrdersSlice      <- workOrderController / clerkApi (Clerk portal)
//   contractor       <- contractor/contractorSlice <- contractorController / contractorApi (Field Contractor portal)
//   financeInvoices  <- finance/invoicesSlice      <- financeController / financeApi (Finance portal)
//   financeRateCards <- finance/rateCardsSlice     <- financeController / financeApi (Finance portal)
//   masterData       <- master/masterDataSlice     <- masterController / masterApi (Master data)
//   deptHead         <- depthead/deptHeadSlice     <- deptHeadController / deptHeadApi (Department Head portal)
//   coo              <- coo/cooSlice               <- cooController / cooApi (Township COO portal)
//   superAdmin       <- superadmin/superAdminSlice <- superAdminController / superAdminApi (Super Admin portal)
import { configureStore } from '@reduxjs/toolkit'
import authReducer from './auth/authSlice.js'
import complaintsReducer from './rwa/complaintsSlice.js'
import verificationReducer from './rwa/verificationSlice.js'
import uiReducer from './rwa/uiSlice.js'
import clerkComplaintsReducer from './clerk/complaintsSlice.js'
import clerkWorkOrdersReducer from './clerk/workOrdersSlice.js'
import contractorReducer from './contractor/contractorSlice.js'
import financeInvoicesReducer from './finance/invoicesSlice.js'
import financeRateCardsReducer from './finance/rateCardsSlice.js'
import masterDataReducer from './master/masterDataSlice.js'
import deptHeadReducer from './depthead/deptHeadSlice.js'
import cooReducer from './coo/cooSlice.js'
import superAdminReducer from './superadmin/superAdminSlice.js'

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

    // Field Contractor portal slice
    contractor: contractorReducer,

    // Finance portal slices
    financeInvoices: financeInvoicesReducer,
    financeRateCards: financeRateCardsReducer,

    // Master data slice
    masterData: masterDataReducer,

    // Department Head portal slice
    deptHead: deptHeadReducer,

    // Township COO portal slice
    coo: cooReducer,

    // Super Admin portal slice
    superAdmin: superAdminReducer,
  },
})
