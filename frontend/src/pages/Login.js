// src/pages/Login.js
import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { login } from '../redux/slices/authSlice'
import { toast } from 'react-toastify'
import AsyncButton from '../components/AsyncButton'

const Login = () => {
  const [formData, setFormData] = useState({
    username_or_email: '',
    password: '',
  })
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  useEffect(() => {
    if (user) {
      navigate('/profile', { replace: true })
    }
  }, [user, navigate])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleClick = async (e) => {
    e.preventDefault()
    try {
      const resultAction = await dispatch(login(formData))
      if (login.fulfilled.match(resultAction)) {
        toast.success('Login successful', { autoClose: 1500 });
        navigate('/profile')
      } else {
        console.error('[Login] Login failed:', resultAction.payload)
        let errorMsg = 'Login failed'
        if (typeof resultAction.payload === 'string') {
          errorMsg = resultAction.payload
        } else if (resultAction.payload) {
          errorMsg = resultAction.payload.message || resultAction.payload.error || JSON.stringify(resultAction.payload)
        }
        toast.error(errorMsg)
      }
    } catch (error) {
      console.error('[Login] Exception caught:', error)
      console.error('[Login] Error details:', error.response?.data || error.message || error)
      const errorMsg = error.response?.data?.message ||
                       error.response?.data?.error ||
                       error.message ||
                       'Login failed'
      toast.error(errorMsg)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Welcome back</h1>
          <p className="text-stone-500 mt-1">Sign in to your Hive account</p>
        </div>

        <div className="card p-8">
          <form autoComplete="off" className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Username or Email
              </label>
              <input
                name="username_or_email"
                type="text"
                placeholder="Enter your username or email"
                value={formData.username_or_email}
                onChange={handleChange}
                autoComplete="username"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Password
              </label>
              <input
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                className="input-field"
              />
            </div>
            <AsyncButton
              type="submit"
              initialLabel="Sign in"
              loadingLabel="Signing in..."
              onClick={handleClick}
              className="btn-primary w-full"
            />
          </form>
        </div>

        <p className="text-center text-sm text-stone-500 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-600 font-medium hover:text-brand-700">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
