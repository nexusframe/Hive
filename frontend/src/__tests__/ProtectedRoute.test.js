// src/__tests__/ProtectedRoute.test.js
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import authReducer from '../redux/slices/authSlice'
import ProtectedRoute from '../components/ProtectedRoute'
import Profile from '../pages/Profile'
import axiosInstance from '../api/axiosInstance'
import MockAdapter from 'axios-mock-adapter'

// Mock axios instance
const mock = new MockAdapter(axiosInstance)

describe('ProtectedRoute', () => {
  const renderWithProviders = (store, initialEntries) => {
    return render(
      <Provider store={store}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>
    )
  }

  test('redirects to login when user is not authenticated', () => {
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: { auth: { user: null, loading: false, error: null } },
    })

    renderWithProviders(store, ['/profile'])
    // Use test id to ensure a unique match.
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  test('renders protected component when user is authenticated', async () => {
    // Mock the /protected endpoint that Profile component calls
    mock.onGet('/protected').reply(200, {
      username: 'testUser',
      claims: { sub: 'testUser', role: 'regular' }
    })

    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: { user: { username: 'testUser', email: 'test@example.com' }, loading: false, error: null },
      },
    })

    renderWithProviders(store, ['/profile'])
    
    // Wait for loading to complete - first wait for "Loading profile..." to disappear
    await waitFor(() => {
      expect(screen.queryByText(/loading profile/i)).not.toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Then verify profile content is displayed - use heading for Profile and check username
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
      expect(screen.getAllByText(/testUser/i).length).toBeGreaterThan(0)
    }, { timeout: 3000 })
  })

  afterEach(() => {
    mock.reset()
  })
})
