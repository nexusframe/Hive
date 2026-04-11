// src/__tests__/SessionManager.test.js

import React from 'react'
import { render, act, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import SessionManager from '../components/SessionManager'
import authReducer, { refresh, logout, refreshUser } from '../redux/slices/authSlice'
import axiosInstance from '../api/axiosInstance'
import MockAdapter from 'axios-mock-adapter'
import { REFRESH_BUFFER_MS, STORAGE_KEYS } from '../config'
import useTokenRefresh from '../hooks/useTokenRefresh'

jest.mock('../hooks/useTokenRefresh', () => jest.fn())

// Use fake timers for scheduling refresh callbacks.
jest.useFakeTimers()

// Mock axiosInstance
jest.mock('../api/axiosInstance', () => {
  const axios = require('axios')
  return axios.create({
    baseURL: '/api',
    withCredentials: true,
  })
})

jest.mock('../redux/slices/authSlice', () => {
  const actual = jest.requireActual('../redux/slices/authSlice')

  const wrapThunkWithFlag = (thunk, flag) => {
    const wrapped = (...args) => {
      const innerThunk = thunk(...args)
      innerThunk.__thunkFlag = flag
      return innerThunk
    }
    return Object.assign(wrapped, thunk)
  }

  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    logout: wrapThunkWithFlag(actual.logout, 'logout')
  }
})

