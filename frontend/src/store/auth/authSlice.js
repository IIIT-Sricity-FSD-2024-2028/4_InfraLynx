/**
 * auth/authSlice.js
 *
 * Repository ↔ Slice mapping:
 *   Backend: authController.js (/api/v1/auth/*)
 *   Repository: authApi (in frontend/src/services/api.js)
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

/**
 * Thunk: Register a new Township & Township COO account.
 * Calls authApi.registerTownship(payload) -> POST /api/v1/auth/register-township.
 * Database creates user & township first, then Redux auth state is updated.
 */
export const registerTownship = createAsyncThunk(
  'auth/registerTownship',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await authApi.registerTownship(payload)
      return data
    } catch (err) {
      return rejectWithValue(err.message || 'Township registration failed')
    }
  }
)

/**
 * Thunk: Set or update authenticated user password.
 * Calls authApi.setPassword(...) -> POST /api/v1/auth/set-password.
 */
export const setUserPassword = createAsyncThunk(
  'auth/setUserPassword',
  async ({ emailOrNewPassword, maybeNewPassword, currentPassword = '' }, { rejectWithValue }) => {
    try {
      const res = await authApi.setPassword(emailOrNewPassword, maybeNewPassword, currentPassword)
      return res
    } catch (err) {
      return rejectWithValue(err.message || 'Could not update password')
    }
  }
)

// ─── Initial State ───────────────────────────────────────────────────────────

const cachedUser = authApi.getCachedUser()

const defaultSignUpForm = {
  townshipName: '',
  executiveName: '',
  email: '',
  phone: '',
  sector: '',
  password: '',
  confirmPassword: '',
  agreeTerms: false,
}

const defaultContactForm = {
  name: '',
  role: '',
  township: '',
  sectors: '5 to 15 Sectors',
  email: '',
  domain: 'All Municipal Departments',
  message: '',
}

const initialState = {
  user: cachedUser,
  isAuthenticated: Boolean(cachedUser && authApi.isAuthenticated()),
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  backendStatus: {
    connected: false,
    checking: true,
    environment: null,
    database: null,
  },
  appUi: {
    authOpen: false,
    authRole: null,
    authNotice: null,
    signUpOpen: false,
  },
  authModalUi: {
    formData: { email: '', password: '' },
    errors: {},
    touched: {},
    loading: false,
    errorMsg: null,
    submitted: false,
    detectedPortal: 'rwa',
    detectedUserName: '',
  },
  signUpModalUi: {
    step: 1,
    loading: false,
    apiError: null,
    formData: defaultSignUpForm,
    touched: {},
    showPasswordChange: false,
    newPassword: '',
    passwordUpdateMsg: null,
    passwordUpdateLoading: false,
    createdData: null,
  },
  landingUi: {
    mobileMenuOpen: false,
    activeActorId: 'rwa',
    contactSubmitted: false,
    contactForm: defaultContactForm,
  },
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
    setBackendStatus(state, action) {
      state.backendStatus = action.payload
    },
    setAppUiField(state, action) {
      const { field, value } = action.payload
      if (field in state.appUi) state.appUi[field] = value
    },
    openAuthModal(state, action) {
      const role = action.payload
      state.appUi.authRole = typeof role === 'string' ? role : null
      state.appUi.authNotice = null
      state.appUi.authOpen = true
    },
    closeAuthModal(state) {
      state.appUi.authOpen = false
      state.appUi.authNotice = null
    },
    setAuthModalUiField(state, action) {
      const { field, value } = action.payload
      if (field in state.authModalUi) state.authModalUi[field] = value
    },
    setAuthFormField(state, action) {
      const { field, value } = action.payload
      state.authModalUi.formData[field] = value
    },
    setAuthTouchedField(state, action) {
      const field = action.payload
      state.authModalUi.touched[field] = true
    },
    setAuthErrorField(state, action) {
      const { field, error } = action.payload
      state.authModalUi.errors[field] = error
    },
    resetAuthModalForm(state) {
      state.authModalUi = {
        formData: { email: '', password: '' },
        errors: {},
        touched: {},
        loading: false,
        errorMsg: null,
        submitted: false,
        detectedPortal: state.authModalUi.detectedPortal,
        detectedUserName: state.authModalUi.detectedUserName,
      }
    },
    setSignUpModalUiField(state, action) {
      const { field, value } = action.payload
      if (field in state.signUpModalUi) state.signUpModalUi[field] = value
    },
    setSignUpFormField(state, action) {
      const { field, value } = action.payload
      state.signUpModalUi.formData[field] = value
    },
    setSignUpTouchedField(state, action) {
      state.signUpModalUi.touched[action.payload] = true
    },
    setLandingUiField(state, action) {
      const { field, value } = action.payload
      if (field in state.landingUi) state.landingUi[field] = value
    },
    setContactFormField(state, action) {
      const { field, value } = action.payload
      state.landingUi.contactForm[field] = value
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

      // ── registerTownship ─────────────────────────────────────────────────
      .addCase(registerTownship.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(registerTownship.fulfilled, (state, action) => {
        state.status = 'succeeded'
        if (action.payload?.user) {
          state.user = action.payload.user
          state.isAuthenticated = true
        }
        state.error = null
      })
      .addCase(registerTownship.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
  },
})

export const {
  setUser,
  clearAuth,
  setBackendStatus,
  setAppUiField,
  openAuthModal,
  closeAuthModal,
  setAuthModalUiField,
  setAuthFormField,
  setAuthTouchedField,
  setAuthErrorField,
  resetAuthModalForm,
  setSignUpModalUiField,
  setSignUpFormField,
  setSignUpTouchedField,
  setLandingUiField,
  setContactFormField,
} = authSlice.actions

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectAuthUser = (state) => state.auth.user
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated
export const selectAuthStatus = (state) => state.auth.status
export const selectAuthError = (state) => state.auth.error
export const selectBackendStatus = (state) => state.auth.backendStatus
export const selectAppUi = (state) => state.auth.appUi
export const selectAuthModalUi = (state) => state.auth.authModalUi
export const selectSignUpModalUi = (state) => state.auth.signUpModalUi
export const selectLandingUi = (state) => state.auth.landingUi

export default authSlice.reducer
