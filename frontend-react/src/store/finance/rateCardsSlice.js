// Redux slice for Finance rate cards (financeApi.getRateCards)
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { financeApi } from '../../services/api.js'

// Fetch all AMC rate cards
export const fetchRateCards = createAsyncThunk(
  'financeRateCards/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const data = await financeApi.getRateCards()
      return Array.isArray(data) ? data : []
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch rate cards')
    }
  }
)

const rateCardsSlice = createSlice({
  name: 'financeRateCards',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
    selectedDept: 'ALL',
  },
  reducers: {
    setRateCardDeptFilter(state, action) {
      state.selectedDept = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRateCards.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchRateCards.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(fetchRateCards.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
  },
})

export const { setRateCardDeptFilter } = rateCardsSlice.actions

export const selectAllRateCards        = (state) => state.financeRateCards?.items || []
export const selectRateCardsStatus     = (state) => state.financeRateCards?.status || 'idle'
export const selectRateCardsError      = (state) => state.financeRateCards?.error || null
export const selectRateCardDeptFilter  = (state) => state.financeRateCards?.selectedDept || 'ALL'

export default rateCardsSlice.reducer
