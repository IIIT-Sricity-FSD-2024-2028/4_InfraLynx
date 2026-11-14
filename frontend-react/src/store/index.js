/**
 * Redux Store — Central store for the TIMS frontend
 *
 * Slice ↔ Repository mapping (one-to-one):
 *   complaints       ← rwa/complaintsSlice    ← complaintApi (RWA member)
 *   verification     ← rwa/verificationSlice  ← complaintApi verify endpoint (RWA member)
 *   rwaUi            ← rwa/uiSlice            ← UI state for RWA portal (RWA member)
 *   clerkComplaints  ← clerk/complaintsSlice  ← clerkApi + complaintApi (Clerk member)
 *   clerkWorkOrders  ← clerk/workOrdersSlice  ← clerkApi work order endpoints (Clerk member)
 */
import { configureStore } from '@reduxjs/toolkit'

// RWA slices (existing — do not modify)
import complaintsReducer   from './rwa/complaintsSlice.js'
import verificationReducer from './rwa/verificationSlice.js'
import uiReducer           from './rwa/uiSlice.js'

// Clerk slices (new — one per controller/repository)
import clerkComplaintsReducer from './clerk/complaintsSlice.js'
import clerkWorkOrdersReducer from './clerk/workOrdersSlice.js'

export const store = configureStore({
  reducer: {
    // ── RWA portal ───────────────────────────────────────────────────────
    complaints:       complaintsReducer,
    verification:     verificationReducer,
    rwaUi:            uiReducer,

    // ── Clerk portal ──────────────────────────────────────────────────────
    clerkComplaints:  clerkComplaintsReducer,   // Mapped 1-to-1 with clerkController
    clerkWorkOrders:  clerkWorkOrdersReducer,   // Mapped 1-to-1 with workOrderController
  },
})
