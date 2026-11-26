/**
 * superadmin/superAdminSlice.js
 *
 * Repository <-> Slice mapping:
 *   Backend: superAdminController.js (/api/v1/super-admin/*)
 *   Repository: superAdminApi (in frontend-react/src/services/api.js)
 *   This slice: owns ALL Super Admin (Platform Maker Console) state in Redux.
 *
 * Core Rules Satisfied:
 *   Rule 1: One repository <-> One Redux slice (superAdminApi <-> superAdmin)
 *   Rule 2: Every slice implements CRUD operations (Create, Read, Update, Status/Password)
 *   Rule 3: Every CRUD operation uses the Thunk pattern (createAsyncThunk)
 *   Rule 4: Database is updated before updating Redux state (superAdminApi called first)
 *   Rule 5: Redux state is updated using the response received from the database
 *   Rule 6: Frontend reads displayed data strictly from Redux via selectors
 *   Rule 7: Frontend does not directly fetch application data independently of Redux
 *   Rule 8: All CRUD actions are dispatched through Redux
 *   Rule 9: Login and logout handled through Redux (authSlice integration)
 *   Rule 10: All data visible on the frontend comes from the Redux store
 *   Rule 11: Redux store remains synchronized with database
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { superAdminApi } from '../../services/api.js'
import { logoutUser } from '../auth/authSlice.js'

// ─── Async Thunks ────────────────────────────────────────────────────────────

/**
 * [READ] Fetch platform-wide overview KPIs, role breakdown, and recent activity.
 */
export const fetchSuperAdminOverview = createAsyncThunk(
  'superAdmin/fetchOverview',
  async (_, { rejectWithValue }) => {
    try {
      const data = await superAdminApi.getOverview()
      return data || {}
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load overview')
    }
  }
)

/**
 * [READ] Fetch all registered tenants (townships) and their subscriptions.
 */
export const fetchSuperAdminTenants = createAsyncThunk(
  'superAdmin/fetchTenants',
  async (_, { rejectWithValue }) => {
    try {
      const data = await superAdminApi.getTenants()
      return Array.isArray(data) ? data : []
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load tenants')
    }
  }
)

/**
 * [READ ONE] Fetch single tenant details by ID.
 */
export const fetchSuperAdminTenantById = createAsyncThunk(
  'superAdmin/fetchTenantById',
  async (id, { rejectWithValue }) => {
    try {
      const data = await superAdminApi.getTenantById(id)
      return data
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load tenant details')
    }
  }
)

/**
 * [CREATE] Onboard a new township tenant + subscription.
 * DB updated first; then re-syncs tenants and overview from PostgreSQL.
 */
export const createSuperAdminTenant = createAsyncThunk(
  'superAdmin/createTenant',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const result = await superAdminApi.createTenant(payload)
      dispatch(fetchSuperAdminTenants())
      dispatch(fetchSuperAdminOverview())
      return result
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to onboard tenant')
    }
  }
)

/**
 * [UPDATE] Update tenant metadata or subscription fields.
 * DB updated first; then re-syncs tenants and overview from PostgreSQL.
 */
export const updateSuperAdminTenant = createAsyncThunk(
  'superAdmin/updateTenant',
  async ({ id, payload }, { dispatch, rejectWithValue }) => {
    try {
      const result = await superAdminApi.updateTenant(id, payload)
      dispatch(fetchSuperAdminTenants())
      dispatch(fetchSuperAdminOverview())
      return { id, result }
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update tenant')
    }
  }
)

/**
 * [UPDATE / STATUS] Suspend or reactivate a tenant.
 * DB updated first; then re-syncs tenants and overview from PostgreSQL.
 */
export const updateSuperAdminTenantStatus = createAsyncThunk(
  'superAdmin/updateTenantStatus',
  async ({ id, status, reason }, { dispatch, rejectWithValue }) => {
    try {
      const result = await superAdminApi.updateTenantStatus(id, status, reason)
      dispatch(fetchSuperAdminTenants())
      dispatch(fetchSuperAdminOverview())
      return { id, status, result }
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update tenant status')
    }
  }
)

/**
 * [UPDATE] Update a tenant's subscription plan/cycle/expiry.
 * DB updated first; then re-syncs tenants and overview from PostgreSQL.
 */
