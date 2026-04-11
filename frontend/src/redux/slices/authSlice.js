// src/redux/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axiosInstance from '../../api/axiosInstance'

export const login = createAsyncThunk(
  'auth/login',
  async ({ username_or_email, password }, { rejectWithValue }) => {
    try {
      // Login endpoint now returns user data directly, avoiding cookie timing issues
      const loginResp = await axiosInstance.post(
        '/login',
        { username_or_email, password },
        { withCredentials: true }
      )
      
      // Return user data from login response (same format as /protected)
      return {
        username: loginResp.data.username,
        claims: loginResp.data.claims
      }
    } catch (error) {
      // Log error for debugging
      console.error('[authSlice] Login error:', error.response?.data || error.message)
      return rejectWithValue(error.response?.data || { message: 'Login failed' })
    }
  }
)

export const register = createAsyncThunk(
  'auth/register',
  async ({ username, email, password }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        '/register',
        { username, email, password },
        { withCredentials: true }
      )
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Registration failed')
    }
  }
)

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await axiosInstance.post('/logout', {}, { withCredentials: true });
      return;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Logout failed');
    }
  }
)

export const refresh = createAsyncThunk(
  'auth/refresh',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.post('/refresh', {}, { withCredentials: true })
      // Refresh endpoint now returns user data with claims, update state directly
      if (response.data?.username && response.data?.claims) {
        // Update user state with data from refresh response (no need for extra /protected call)
        dispatch(refreshUser.fulfilled({
          username: response.data.username,
          claims: response.data.claims
        }))
      } else {
        // Fallback to /protected if response format unexpected
        await dispatch(refreshUser())
      }
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Refresh failed')
    }
  }
)

// New: refreshUser thunk to re-fetch the user session
export const refreshUser = createAsyncThunk(
  'auth/refreshUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/protected', { withCredentials: true })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Refresh user failed')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, loading: false, error: null },
  reducers: {
    clearError(state) {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(register.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(logout.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false
        state.user = null
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
        state.user = null
      })
      .addCase(refresh.pending, (state) => {
        state.error = null
      })
      .addCase(refresh.fulfilled, (state) => {
        state.error = null
        // User state is updated via refreshUser thunk
      })
      .addCase(refresh.rejected, (state, action) => {
        // Don't clear user state on refresh failure - might be cookie issue
        // User stays logged in, but refresh failed
        state.error = action.payload
      })
      .addCase(refreshUser.pending, (state) => {
        state.loading = true
      })
      .addCase(refreshUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload
      })
      .addCase(refreshUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
        // Don't clear user state on refreshUser failure - might be cookie issue
        // User stays logged in with existing state
      })
  }
})

export const { clearError } = authSlice.actions
export default authSlice.reducer
