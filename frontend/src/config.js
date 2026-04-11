// API Base URL configuration
// Uses proxy when running locally (npm start) - makes requests same-origin for cookies
// Override with REACT_APP_API_BASE_URL if needed
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || ''

// Token refresh buffer - time before expiration to trigger refresh (in milliseconds)
export const REFRESH_BUFFER_MS = parseInt(process.env.REACT_APP_REFRESH_BUFFER_MS || '5000', 10)

// Multi-tab coordination keys
export const STORAGE_KEYS = {
  REFRESH_IN_PROGRESS: 'hive_refresh_in_progress',
  TOKEN_REFRESHED: 'hive_token_refreshed'
}

// Periodic check interval - fallback safety net (in milliseconds)
// Reduced frequency since proactive refresh handles most cases
export const PERIODIC_CHECK_INTERVAL_MS = parseInt(process.env.REACT_APP_PERIODIC_CHECK_INTERVAL_MS || '60000', 10) // 60 seconds

// Development mode check
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'