export const updateSuperAdminSubscription = createAsyncThunk(
  'superAdmin/updateSubscription',
  async ({ id, payload }, { dispatch, rejectWithValue }) => {
    try {
      const result = await superAdminApi.updateSubscription(id, payload)
      dispatch(fetchSuperAdminTenants())
      dispatch(fetchSuperAdminOverview())
      return { id, result }
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update subscription')
    }
  }
)

/**
 * [READ] Fetch all platform and tenant users.
 */
export const fetchSuperAdminUsers = createAsyncThunk(
  'superAdmin/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const data = await superAdminApi.getUsers()
      return Array.isArray(data) ? data : []
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load users')
    }
  }
)

/**
 * [CREATE] Create a new user account.
 * DB updated first; then re-syncs users and overview from PostgreSQL.
 */
export const createSuperAdminUser = createAsyncThunk(
  'superAdmin/createUser',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const result = await superAdminApi.createUser(payload)
      dispatch(fetchSuperAdminUsers())
      dispatch(fetchSuperAdminOverview())
      return result
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to create user account')
    }
  }
)

/**
 * [UPDATE] Update user role and township/department/contractor assignment.
 * DB updated first; then re-syncs users and overview from PostgreSQL.
 */
export const updateSuperAdminUser = createAsyncThunk(
  'superAdmin/updateUser',
  async ({ id, payload }, { dispatch, rejectWithValue }) => {
    try {
      const result = await superAdminApi.updateUser(id, payload)
      dispatch(fetchSuperAdminUsers())
      dispatch(fetchSuperAdminOverview())
      return { id, result }
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update user')
    }
  }
)

/**
 * [UPDATE / STATUS] Activate, deactivate, or suspend a user account.
 * DB updated first; then re-syncs users and overview from PostgreSQL.
 */
export const updateSuperAdminUserStatus = createAsyncThunk(
  'superAdmin/updateUserStatus',
  async ({ id, status, reason }, { dispatch, rejectWithValue }) => {
    try {
      const result = await superAdminApi.updateUserStatus(id, status, reason)
      dispatch(fetchSuperAdminUsers())
      dispatch(fetchSuperAdminOverview())
      return { id, status, result }
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update user status')
    }
  }
)

/**
 * [UPDATE / PASSWORD] Reset a user's password immediately on the backend.
 */
export const resetSuperAdminUserPassword = createAsyncThunk(
  'superAdmin/resetUserPassword',
  async ({ id, new_password }, { rejectWithValue }) => {
    try {
      const result = await superAdminApi.resetUserPassword(id, new_password)
      return { id, result }
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to reset password')
    }
  }
)

/**
 * [READ] Fetch all departments across tenants (for user assignment).
 */
export const fetchSuperAdminDepartments = createAsyncThunk(
  'superAdmin/fetchDepartments',
  async (_, { rejectWithValue }) => {
    try {
      const data = await superAdminApi.getDepartments()
      return Array.isArray(data) ? data : []
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load departments')
    }
  }
)

/**
 * [CREATE] Create a department under a tenant.
 */
export const createSuperAdminDepartment = createAsyncThunk(
  'superAdmin/createDepartment',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const result = await superAdminApi.createDepartment(payload)
      dispatch(fetchSuperAdminDepartments())
      return result
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to create department')
    }
  }
)

/**
 * [READ] Fetch all contractors across tenants (for user assignment).
 */
export const fetchSuperAdminContractors = createAsyncThunk(
  'superAdmin/fetchContractors',
  async (_, { rejectWithValue }) => {
    try {
      const data = await superAdminApi.getContractors()
      return Array.isArray(data) ? data : []
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load contractors')
    }
  }
)

/**
 * [CREATE] Create a contractor under a tenant.
 */
export const createSuperAdminContractor = createAsyncThunk(
  'superAdmin/createContractor',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const result = await superAdminApi.createContractor(payload)
      dispatch(fetchSuperAdminContractors())
      return result
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to create contractor')
    }
  }
)

/**
 * [READ] Fetch platform configuration entries.
 */
export const fetchSuperAdminConfig = createAsyncThunk(
  'superAdmin/fetchConfig',
  async (_, { rejectWithValue }) => {
    try {
      const data = await superAdminApi.getConfig()
      return Array.isArray(data) ? data : []
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load configuration')
    }
  }
)

/**
 * [UPDATE] Update platform configuration entries.
 */
