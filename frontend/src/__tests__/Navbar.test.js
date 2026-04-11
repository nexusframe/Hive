// src/__tests__/Navbar.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { createAppStore } from '../redux/store'
import { MemoryRouter } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { logout } from '../redux/slices/authSlice'

// Mock react-toastify to avoid actual toasts during tests.
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock useNavigate from react-router-dom.
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => jest.fn(),
  }
})

describe('Navbar Component', () => {
  test('displays Register and Login when user is not authenticated', () => {
    const store = createAppStore({
      auth: { user: null, loading: false, error: null },
    })

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </Provider>
    )

    expect(screen.getByText(/register/i)).toBeInTheDocument()
    expect(screen.getByText(/login/i)).toBeInTheDocument()
  })

  test('displays Profile and Logout when user is authenticated', () => {
    const store = createAppStore({
      auth: { user: { username: 'testUser', email: 'test@example.com' }, loading: false, error: null },
    })

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </Provider>
    )

    expect(screen.getByText('testUser')).toBeInTheDocument()
    expect(screen.getByText(/logout/i)).toBeInTheDocument()
  })

  test('calls logout when Logout button is clicked', async () => {
    const store = createAppStore({
      auth: { user: { username: 'testUser', email: 'test@example.com' }, loading: false, error: null },
    })
    // Spy on dispatch
    const dispatchSpy = jest.spyOn(store, 'dispatch')

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </Provider>
    )

    const logoutButton = screen.getByText(/logout/i)
    fireEvent.click(logoutButton)
    // Check that dispatch was called with a function (the thunk)
    expect(typeof dispatchSpy.mock.calls[0][0]).toBe('function')
  })
})
