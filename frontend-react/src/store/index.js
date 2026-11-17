/**
 * Redux Store — Central store for the TIMS frontend
 *
 * Slice ↔ Repository mapping (one-to-one):
 *   auth             ← auth/authSlice         ← authController / authApi (Login/Logout/Session)
 *   complaints       ← rwa/complaintsSlice    ← complaintController / complaintApi (RWA portal)
 *   verification     ← rwa/verificationSlice  ← complaintController verify (RWA portal)
 *   rwaUi            ← rwa/uiSlice            ← UI navigation state (RWA portal)
 *   clerkComplaints  ← clerk/complaintsSlice  ← clerkController / complaintApi (Clerk portal)
 *   clerkWorkOrders  ← clerk/workOrdersSlice  ← workOrderController / clerkApi (Clerk portal)
 */
import { configureStore } from '@reduxjs/toolkit'

// Authentication slice (Repository: authController / authApi)
import authReducer from './auth/authSlice.js'

// RWA slices (Repository: complaintController)
import complaintsReducer   from './rwa/complaintsSlice.js'
import verificationReducer from './rwa/verificationSlice.js'
import uiReducer           from './rwa/uiSlice.js'

// Clerk slices (Repository: clerkController & workOrderController)
import clerkComplaintsReducer from './clerk/complaintsSlice.js'
import clerkWorkOrdersReducer from './clerk/workOrdersSlice.js'

export const store = configureStore({
  reducer: {
    // ── Authentication ────────────────────────────────────────────────────
    auth:             authReducer,

    // ── RWA portal ───────────────────────────────────────────────────────
    complaints:       complaintsReducer,
    verification:     verificationReducer,
    rwaUi:            uiReducer,

    // ── Clerk portal ──────────────────────────────────────────────────────
    clerkComplaints:  clerkComplaintsReducer,   // 1-to-1 with clerkController
    clerkWorkOrders:  clerkWorkOrdersReducer,   // 1-to-1 with workOrderController
  },
})