export const updateSuperAdminConfig = createAsyncThunk(
  'superAdmin/updateConfig',
  async ({ updates, reason }, { dispatch, rejectWithValue }) => {
    try {
      const result = await superAdminApi.updateConfig(updates, reason)
      dispatch(fetchSuperAdminConfig())
      return result
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update configuration')
    }
  }
)

/**
 * [READ] Fetch AMC rate cards.
 */
export const fetchSuperAdminAmcRates = createAsyncThunk(
  'superAdmin/fetchAmcRates',
  async (_, { rejectWithValue }) => {
    try {
      const data = await superAdminApi.getAmcRates()
      return Array.isArray(data) ? data : []
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load AMC rates')
    }
  }
)

/**
 * [UPDATE] Update an AMC rate card.
 */
export const updateSuperAdminAmcRate = createAsyncThunk(
  'superAdmin/updateAmcRate',
  async ({ id, payload }, { dispatch, rejectWithValue }) => {
    try {
      const result = await superAdminApi.updateAmcRate(id, payload)
      dispatch(fetchSuperAdminAmcRates())
      return result
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update AMC rate')
    }
  }
)

/**
 * [READ] Fetch platform health status.
 */
export const fetchSuperAdminHealth = createAsyncThunk(
  'superAdmin/fetchHealth',
  async (_, { rejectWithValue }) => {
    try {
      return (await superAdminApi.getHealth()) || {}
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load system health')
    }
  }
)

/**
 * [READ] Fetch platform audit logs.
 */
export const fetchSuperAdminAuditLogs = createAsyncThunk(
  'superAdmin/fetchAuditLogs',
  async (_, { rejectWithValue }) => {
    try {
      const data = await superAdminApi.getAuditLogs()
      return Array.isArray(data) ? data : []
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load audit logs')
    }
  }
)

// ─── Initial State ───────────────────────────────────────────────────────────

const defaultAddTenantForm = () => ({
  name: '',
  address: '',
  contact_email: '',
  contact_phone: '',
  legal_entity: '',
  primary_contact: '',
  plan_label: 'Enterprise',
  billing_cycle: 'YEARLY',
  start_date: new Date().toISOString().split('T')[0],
  expiry_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
  max_users: 10,
  max_complaints_monthly: 100,
  max_storage_gb: 5,
  status: 'ACTIVE',
})

const defaultCreateUserForm = () => ({
  name: '',
  email: '',
  username: '',
  password: '',
  role: 'DESK_CLERK',
  township_id: '',
  department_id: '',
  contractor_id: '',
  sector: '',
  phone: '',
})

