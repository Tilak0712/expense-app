// Session Manager for POV Apps
// This library connects POV apps to the unified login system

export interface SessionData {
  sessionId: string
  userId: string
  expiresAt: string
  user: {
    id: string
    employeeId: string
    email: string
    fullName: string
    role: string
  }
}

export interface ValidationResult {
  valid: boolean
  user?: SessionData['user']
  error?: string
}

const UNIFIED_LOGIN_URL = 'http://localhost:3003/login'

/**
 * Validate session with unified login server
 */
export async function validateSession(
  sessionId: string,
  userId: string
): Promise<ValidationResult> {
  try {
    const response = await fetch('http://localhost:3003/api/auth/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, userId }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { valid: false, error: data.error || 'Session validation failed' }
    }

    return { valid: true, user: data.user }
  } catch (error) {
    console.error('Session validation error:', error)
    return { valid: false, error: 'Network error' }
  }
}

/**
 * Logout from unified login server
 */
export async function logoutSession(
  sessionId: string,
  userId: string
): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3003/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, userId }),
    })

    const data = await response.json()
    return data.success || false
  } catch (error) {
    console.error('Logout error:', error)
    return false
  }
}

/**
 * Get session from localStorage
 */
export function getSessionFromStorage(): SessionData | null {
  if (typeof window === 'undefined') return null

  const sessionId = localStorage.getItem('sessionId')
  const sessionExpiresAt = localStorage.getItem('sessionExpiresAt')
  const userStr = localStorage.getItem('user')

  if (!sessionId || !sessionExpiresAt || !userStr) {
    return null
  }

  try {
    const user = JSON.parse(userStr)
    return {
      sessionId,
      userId: user.id,
      expiresAt: sessionExpiresAt,
      user,
    }
  } catch {
    return null
  }
}

/**
 * Initialize session from URL query parameters (after redirect from unified login)
 */
export function initializeSessionFromUrl(): boolean {
  if (typeof window === 'undefined') return false

  const urlParams = new URLSearchParams(window.location.search)
  const sessionId = urlParams.get('sessionId')
  const userId = urlParams.get('userId')
  const expiresAt = urlParams.get('expiresAt')
  const employeeId = urlParams.get('employeeId')
  const email = urlParams.get('email')
  const fullName = urlParams.get('fullName')
  const role = urlParams.get('role')

  if (!sessionId || !userId || !expiresAt) {
    return false
  }

  // Store session in localStorage
  localStorage.setItem('sessionId', sessionId)
  localStorage.setItem('sessionExpiresAt', expiresAt)
  localStorage.setItem('user', JSON.stringify({
    id: userId,
    employeeId,
    email,
    fullName,
    role,
  }))

  // Clean URL by removing query params
  const cleanUrl = window.location.pathname
  window.history.replaceState({}, '', cleanUrl)

  return true
}

/**
 * Clear session from localStorage
 */
export function clearSessionFromStorage(): void {
  if (typeof window === 'undefined') return

  localStorage.removeItem('sessionId')
  localStorage.removeItem('sessionExpiresAt')
  localStorage.removeItem('user')
}

/**
 * Redirect to unified login if session is invalid
 */
export function redirectToLogin(): void {
  if (typeof window === 'undefined') return
  window.location.href = UNIFIED_LOGIN_URL
}

/**
 * Check if session is expired
 */
export function isSessionExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

/**
 * React hook for session management
 */
export function useSession() {
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSession = async () => {
      const sessionData = getSessionFromStorage()

      if (!sessionData) {
        setLoading(false)
        return
      }

      // Check if session is expired locally
      if (isSessionExpired(sessionData.expiresAt)) {
        clearSessionFromStorage()
        setLoading(false)
        return
      }

      // Validate with server
      const result = await validateSession(sessionData.sessionId, sessionData.userId)

      if (result.valid && result.user) {
        setSession(sessionData)
      } else {
        clearSessionFromStorage()
        setError(result.error || 'Session invalid')
      }

      setLoading(false)
    }

    loadSession()
  }, [])

  const logout = async () => {
    if (session) {
      await logoutSession(session.sessionId, session.userId)
    }
    clearSessionFromStorage()
    redirectToLogin()
  }

  return { session, loading, error, logout }
}

// Import React for the hook
import { useState, useEffect } from 'react'
