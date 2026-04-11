import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import authReducer from '../redux/slices/authSlice'
import Login from '../pages/Login'
import { toast } from 'react-toastify'

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  ToastContainer: () => <div />,
}))

jest.mock('../api/axiosInstance', () => ({
  post: jest.fn(),
}))
import axiosInstance from '../api/axiosInstance'

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

describe('Login Page', () => {
  let store

  beforeEach(() => {
    __navigateMock.mockReset()
    axiosInstance.post.mockReset()
    toast.success.mockReset()
    toast.error.mockReset()
    store = configureStore({ reducer: { auth: authReducer } })
  })

  const renderLogin = () =>
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </Provider>
    )

  test('renders login form with inputs and button', () => {
    renderLogin()
    expect(screen.getByPlaceholderText(/username or email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByText(/create one/i)).toBeInTheDocument()
  })

  test('successful login navigates to profile', async () => {
    const claims = { sub: 'testuser', role: 'regular', exp: 9999999999 }
    axiosInstance.post.mockResolvedValueOnce({
      data: { message: 'Login successful', username: 'testuser', claims }
    })

    renderLogin()

    fireEvent.change(screen.getByPlaceholderText(/username or email/i), { target: { value: 'testuser' } })
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Login successful', expect.any(Object))
      expect(__navigateMock).toHaveBeenCalledWith('/profile')
    })
  })

  test('failed login shows error toast', async () => {
    axiosInstance.post.mockRejectedValueOnce({
      response: { data: { error: 'Invalid credentials' } }
    })

    renderLogin()

    fireEvent.change(screen.getByPlaceholderText(/username or email/i), { target: { value: 'wrong' } })
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
  })

  test('redirects to profile if already logged in', async () => {
    store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: { auth: { user: { username: 'testuser' }, loading: false, error: null } }
    })

    renderLogin()

    await waitFor(() => {
      expect(__navigateMock).toHaveBeenCalledWith('/profile', { replace: true })
    })
  })
})
