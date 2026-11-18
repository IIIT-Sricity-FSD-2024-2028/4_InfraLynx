// Redux slice for Master data (contractors and AMC rates)
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { masterApi } from '../../services/api.js'

// Fetch all empanelled contractors
export const fetchContractors = createAsyncThunk(
  'masterData/fetchContractors',
  async (_, { rejectWithValue }) => {
    try {
      const data = await masterApi.getContractors()
      return Array.isArray(data) ? data : []
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch contractors')
    }
  }
)

// Fetch all AMC rate schedule entries
export const fetchAmcRates = createAsyncThunk(
  'masterData/fetchAmcRates',
  async (_, { rejectWithValue }) => {
    try {
      const data = await masterApi.getAmcRates()
      return Array.isArray(data) ? data : []
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch AMC rates')
    }
  }
)

const masterDataSlice = createSlice({
  name: 'masterData',
  initialState: {
    contractors: [],
    amcRates: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchContractors
      .addCase(fetchContractors.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchContractors.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.contractors = action.payload
      })
      .addCase(fetchContractors.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })

      // fetchAmcRates
      .addCase(fetchAmcRates.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchAmcRates.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.amcRates = action.payload
      })
      .addCase(fetchAmcRates.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
  },
})

export const selectAllContractors   = (state) => state.masterData?.contractors || []
export const selectAllAmcRates      = (state) => state.masterData?.amcRates || []
export const selectMasterDataStatus = (state) => state.masterData?.status || 'idle'
export const selectMasterDataError  = (state) => state.masterData?.error || null

export default masterDataSlice.reducer
