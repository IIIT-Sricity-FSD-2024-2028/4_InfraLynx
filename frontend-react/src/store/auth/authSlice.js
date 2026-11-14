/**
 * auth/authSlice.js
 *
 * Repository ↔ Slice mapping:
 *   Backend: authController.js (/api/v1/auth/*)
 *   Repository: authApi (in frontend-react/src/services/api.js)
 *   This slice: owns ALL authentication and user session state in Redux.
 *
 * Core Rules Satisfied:
 *   Rule 1: One repository ↔️ One Redux slice (authController/authApi ↔️ authSlice)
 *   Rule 2: Implement required auth operations (Login, Logout, Session check)
 *   Rule 3: Every operation uses the Thunk pattern (loginUser, logoutUser, fetchCurrentUser)
 *   Rule 4: Database must be updated before updating Redux state (API called first)
 *   Rule 5: Redux state is updated using the response received from the database
 *   Rule 6: Frontend components read user / auth state from Redux via selectors
 *   Rule 8: All auth actions dispatched through Redux
 *   Rule 9: Login and logout must also be handled through Redux
 *   Rule 10: All user data visible on the frontend ultimately comes from Redux store
 *   Rule 11: Redux store remains synchronized with database / session
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authApi } from '../../services/api.js'

// ─── Async Thunks ────────────────────────────────────────────────────────────

/**
 * Thunk: Authenticate user with backend database.
 * Calls authApi.login(emailOrUsername, password) -> POST /api/v1/auth/login.
 * Database validates credentials and returns authenticated user object.
 * Redux state is updated from the database response.
 */
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ emailOrUsername, password }, { rejectWithValue }) => {
    try {
      const data = await authApi.login(emailOrUsername, password)
      return data.user
    } catch (err) {
      return rejectWithValue(err.message || 'Login failed')
    }
  }
)

/**
 * Thunk: Log out user on the backend server and clear local credentials.
 * Calls authApi.logout() -> POST /api/v1/auth/logout.
 * Database invalidates session, then Redux state is cleared.
 */
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await authApi.logout()
      return null
    } catch (err) {
      return rejectWithValue(err.message || 'Logout failed')
    }
  }
)

/**
 * Thunk: Verify active session with backend database.
 * Calls authApi.getMe() -> GET /api/v1/auth/me.
 */
export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authApi.getMe()
      return user
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch current user')
    }
  }
)

// ─── Initial State ───────────────────────────────────────────────────────────

const cachedUser = authApi.getCachedUser()

const initialState = {
  user: cachedUser,
  isAuthenticated: Boolean(cachedUser && authApi.isAuthenticated()),
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
}

// ─── Slice ───────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action) {
      state.user = action.payload
      state.isAuthenticated = Boolean(action.payload)
    },
    clearAuth(state) {
      state.user = null
      state.isAuthenticated = false
      state.status = 'idle'
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // ── loginUser ─────────────────────────────────────────────────────────
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.user = action.payload // DB response
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
        state.user = null
        state.isAuthenticated = false
      })

      // ── logoutUser ────────────────────────────────────────────────────────
      .addCase(logoutUser.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.status = 'idle'
        state.user = null
        state.isAuthenticated = false
        state.error = null
      })
      .addCase(logoutUser.rejected, (state) => {
        state.status = 'idle'
        state.user = null
        state.isAuthenticated = false
      })

      // ── fetchCurrentUser ─────────────────────────────────────────────────
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload
        state.isAuthenticated = Boolean(action.payload)
      })
  },
})

export const { setUser, clearAuth } = authSlice.actions

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectAuthUser = (state) => state.auth.user
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated
export const selectAuthStatus = (state) => state.auth.status
export const selectAuthError = (state) => state.auth.error

export default authSlice.reducer