const initialState = {
  overview: {
    data: null,
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  tenants: {
    items: [],
    selected: null,
    status: 'idle',
    error: null,
  },
  users: {
    items: [],
    selected: null,
    status: 'idle',
    error: null,
  },
  departments: {
    items: [],
    status: 'idle',
    error: null,
  },
  contractors: {
    items: [],
    status: 'idle',
    error: null,
  },
  config: {
    items: [],
    status: 'idle',
    error: null,
  },
  amcRates: {
    items: [],
    status: 'idle',
    error: null,
  },
  health: {
    data: null,
    status: 'idle',
    error: null,
  },
  auditLogs: {
    items: [],
    status: 'idle',
    error: null,
  },
  actionStatus: 'idle',
  actionError: null,
  notice: null, // { message: string, type: 'success' | 'error' }
  ui: {
    activeTab: 'overview',
    tenantsUi: {
      search: '',
      filterStatus: '',
      filterPlan: '',
      showAdd: false,
      addForm: defaultAddTenantForm(),
      addErrors: {},
      addSaving: false,
      detailTab: 'details',
      editForm: { name: '', address: '', contact_email: '', contact_phone: '' },
      subForm: { plan_label: 'Enterprise', billing_cycle: 'YEARLY', expiry_date: '', reason: '' },
      confirmSuspend: false,
      detailSaving: false,
      reason: '',
    },
    usersUi: {
      search: '',
      filterRole: '',
      filterTownship: '',
      filterStatus: '',
      showCreate: false,
      createForm: defaultCreateUserForm(),
      createErrors: {},
      createSaving: false,
      detailTab: 'info',
      newStatus: '',
      statusReason: '',
      newPassword: '',
      confirmPw: '',
      newRole: '',
      newTownship: '',
      newDept: '',
      newContractor: '',
      detailSaving: false,
    },
  },
}

// ─── Slice ───────────────────────────────────────────────────────────────────

const superAdminSlice = createSlice({
  name: 'superAdmin',
  initialState,
  reducers: {
    setSuperAdminActiveTab(state, action) {
      state.ui.activeTab = action.payload
    },
    setTenantsUiField(state, action) {
      const { field, value } = action.payload
      if (field in state.ui.tenantsUi) state.ui.tenantsUi[field] = value
    },
    setAddTenantFormField(state, action) {
      const { key, value } = action.payload
      state.ui.tenantsUi.addForm[key] = value
    },
    openAddTenantModal(state) {
      state.ui.tenantsUi.addForm = defaultAddTenantForm()
      state.ui.tenantsUi.addErrors = {}
      state.ui.tenantsUi.addSaving = false
      state.ui.tenantsUi.showAdd = true
    },
    setTenantEditFormField(state, action) {
      const { key, value } = action.payload
      state.ui.tenantsUi.editForm[key] = value
    },
    setTenantSubFormField(state, action) {
      const { key, value } = action.payload
      state.ui.tenantsUi.subForm[key] = value
    },
    setUsersUiField(state, action) {
      const { field, value } = action.payload
      if (field in state.ui.usersUi) state.ui.usersUi[field] = value
    },
    setCreateUserFormField(state, action) {
      const { key, value } = action.payload
      state.ui.usersUi.createForm[key] = value
    },
    patchCreateUserForm(state, action) {
      state.ui.usersUi.createForm = { ...state.ui.usersUi.createForm, ...action.payload }
    },
    openCreateUserModal(state) {
      state.ui.usersUi.createForm = defaultCreateUserForm()
      state.ui.usersUi.createErrors = {}
      state.ui.usersUi.createSaving = false
      state.ui.usersUi.showCreate = true
    },
    setSelectedTenant(state, action) {
      const tenant = action.payload
      state.tenants.selected = tenant
      if (tenant) {
        state.ui.tenantsUi.detailTab = 'details'
        state.ui.tenantsUi.editForm = {
          name: tenant.name || '',
          address: tenant.address || '',
          contact_email: tenant.contact_email || '',
          contact_phone: tenant.contact_phone || '',
        }
        state.ui.tenantsUi.subForm = {
          plan_label: tenant.subscription?.plan_label || 'Enterprise',
          billing_cycle: tenant.subscription?.billing_cycle || 'YEARLY',
          expiry_date: tenant.subscription?.expiry_date || '',
          reason: '',
        }
        state.ui.tenantsUi.confirmSuspend = false
        state.ui.tenantsUi.detailSaving = false
        state.ui.tenantsUi.reason = ''
      }
    },
    clearSelectedTenant(state) {
      state.tenants.selected = null
    },
    setSelectedUser(state, action) {
      const user = action.payload
      state.users.selected = user
      if (user) {
        state.ui.usersUi.detailTab = 'info'
        state.ui.usersUi.newStatus = user.status
        state.ui.usersUi.statusReason = ''
        state.ui.usersUi.newPassword = ''
        state.ui.usersUi.confirmPw = ''
        state.ui.usersUi.newRole = user.role
        state.ui.usersUi.newTownship = user.township_id || ''
        state.ui.usersUi.newDept = user.department_id || ''
        state.ui.usersUi.newContractor = user.contractor_id || ''
        state.ui.usersUi.detailSaving = false
      }
    },
    clearSelectedUser(state) {
      state.users.selected = null
    },
    setSuperAdminNotice(state, action) {
      state.notice = action.payload
    },
    clearSuperAdminNotice(state) {
      state.notice = null
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Reset on logout ──────────────────────────────────────────────────
      .addCase(logoutUser.fulfilled, () => initialState)

      // ── Overview ─────────────────────────────────────────────────────────
      .addCase(fetchSuperAdminOverview.pending, (state) => {
        state.overview.status = 'loading'
        state.overview.error = null
      })
      .addCase(fetchSuperAdminOverview.fulfilled, (state, action) => {
        state.overview.status = 'succeeded'
        state.overview.data = action.payload
      })
      .addCase(fetchSuperAdminOverview.rejected, (state, action) => {
        state.overview.status = 'failed'
        state.overview.error = action.payload
      })

      // ── Tenants ──────────────────────────────────────────────────────────
      .addCase(fetchSuperAdminTenants.pending, (state) => {
        state.tenants.status = 'loading'
        state.tenants.error = null
      })
      .addCase(fetchSuperAdminTenants.fulfilled, (state, action) => {
        state.tenants.status = 'succeeded'
        state.tenants.items = action.payload
      })
      .addCase(fetchSuperAdminTenants.rejected, (state, action) => {
        state.tenants.status = 'failed'
        state.tenants.error = action.payload
        state.notice = { message: action.payload || 'Failed to load tenants', type: 'error' }
      })
      .addCase(fetchSuperAdminTenantById.fulfilled, (state, action) => {
        state.tenants.selected = action.payload
      })

      .addCase(createSuperAdminTenant.pending, (state) => {
        state.actionStatus = 'loading'
        state.actionError = null
      })
      .addCase(createSuperAdminTenant.fulfilled, (state) => {
        state.actionStatus = 'succeeded'
        state.notice = { message: 'Tenant onboarded!', type: 'success' }
      })
      .addCase(createSuperAdminTenant.rejected, (state, action) => {
        state.actionStatus = 'failed'
        state.actionError = action.payload
        state.notice = { message: action.payload || 'Failed to onboard tenant', type: 'error' }
      })

      .addCase(updateSuperAdminTenant.pending, (state) => {
        state.actionStatus = 'loading'
        state.actionError = null
      })
      .addCase(updateSuperAdminTenant.fulfilled, (state) => {
        state.actionStatus = 'succeeded'
        state.tenants.selected = null
        state.notice = { message: 'Tenant updated.', type: 'success' }
      })
      .addCase(updateSuperAdminTenant.rejected, (state, action) => {
        state.actionStatus = 'failed'
        state.actionError = action.payload
        state.notice = { message: action.payload || 'Failed to update tenant', type: 'error' }
      })

      .addCase(updateSuperAdminTenantStatus.pending, (state) => {
        state.actionStatus = 'loading'
        state.actionError = null
      })
      .addCase(updateSuperAdminTenantStatus.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded'
        state.tenants.selected = null
        const label = action.payload.status === 'SUSPENDED' ? 'suspended' : 'reactivated'
        state.notice = { message: `Tenant ${label}.`, type: 'success' }
      })
      .addCase(updateSuperAdminTenantStatus.rejected, (state, action) => {
        state.actionStatus = 'failed'
        state.actionError = action.payload
        state.notice = { message: action.payload || 'Failed to update tenant status', type: 'error' }
      })

      .addCase(updateSuperAdminSubscription.pending, (state) => {
        state.actionStatus = 'loading'
        state.actionError = null
      })
      .addCase(updateSuperAdminSubscription.fulfilled, (state) => {
        state.actionStatus = 'succeeded'
        state.tenants.selected = null
        state.notice = { message: 'Subscription updated.', type: 'success' }
      })
      .addCase(updateSuperAdminSubscription.rejected, (state, action) => {
        state.actionStatus = 'failed'
        state.actionError = action.payload
        state.notice = { message: action.payload || 'Failed to update subscription', type: 'error' }
      })

      // ── Users ────────────────────────────────────────────────────────────
      .addCase(fetchSuperAdminUsers.pending, (state) => {
        state.users.status = 'loading'
        state.users.error = null
      })
      .addCase(fetchSuperAdminUsers.fulfilled, (state, action) => {
        state.users.status = 'succeeded'
        state.users.items = action.payload
      })
      .addCase(fetchSuperAdminUsers.rejected, (state, action) => {
        state.users.status = 'failed'
        state.users.error = action.payload
        state.notice = { message: action.payload || 'Failed to load users', type: 'error' }
      })

      .addCase(createSuperAdminUser.pending, (state) => {
        state.actionStatus = 'loading'
        state.actionError = null
      })
      .addCase(createSuperAdminUser.fulfilled, (state) => {
        state.actionStatus = 'succeeded'
        state.notice = { message: 'User account created.', type: 'success' }
      })
      .addCase(createSuperAdminUser.rejected, (state, action) => {
        state.actionStatus = 'failed'
        state.actionError = action.payload
        state.notice = { message: action.payload || 'Failed to create user account', type: 'error' }
      })

      .addCase(updateSuperAdminUser.pending, (state) => {
        state.actionStatus = 'loading'
        state.actionError = null
      })
      .addCase(updateSuperAdminUser.fulfilled, (state) => {
        state.actionStatus = 'succeeded'
        state.users.selected = null
        state.notice = { message: 'Role & assignment updated.', type: 'success' }
      })
      .addCase(updateSuperAdminUser.rejected, (state, action) => {
        state.actionStatus = 'failed'
        state.actionError = action.payload
        state.notice = { message: action.payload || 'Failed to update user', type: 'error' }
      })

      .addCase(updateSuperAdminUserStatus.pending, (state) => {
        state.actionStatus = 'loading'
        state.actionError = null
      })
      .addCase(updateSuperAdminUserStatus.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded'
        state.users.selected = null
        state.notice = { message: `Account ${action.payload.status.toLowerCase()}.`, type: 'success' }
      })
      .addCase(updateSuperAdminUserStatus.rejected, (state, action) => {
        state.actionStatus = 'failed'
        state.actionError = action.payload
        state.notice = { message: action.payload || 'Failed to update user status', type: 'error' }
      })

      .addCase(resetSuperAdminUserPassword.pending, (state) => {
        state.actionStatus = 'loading'
        state.actionError = null
      })
      .addCase(resetSuperAdminUserPassword.fulfilled, (state) => {
        state.actionStatus = 'succeeded'
        state.users.selected = null
        state.notice = { message: 'Password reset successfully.', type: 'success' }
      })
      .addCase(resetSuperAdminUserPassword.rejected, (state, action) => {
        state.actionStatus = 'failed'
        state.actionError = action.payload
        state.notice = { message: action.payload || 'Failed to reset password', type: 'error' }
      })

      // ── Departments & Contractors ────────────────────────────────────────
      .addCase(fetchSuperAdminDepartments.pending, (state) => {
        state.departments.status = 'loading'
        state.departments.error = null
      })
      .addCase(fetchSuperAdminDepartments.fulfilled, (state, action) => {
        state.departments.status = 'succeeded'
        state.departments.items = action.payload
      })
      .addCase(fetchSuperAdminDepartments.rejected, (state, action) => {
        state.departments.status = 'failed'
        state.departments.error = action.payload
      })

      .addCase(createSuperAdminDepartment.fulfilled, (state) => {
        state.notice = { message: 'Department created.', type: 'success' }
      })
      .addCase(createSuperAdminDepartment.rejected, (state, action) => {
        state.notice = { message: action.payload || 'Failed to create department', type: 'error' }
      })

      .addCase(fetchSuperAdminContractors.pending, (state) => {
        state.contractors.status = 'loading'
        state.contractors.error = null
      })
      .addCase(fetchSuperAdminContractors.fulfilled, (state, action) => {
        state.contractors.status = 'succeeded'
        state.contractors.items = action.payload
      })
      .addCase(fetchSuperAdminContractors.rejected, (state, action) => {
        state.contractors.status = 'failed'
        state.contractors.error = action.payload
      })

      .addCase(createSuperAdminContractor.fulfilled, (state) => {
        state.notice = { message: 'Contractor created.', type: 'success' }
      })
      .addCase(createSuperAdminContractor.rejected, (state, action) => {
        state.notice = { message: action.payload || 'Failed to create contractor', type: 'error' }
      })

      // ── Config, AMC Rates, Health, Audit Logs ────────────────────────────
      .addCase(fetchSuperAdminConfig.pending, (state) => {
        state.config.status = 'loading'
        state.config.error = null
      })
      .addCase(fetchSuperAdminConfig.fulfilled, (state, action) => {
        state.config.status = 'succeeded'
        state.config.items = action.payload
      })
      .addCase(fetchSuperAdminConfig.rejected, (state, action) => {
        state.config.status = 'failed'
        state.config.error = action.payload
      })

      .addCase(updateSuperAdminConfig.fulfilled, (state) => {
        state.notice = { message: 'Configuration updated.', type: 'success' }
      })
      .addCase(updateSuperAdminConfig.rejected, (state, action) => {
        state.notice = { message: action.payload || 'Failed to update configuration', type: 'error' }
      })

      .addCase(fetchSuperAdminAmcRates.pending, (state) => {
        state.amcRates.status = 'loading'
        state.amcRates.error = null
      })
      .addCase(fetchSuperAdminAmcRates.fulfilled, (state, action) => {
        state.amcRates.status = 'succeeded'
        state.amcRates.items = action.payload
      })
      .addCase(fetchSuperAdminAmcRates.rejected, (state, action) => {
        state.amcRates.status = 'failed'
        state.amcRates.error = action.payload
      })

      .addCase(updateSuperAdminAmcRate.fulfilled, (state) => {
        state.notice = { message: 'AMC rate updated.', type: 'success' }
      })
      .addCase(updateSuperAdminAmcRate.rejected, (state, action) => {
        state.notice = { message: action.payload || 'Failed to update AMC rate', type: 'error' }
      })

      .addCase(fetchSuperAdminHealth.pending, (state) => {
        state.health.status = 'loading'
        state.health.error = null
      })
      .addCase(fetchSuperAdminHealth.fulfilled, (state, action) => {
        state.health.status = 'succeeded'
        state.health.data = action.payload
      })
      .addCase(fetchSuperAdminHealth.rejected, (state, action) => {
        state.health.status = 'failed'
        state.health.error = action.payload
      })

      .addCase(fetchSuperAdminAuditLogs.pending, (state) => {
        state.auditLogs.status = 'loading'
        state.auditLogs.error = null
      })
      .addCase(fetchSuperAdminAuditLogs.fulfilled, (state, action) => {
        state.auditLogs.status = 'succeeded'
        state.auditLogs.items = action.payload
      })
      .addCase(fetchSuperAdminAuditLogs.rejected, (state, action) => {
        state.auditLogs.status = 'failed'
        state.auditLogs.error = action.payload
      })
  },
})

