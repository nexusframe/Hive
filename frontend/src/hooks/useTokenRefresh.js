import { useEffect, useRef } from 'react'
import { IS_DEVELOPMENT } from '../config'

/**
 * Custom hook to automatically refresh an access token.
 *
 * @param {number} tokenExpirationTime - The timestamp when the token expires.
 * @param {Function} refreshCallback - The function to call to refresh the token.
 * @param {number} buffer - Time in milliseconds to subtract from expiration time (default is 5000ms).
 * @param {Function} onError - Optional callback for handling errors.
 */
const useTokenRefresh = (tokenExpirationTime, refreshCallback, buffer = 5000, onError) => {
  const refreshTimeout = useRef(null)

  useEffect(() => {
    if (IS_DEVELOPMENT) {
      console.log("[useTokenRefresh] Effect triggered")
      console.log("[useTokenRefresh] tokenExpirationTime:", tokenExpirationTime)
      console.log("[useTokenRefresh] buffer:", buffer, "ms")
    }
    
    // Clear any existing timer when dependencies change.
    if (refreshTimeout.current) {
      if (IS_DEVELOPMENT) {
        console.log("[useTokenRefresh] Clearing existing timer")
      }
      clearTimeout(refreshTimeout.current)
      refreshTimeout.current = null
    }

    // Token expiration validation: handle edge cases
    if (tokenExpirationTime == null) {
      if (IS_DEVELOPMENT) {
        console.log("[useTokenRefresh] tokenExpirationTime is null - user not authenticated, skipping timer setup")
      }
      return
    }
    
    // Validate tokenExpirationTime is a number
    if (typeof tokenExpirationTime !== 'number' || isNaN(tokenExpirationTime)) {
      console.warn("[useTokenRefresh] Invalid tokenExpirationTime:", tokenExpirationTime, "- skipping timer setup")
      return
    }
    
    const currentTime = Date.now()
    const timeLeft = tokenExpirationTime - currentTime
    
    // Handle expired tokens (within clock skew tolerance)
    const CLOCK_SKEW_TOLERANCE_MS = 5000
    if (timeLeft < -CLOCK_SKEW_TOLERANCE_MS) {
      console.warn("[useTokenRefresh] Token expired (timeLeft:", timeLeft, "ms), skipping timer setup")
      return
    }
    
    // Bounds checking: reject expiration times too far in future (> 24h from now)
    const MAX_LIFETIME_MS = 24 * 60 * 60 * 1000 // 24 hours
    if (timeLeft > MAX_LIFETIME_MS) {
      console.warn("[useTokenRefresh] Expiration time too far in future (", timeLeft, "ms), likely calculation error, skipping timer setup")
      return
    }
    
    // If timeLeft <= buffer, token expires too soon to schedule refresh
    if (timeLeft <= buffer) {
      console.warn("[useTokenRefresh] Token expires too soon (", timeLeft, "ms <= buffer", buffer, "ms), skipping timer setup")
      return
    }

    const delay = timeLeft - buffer
    
    if (IS_DEVELOPMENT) {
      const delayMinutes = Math.floor(delay / 60000)
      const delaySeconds = Math.floor((delay % 60000) / 1000)
      console.log("[useTokenRefresh] Time left:", timeLeft, "ms")
      console.log("[useTokenRefresh] Buffer:", buffer, "ms")
      console.log("[useTokenRefresh] Calculated delay:", delayMinutes, "min", delaySeconds, "sec (", delay, "ms)")
      console.log("[useTokenRefresh] Timer will trigger at:", new Date(currentTime + delay).toLocaleTimeString())
    }

    refreshTimeout.current = setTimeout(() => {
      if (IS_DEVELOPMENT) {
        const now = new Date().toLocaleTimeString()
        console.log("[useTokenRefresh] Token refresh timer triggered at", now)
      }
      refreshCallback()
      // Clear the timeout reference so that a new timer can be scheduled after refresh.
      refreshTimeout.current = null
    }, delay)

    return () => {
      if (refreshTimeout.current) {
        clearTimeout(refreshTimeout.current)
        refreshTimeout.current = null
      }
    }
  }, [tokenExpirationTime, refreshCallback, buffer, onError])
}

export default useTokenRefresh
