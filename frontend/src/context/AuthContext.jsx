/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const AuthContext = createContext(null)

const STORAGE_KEY = 'hirematrix_auth'
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const readStoredAuth = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const stored = readStoredAuth()
  const [accessToken, setAccessToken] = useState(stored?.accessToken ?? null)
  const [refreshToken, setRefreshToken] = useState(stored?.refreshToken ?? null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const refreshInFlight = useRef(null)

  const persistTokens = useCallback((nextAccessToken, nextRefreshToken) => {
    if (!nextAccessToken || !nextRefreshToken) {
      localStorage.removeItem(STORAGE_KEY)
      setAccessToken(null)
      setRefreshToken(null)
      return
    }

    const payload = {
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    setAccessToken(nextAccessToken)
    setRefreshToken(nextRefreshToken)
  }, [])

  const logout = useCallback(() => {
    persistTokens(null, null)
    setUser(null)
  }, [persistTokens])

  const parseResponse = async (response) => {
    const contentType = response.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    const body = isJson ? await response.json() : await response.text()

    if (!response.ok) {
      const error = new Error(
        typeof body === 'string' ? body : body.message || 'Request failed',
      )
      error.status = response.status
      error.details = typeof body === 'string' ? null : body.details
      throw error
    }

    return body
  }

  const refreshSession = useCallback(async () => {
    if (!refreshToken) {
      throw new Error('Session expired')
    }

    if (!refreshInFlight.current) {
      refreshInFlight.current = fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      })
        .then(parseResponse)
        .then((data) => {
          persistTokens(data.accessToken, data.refreshToken)
          return data.accessToken
        })
        .catch((error) => {
          logout()
          throw error
        })
        .finally(() => {
          refreshInFlight.current = null
        })
    }

    return refreshInFlight.current
  }, [logout, persistTokens, refreshToken])

  const apiFetch = useCallback(
    async (path, options = {}, shouldRetry = true) => {
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      }

      if (options.body instanceof FormData) {
        delete headers['Content-Type']
      }

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }

      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
      })

      if (response.status === 401 && shouldRetry && refreshToken) {
        const nextAccessToken = await refreshSession()
        const retryHeaders = {
          ...headers,
          Authorization: `Bearer ${nextAccessToken}`,
        }
        const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
          ...options,
          headers: retryHeaders,
        })
        return parseResponse(retryResponse)
      }

      return parseResponse(response)
    },
    [accessToken, refreshSession, refreshToken],
  )

  const fetchMe = useCallback(async () => {
    try {
      const data = await apiFetch('/auth/me', {}, false)
      setUser(data.user)
    } catch {
      logout()
    }
  }, [apiFetch, logout])

  const login = useCallback(
    async ({ email, password }) => {
      const data = await apiFetch(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
        false,
      )

      persistTokens(data.accessToken, data.refreshToken)
      setUser(data.user)
      return data.user
    },
    [apiFetch, persistTokens],
  )

  const registerApplicant = useCallback(
    async ({ firstName, lastName, email, password, phone, experienceYears, skills }) => {
      const data = await apiFetch(
        '/auth/register-applicant',
        {
          method: 'POST',
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            password,
            phone,
            experienceYears,
            skills,
          }),
        },
        false,
      )

      persistTokens(data.accessToken, data.refreshToken)
      setUser(data.user)
      return data.user
    },
    [apiFetch, persistTokens],
  )

  useEffect(() => {
    const initialize = async () => {
      if (!accessToken) {
        setLoading(false)
        return
      }
      await fetchMe()
      setLoading(false)
    }

    initialize()
  }, [accessToken, fetchMe])

  const value = useMemo(
    () => ({
      user,
      loading,
      accessToken,
      login,
      registerApplicant,
      logout,
      apiFetch,
      refreshSession,
    }),
    [accessToken, apiFetch, loading, login, logout, refreshSession, registerApplicant, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
