// src/components/PersistLogin.js
import React, { useEffect, useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { refreshUser } from '../redux/slices/authSlice'
import { IS_DEVELOPMENT } from '../config'

const PersistLogin = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const [persistDone, setPersistDone] = useState(false)
  const userRef = React.useRef(null)
  const loginTimeRef = React.useRef(null)

  // Track when user is set (after login)
  React.useEffect(() => {
    if (user && !userRef.current) {
      // User was just set (login happened)
      loginTimeRef.current = Date.now()
      if (IS_DEVELOPMENT) {
        console.log("[PersistLogin] User just logged in, skipping refreshUser check")
      }
    }
    userRef.current = user
  }, [user])

  useEffect(() => {
    // If user was just set (within last 5 seconds), skip refreshUser
    // This avoids cookie timing issues immediately after login
    const timeSinceLogin = loginTimeRef.current ? Date.now() - loginTimeRef.current : Infinity
    const GRACE_PERIOD_MS = 5000
    
    if (user && timeSinceLogin < GRACE_PERIOD_MS) {
      if (IS_DEVELOPMENT) {
        console.log(`[PersistLogin] User just logged in (${timeSinceLogin}ms ago), skipping refreshUser`)
      }
      setPersistDone(true)
      return
    }
    
    // Dispatch refreshUser and mark persist as done when complete
    dispatch(refreshUser())
      .unwrap()
      .catch(() => {
        // refreshUser failed - user state is already cleared by the thunk
        // No need to do anything here, just let persistDone be set
      })
      .finally(() => setPersistDone(true))
  }, [dispatch])

  // While waiting for refreshUser to complete, display a loading indicator.
  if (!persistDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-stone-500 text-sm">Restoring session...</span>
      </div>
    )
  }

  // If persist is done and there's no user, redirect to login immediately.
  // This handles cases where token expired and user was logged out automatically.
  // useSelector ensures this component re-renders when user state changes.
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Otherwise, render the child routes.
  return <Outlet />
}

export default PersistLogin
