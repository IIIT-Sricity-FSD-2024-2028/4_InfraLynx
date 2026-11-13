import { configureStore } from '@reduxjs/toolkit'
import complaintsReducer from './rwa/complaintsSlice.js'
import verificationReducer from './rwa/verificationSlice.js'
import uiReducer from './rwa/uiSlice.js'

export const store = configureStore({
  reducer: {
    complaints: complaintsReducer,
    verification: verificationReducer,
    rwaUi: uiReducer,
  },
})