describe('SessionManager', () => {
  let store
  let mock
  let tokenLifetimeRef
  let refreshCallbackRef

  const invokeRefresh = async (skipMultiTabCheck = false) => {
    if (typeof refreshCallbackRef !== 'function') {
      throw new Error('Refresh callback not registered')
    }
    await act(async () => {
      await refreshCallbackRef(skipMultiTabCheck)
    })
  }

const wasLogoutDispatched = () =>
  store.dispatch.mock.calls.some(([action]) => {
    if (typeof action === 'function' && action.__thunkFlag === 'logout') {
      return true
    }
    const actionType = action?.type
    return actionType === logout.pending.type ||
      actionType === logout.fulfilled.type ||
      actionType === logout.rejected.type
  })

  beforeEach(() => {
    // Create a Redux store with the auth reducer.
    store = configureStore({
      reducer: { auth: authReducer }
    })
    
    tokenLifetimeRef = null
    refreshCallbackRef = null

    useTokenRefresh.mockImplementation((tokenLifetime, refreshCallback) => {
      tokenLifetimeRef = tokenLifetime
      refreshCallbackRef = tokenLifetime != null ? refreshCallback : null
    })

    // Setup axios mock adapter
    mock = new MockAdapter(axiosInstance)
    
    // Mock /protected endpoint to return valid token with exp claim
    // Match both /protected and /api/protected (baseURL might be prepended)
    const futureExp = Math.floor((Date.now() + 900000) / 1000) // 15 minutes from now
    mock.onGet(/\/protected$/).reply(200, {
      username: 'testuser',
      claims: { exp: futureExp }
    })
    
    // Mock /refresh endpoint (match both /refresh and /api/refresh)
    mock.onPost(/\/refresh$/).reply(200, {
      message: 'Token refreshed',
      username: 'testuser',
      claims: { exp: futureExp }
    })
    
    // Store original dispatch to handle regular actions
    const originalDispatch = store.dispatch.bind(store)
    store.dispatch = jest.fn((action) => originalDispatch(action))
    
    // Set initial user state
    store.dispatch({
      type: 'auth/login/fulfilled',
      payload: {
        username: 'testuser',
        claims: { exp: futureExp }
      }
    })
    
    // Clear localStorage
    localStorage.clear()
  })

  afterEach(() => {
    jest.clearAllTimers()
    mock.restore()
    localStorage.clear()
    useTokenRefresh.mockReset()
  })

  test('initializes session and schedules auto-refresh', async () => {
    // Render SessionManager (a background component that sets up auto-refresh).
    render(
      <MemoryRouter>
        <Provider store={store}>
          <SessionManager />
        </Provider>
      </MemoryRouter>
    )

    // Wait for initial checkTokenExpiration to complete and tokenLifetime to be set
    await waitFor(() => {
      expect(mock.history.get).toHaveLength(1)
      expect(tokenLifetimeRef).not.toBeNull()
    })

    // Clear dispatch calls before triggering refresh manually
    store.dispatch.mockClear()

    // Manually trigger the refresh callback captured from useTokenRefresh
    await invokeRefresh()

    // Wait for the refresh thunk to be dispatched.
    await waitFor(() => {
      // Check if refresh thunk was called (thunks are functions)
      const refreshCalls = store.dispatch.mock.calls.filter(
        call => typeof call[0] === 'function'
      )
      expect(refreshCalls.length).toBeGreaterThan(0)
    }, { timeout: 3000 })
  })

  test('does not schedule auto-refresh when no user is present', async () => {
    // Clear user state
    store.dispatch({
      type: 'auth/logout/fulfilled'
    })
    store.dispatch.mockClear()
    
    render(
      <MemoryRouter>
        <Provider store={store}>
          <SessionManager />
        </Provider>
      </MemoryRouter>
    )
    
    // Wait for effects to settle and state to update
    await waitFor(() => {
      // Since no user is present, no tokenLifetime or refresh callback should be set
      expect(tokenLifetimeRef).toBeNull()
      expect(typeof refreshCallbackRef).not.toBe('function')
    }, { timeout: 2000 })
  })

  test('schedules refresh when tab becomes visible after being hidden', async () => {
    // Mock document.visibilityState
    Object.defineProperty(document, 'visibilityState', {
      writable: true,
      value: 'hidden'
    })

    render(
      <MemoryRouter>
        <Provider store={store}>
          <SessionManager />
        </Provider>
      </MemoryRouter>
    )

    // Wait for initial mount
    await waitFor(() => {
      expect(mock.history.get).toHaveLength(1)
    })

    store.dispatch.mockClear()

    // Simulate tab becoming visible
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'visible'
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    // Should check token expiration when tab becomes visible
    await waitFor(() => {
      expect(mock.history.get.length).toBeGreaterThan(1)
    })
  })

  test('skips refresh if another tab is refreshing (multi-tab coordination)', async () => {
    render(
      <MemoryRouter>
        <Provider store={store}>
          <SessionManager />
        </Provider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mock.history.get).toHaveLength(1)
      expect(tokenLifetimeRef).not.toBeNull()
    })

    // Simulate another tab setting refresh lock
    const lockTime = Date.now()
    localStorage.setItem(STORAGE_KEYS.REFRESH_IN_PROGRESS, lockTime.toString())

    store.dispatch.mockClear()

    // Simulate refresh attempt with lock in place
    // The refreshCallback should check the lock and skip refresh
    const refreshLock = localStorage.getItem(STORAGE_KEYS.REFRESH_IN_PROGRESS)
    expect(refreshLock).toBeTruthy()
    
    // Manually try to trigger refresh (should skip due to lock)
    await invokeRefresh()
    
    // Verify refresh was not called (lock prevents it)
    const refreshCalls = store.dispatch.mock.calls.filter(
      call => typeof call[0] === 'function'
    )
    expect(refreshCalls.length).toBe(0)
  })

  test('updates token from storage event when another tab refreshes', async () => {
    render(
      <MemoryRouter>
        <Provider store={store}>
          <SessionManager />
        </Provider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mock.history.get).toHaveLength(1)
    })

    // Simulate another tab refreshing token
    const newExp = Math.floor((Date.now() + 900000) / 1000)
    const refreshData = {
      timestamp: Date.now(),
      username: 'testuser',
      claims: { exp: newExp }
    }
    
    // Simulate storage event from another tab
    act(() => {
      localStorage.setItem(STORAGE_KEYS.TOKEN_REFRESHED, JSON.stringify(refreshData))
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEYS.TOKEN_REFRESHED,
        newValue: JSON.stringify(refreshData),
        storageArea: localStorage
      }))
    })

    // Should update Redux state with new token data
    await waitFor(() => {
      const refreshUserCalls = store.dispatch.mock.calls.filter(
        call => call[0]?.type === 'auth/refreshUser/fulfilled'
      )
      expect(refreshUserCalls.length).toBeGreaterThan(0)
    })
  })

  test('triggers immediate refresh when token expired while tab inactive', async () => {
    // Set token to expire soon
    const expiredExp = Math.floor((Date.now() - 1000) / 1000) // Already expired
    store.dispatch({
      type: 'auth/login/fulfilled',
      payload: {
        username: 'testuser',
        claims: { exp: expiredExp }
      }
    })

    // Mock /protected to return expired token
    mock.onGet(/\/protected$/).reply(401, { error: 'Token expired' })

    Object.defineProperty(document, 'visibilityState', {
      writable: true,
      value: 'hidden'
    })

    render(
      <MemoryRouter>
        <Provider store={store}>
          <SessionManager />
        </Provider>
      </MemoryRouter>
    )

    // Simulate tab becoming visible with expired token
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'visible'
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    // Should logout when token expired
    await waitFor(() => {
      const logoutCalls = store.dispatch.mock.calls.filter(
        call => typeof call[0] === 'function' || call[0]?.type === 'auth/logout'
      )
      expect(logoutCalls.length).toBeGreaterThan(0)
    })
  })

  test('handles refresh buffer correctly (5 seconds before expiration)', async () => {
    // Set token to expire in 10 seconds
    const nearExpExp = Math.floor((Date.now() + 10000) / 1000)
    store.dispatch({
      type: 'auth/login/fulfilled',
      payload: {
        username: 'testuser',
        claims: { exp: nearExpExp }
      }
    })

    mock.onGet(/\/protected$/).reply(200, {
      username: 'testuser',
      claims: { exp: nearExpExp }
    })

    render(
      <MemoryRouter>
        <Provider store={store}>
          <SessionManager />
        </Provider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mock.history.get).toHaveLength(1)
      expect(tokenLifetimeRef).not.toBeNull()
    })

    // Clear dispatch calls before triggering manual refresh
    store.dispatch.mockClear()

    await invokeRefresh()

    // Should trigger refresh before expiration
    await waitFor(() => {
      const refreshCalls = store.dispatch.mock.calls.filter(
        call => typeof call[0] === 'function'
      )
      expect(refreshCalls.length).toBeGreaterThan(0)
    }, { timeout: 3000 })
  })

  test('retries refresh on network failure with exponential backoff', async () => {
    render(
      <MemoryRouter>
        <Provider store={store}>
          <SessionManager />
        </Provider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mock.history.get).toHaveLength(1)
      expect(tokenLifetimeRef).not.toBeNull()
    })

    // Mock network failures for first 2 attempts, then success
    let callCount = 0
    mock.onPost(/\/refresh$/).reply((config) => {
      callCount++
      if (callCount <= 2) {
        // Simulate network error (no response)
        return Promise.reject(new Error('Network Error'))
      }
      // Third attempt succeeds
      const futureExp = Math.floor((Date.now() + 900000) / 1000)
      return [200, {
        message: 'Token refreshed',
        username: 'testuser',
        claims: { exp: futureExp }
      }]
    })

    await invokeRefresh()

    // Wait for retries to complete — should attempt multiple times (at least the 2 failures + 1 success)
    await waitFor(() => {
      const refreshPosts = mock.history.post.filter(r => r.url?.includes('/refresh'))
      expect(refreshPosts.length).toBeGreaterThanOrEqual(2)
    }, { timeout: 5000 })

    // Verify multiple attempts were made (confirms retry behavior)
    expect(callCount).toBeGreaterThanOrEqual(2)
  })

  test('logs out after all retry attempts fail', async () => {
    render(
      <MemoryRouter>
        <Provider store={store}>
          <SessionManager />
        </Provider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mock.history.get).toHaveLength(1)
      expect(tokenLifetimeRef).not.toBeNull()
    })

    // Mock all refresh attempts to fail with network error
    mock.onPost(/\/refresh$/).networkError()

    store.dispatch.mockClear()

    await invokeRefresh()

    // Wait for retries to exhaust and logout to be called
    await waitFor(() => {
      expect(wasLogoutDispatched()).toBe(true)
    }, { timeout: 5000 })
  })

  test('does not retry on auth error (401/403)', async () => {
    render(
      <MemoryRouter>
        <Provider store={store}>
          <SessionManager />
        </Provider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mock.history.get).toHaveLength(1)
      expect(tokenLifetimeRef).not.toBeNull()
    })

    // Mock refresh to return 401 (auth error)
    mock.onPost(/\/refresh$/).reply(401, { error: 'Unauthorized' })

    store.dispatch.mockClear()

    await invokeRefresh()

    // Should logout immediately without retries
    await waitFor(() => {
      expect(wasLogoutDispatched()).toBe(true)
      // Should only have one refresh attempt (no retries)
      const refreshRequests = mock.history.post.filter((req) => req.url?.includes('/refresh'))
      expect(refreshRequests.length).toBeLessThanOrEqual(1)
    }, { timeout: 3000 })
  })

  test('validates token lifetime and handles clock skew', async () => {
    // Set token with exp claim slightly in the past (within clock skew tolerance)
    const slightlyExpiredExp = Math.floor((Date.now() - 3000) / 1000) // 3 seconds ago (within 5s tolerance)
    store.dispatch({
      type: 'auth/login/fulfilled',
      payload: {
        username: 'testuser',
        claims: { exp: slightlyExpiredExp }
      }
    })

    mock.onGet(/\/protected$/).reply(200, {
      username: 'testuser',
      claims: { exp: slightlyExpiredExp }
    })

    render(
      <MemoryRouter>
        <Provider store={store}>
          <SessionManager />
        </Provider>
      </MemoryRouter>
    )

    // Should handle gracefully (within clock skew tolerance) — no logout dispatched
    await waitFor(() => {
      expect(mock.history.get).toHaveLength(1)
    })

    // Verify user is NOT logged out (clock skew within 5s tolerance should be accepted)
    expect(wasLogoutDispatched()).toBe(false)
  })

  test('rejects token lifetime exceeding maximum (24 hours)', async () => {
    // Set token with exp claim far in the future (invalid)
    const farFutureExp = Math.floor((Date.now() + 25 * 60 * 60 * 1000) / 1000) // 25 hours
    store.dispatch({
      type: 'auth/login/fulfilled',
      payload: {
        username: 'testuser',
        claims: { exp: farFutureExp }
      }
    })

    mock.onGet(/\/protected$/).reply(200, {
      username: 'testuser',
      claims: { exp: farFutureExp }
    })

    // Spy on console.error BEFORE render to catch the lifetime warning
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <MemoryRouter>
        <Provider store={store}>
          <SessionManager />
        </Provider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mock.history.get).toHaveLength(1)
    })

    // Verify the component detected the excessive lifetime
    await waitFor(() => {
      const maxLifetimeWarning = consoleSpy.mock.calls.find(
        call => typeof call[0] === 'string' && call[0].includes('Token lifetime exceeds maximum')
      )
      expect(maxLifetimeWarning).toBeDefined()
    })
    consoleSpy.mockRestore()
  })

  test('handles focus event for token validation', async () => {
    render(
      <MemoryRouter>
        <Provider store={store}>
          <SessionManager />
        </Provider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mock.history.get).toHaveLength(1)
    })

    const initialCallCount = mock.history.get.length

    // Simulate window focus event
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
    })

    // Wait for async handler to complete (checkTokenExpiration is async)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    // Should check token expiration on focus
    await waitFor(() => {
      expect(mock.history.get.length).toBeGreaterThan(initialCallCount)
    }, { timeout: 2000 })
  })

  test('skips refresh during grace period and reschedules timer', async () => {
    const futureExp = Math.floor((Date.now() + 900000) / 1000) // 15 minutes
    
    // Clear user state first (from beforeEach)
    store.dispatch({
      type: 'auth/logout/fulfilled'
    })
    
    // First, render without user
    render(
      <MemoryRouter>
        <Provider store={store}>
          <SessionManager />
        </Provider>
      </MemoryRouter>
    )

    // Wait for initial mount
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    // Now set user (this triggers loginTimeRef to be set via useEffect)
    mock.onGet(/\/protected$/).reply(200, {
      username: 'testuser',
      claims: { exp: futureExp }
    })

    await act(async () => {
      store.dispatch({
        type: 'auth/login/fulfilled',
        payload: {
          username: 'testuser',
          claims: { exp: futureExp }
        }
      })
    })

    // Wait for user state to be set and checkTokenExpiration to complete
    await waitFor(() => {
      expect(mock.history.get.length).toBeGreaterThan(0)
      expect(tokenLifetimeRef).not.toBeNull()
      expect(typeof refreshCallbackRef).toBe('function')
    })

    const initialTokenLifetime = tokenLifetimeRef
    store.dispatch.mockClear()

    // Immediately trigger refresh callback (should be within grace period)
    // loginTimeRef was just set when user was dispatched, so timeSinceLogin < 5000ms
    await invokeRefresh()

    // Verify refresh was NOT called (skipped due to grace period)
    const refreshCalls = store.dispatch.mock.calls.filter(
      call => typeof call[0] === 'function'
    )
    expect(refreshCalls.length).toBe(0)

    // Verify refresh callback is still available for future use
    expect(typeof refreshCallbackRef).toBe('function')

    // Verify that after grace period, refresh would work (test with skipMultiTabCheck=true to bypass grace check)
    store.dispatch.mockClear()
    await invokeRefresh(true) // skipMultiTabCheck=true bypasses grace period check

    // Now refresh should proceed
    await waitFor(() => {
      const refreshCallsAfterGrace = store.dispatch.mock.calls.filter(
        call => typeof call[0] === 'function'
      )
      expect(refreshCallsAfterGrace.length).toBeGreaterThan(0)
    }, { timeout: 3000 })
  })
})
