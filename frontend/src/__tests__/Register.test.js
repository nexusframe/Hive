// src/__tests__/Register.test.js
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import authReducer from '../redux/slices/authSlice'
import Register from '../pages/Register'
import { toast } from 'react-toastify'

// Mock react-toastify to spy on toast calls.
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
  ToastContainer: () => <div data-testid="toast-container" />,
}))

// Instead of mocking axios, mock axiosInstance used by the thunk
jest.mock('../api/axiosInstance', () => ({
  post: jest.fn(),
}))

// Import the mocked axiosInstance for later use in the test
import axiosInstance from '../api/axiosInstance'

// Mock react-router-dom navigation
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom')
  const navigateMock = jest.fn()
  return {
    ...actual,
    useNavigate: () => navigateMock,
    __navigateMock: navigateMock,
  }
})
import { __navigateMock } from 'react-router-dom'

describe('Register Component', () => {
  let store

  beforeEach(() => {
    __navigateMock.mockReset()
    store = configureStore({
      reducer: { auth: authReducer },
    })
  })

  const renderWithProviders = (ui) =>
    render(
      <Provider store={store}>
        <MemoryRouter>{ui}</MemoryRouter>
      </Provider>
    )

  test('renders registration form and submits valid data', async () => {
    // Use axiosInstance instead of axios here
    axiosInstance.post.mockResolvedValueOnce({
      data: { message: 'User registered successfully! Please log in.', user_id: '12345' },
    })

    renderWithProviders(<Register />)

    const usernameInput = screen.getByPlaceholderText(/username/i)
    const emailInput = screen.getByPlaceholderText(/email/i)
    const passwordInput = screen.getByPlaceholderText('Create a password')
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password')
    const registerButton = screen.getByRole('button', { name: /create account/i })

    fireEvent.change(usernameInput, { target: { value: 'newUser' } })
    fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(registerButton)

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('User registered successfully! Please log in.')
      expect(__navigateMock).toHaveBeenCalledWith('/login')
    })
  })

  test('displays error message when registration fails', async () => {
    axiosInstance.post.mockRejectedValueOnce({
      response: { data: { error: 'A user with this username or email already exists.' } },
    })

    renderWithProviders(<Register />)

    const usernameInput = screen.getByPlaceholderText(/username/i)
    const emailInput = screen.getByPlaceholderText(/email/i)
    const passwordInput = screen.getByPlaceholderText('Create a password')
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password')
    const registerButton = screen.getByRole('button', { name: /create account/i })

    fireEvent.change(usernameInput, { target: { value: 'existingUser' } })
    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(registerButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('A user with this username or email already exists.')
    })
  })

  test('shows error when passwords do not match', async () => {
    axiosInstance.post.mockClear()
    renderWithProviders(<Register />)

    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'newUser' } })
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Create a password'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { value: 'differentpassword' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Passwords do not match')
    })
    // Should NOT call the API for THIS test
    expect(axiosInstance.post).not.toHaveBeenCalled()
  })
})
