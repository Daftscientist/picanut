import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiJson } from '../lib/api.js'

const AuthContext = createContext(null)

const TOKEN_KEY = 'labelflow_token'

function loadToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || null
  } catch {
    return null
  }
}

function saveToken(token) {
  try {
    if (!token) sessionStorage.removeItem(TOKEN_KEY)
    else sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    // ignore (storage may be blocked)
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => loadToken())
  const [user, setUser] = useState(null)
  const [bootstrapped, setBootstrapped] = useState(false)

  const setAuthToken = useCallback((next) => {
    setToken(next)
    saveToken(next)
  }, [])

  const logout = useCallback(async () => {
    const t = token
    setAuthToken(null)
    setUser(null)
    if (t) {
      try {
        await apiJson('/api/auth/logout', { method: 'POST', token: t })
      } catch {
        // best-effort
      }
    }
  }, [token, setAuthToken])

  const refreshMe = useCallback(async () => {
    if (!token) {
      setUser(null)
      return null
    }
    const me = await apiJson('/api/auth/me', { token })
    setUser(me)
    return me
  }, [token])

  const login = useCallback(async (username, password) => {
    const res = await apiJson('/api/auth/login', {
      method: 'POST',
      json: { username, password },
    })
    setAuthToken(res.token)
    setUser({
      username: res.username,
      role: res.role,
      org_id: res.org_id,
      is_platform_admin: res.is_platform_admin,
    })
    return res
  }, [setAuthToken])

  const signup = useCallback(async ({ username, email, password, company_name }) => {
    const res = await apiJson('/api/auth/signup', {
      method: 'POST',
      json: { username, email, password, company_name },
    })
    setAuthToken(res.token)
    setUser({
      username: res.username,
      role: res.role,
      org_id: res.org_id,
      is_platform_admin: res.is_platform_admin,
    })
    return res
  }, [setAuthToken])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (token) await refreshMe()
      } catch {
        if (!cancelled) {
          setAuthToken(null)
          setUser(null)
        }
      } finally {
        if (!cancelled) setBootstrapped(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, refreshMe, setAuthToken])

  const value = useMemo(() => ({
    token,
    user,
    bootstrapped,
    login,
    signup,
    logout,
    refreshMe,
    setAuthToken,
  }), [token, user, bootstrapped, login, signup, logout, refreshMe, setAuthToken])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