export const {
  setSuperAdminActiveTab,
  setTenantsUiField,
  setAddTenantFormField,
  openAddTenantModal,
  setTenantEditFormField,
  setTenantSubFormField,
  setUsersUiField,
  setCreateUserFormField,
  patchCreateUserForm,
  openCreateUserModal,
  setSelectedTenant,
  clearSelectedTenant,
  setSelectedUser,
  clearSelectedUser,
  setSuperAdminNotice,
  clearSuperAdminNotice,
} = superAdminSlice.actions

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectSuperAdminOverview        = (state) => state.superAdmin?.overview?.data || null
export const selectSuperAdminOverviewStatus  = (state) => state.superAdmin?.overview?.status || 'idle'
export const selectSuperAdminOverviewError   = (state) => state.superAdmin?.overview?.error || null

export const selectSuperAdminTenants         = (state) => state.superAdmin?.tenants?.items || []
export const selectSuperAdminSelectedTenant  = (state) => state.superAdmin?.tenants?.selected || null
export const selectSuperAdminTenantsStatus   = (state) => state.superAdmin?.tenants?.status || 'idle'
export const selectSuperAdminTenantsError    = (state) => state.superAdmin?.tenants?.error || null

export const selectSuperAdminUsers           = (state) => state.superAdmin?.users?.items || []
export const selectSuperAdminSelectedUser    = (state) => state.superAdmin?.users?.selected || null
export const selectSuperAdminUsersStatus     = (state) => state.superAdmin?.users?.status || 'idle'
export const selectSuperAdminUsersError      = (state) => state.superAdmin?.users?.error || null

export const selectSuperAdminDepartments     = (state) => state.superAdmin?.departments?.items || []
export const selectSuperAdminDepartmentsStatus = (state) => state.superAdmin?.departments?.status || 'idle'

export const selectSuperAdminContractors     = (state) => state.superAdmin?.contractors?.items || []
export const selectSuperAdminContractorsStatus = (state) => state.superAdmin?.contractors?.status || 'idle'

export const selectSuperAdminConfig          = (state) => state.superAdmin?.config?.items || []
export const selectSuperAdminAmcRates        = (state) => state.superAdmin?.amcRates?.items || []
export const selectSuperAdminHealth          = (state) => state.superAdmin?.health?.data || null
export const selectSuperAdminAuditLogs       = (state) => state.superAdmin?.auditLogs?.items || []

export const selectSuperAdminActionStatus    = (state) => state.superAdmin?.actionStatus || 'idle'
export const selectSuperAdminActionError     = (state) => state.superAdmin?.actionError || null
export const selectSuperAdminNotice          = (state) => state.superAdmin?.notice || null

export const selectSuperAdminActiveTab       = (state) => state.superAdmin?.ui?.activeTab || 'overview'
export const selectSuperAdminTenantsUi       = (state) => state.superAdmin?.ui?.tenantsUi
export const selectSuperAdminUsersUi         = (state) => state.superAdmin?.ui?.usersUi

export default superAdminSlice.reducer

