import { useState, useCallback, useEffect } from 'react'
import { UserExtensions, User } from '@/types'

const API_BASE = 'http://localhost:8080/api/users'

export function useUsers(): {
  token: string
  user: User | null
  extensions: UserExtensions[]
  loading: boolean
  error: string | null
  register: (username: string, email: string, password: string) => Promise<boolean>
  login: (email: string, password: string) => Promise<boolean>
  loginWithToken: (jwtToken: string) => Promise<boolean>
  logout: () => void
  updateExtensions: (newExtensions: UserExtensions[] | UserExtensions) => Promise<void>
} {
  const [token, setToken] = useState<string>('')
  const [user, setUser] = useState<User | null>(null)
  const [extensions, setExtensions] = useState<UserExtensions[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('jwt') || ''
      const storedUser = localStorage.getItem('user') || ''
      if (storedToken) {
        setToken(storedToken)
      }
      if (storedUser) {
        setUser(JSON.parse(storedUser))
      }
    }
  }, [])

  const logout = useCallback(() => {
    setToken('')
    setUser(null)
    setExtensions([])
    setError(null)
    setLoading(false)
    localStorage.clear()

    window.location.reload()
  }, [])

  const refreshUser = useCallback(async (): Promise<void> => {
    if (!token) return

    try {
      const res = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const userData: User = await res.json()
        setUser(userData)
        setExtensions(userData.extensions || [])
        localStorage.setItem('user', JSON.stringify(userData))
      } else {
        logout()
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error)
      setError('Failed to fetch user info')
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      refreshUser()
    } else {
      setUser(null)
    }
  }, [token])

  const register = useCallback(
    async (username: string, email: string, password: string): Promise<boolean> => {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          email: email,
          password: password
        })
      })
      const data = await res.json()
      setLoading(false)
      if (res.ok) return true
      setError(data.error || 'Failed to register')
      return false
    },
    []
  )

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        password: password
      })
    })
    const data = await res.json()
    setLoading(false)
    if (data.token) {
      setToken(data.token)
      localStorage.setItem('jwt', data.token)
      return true
    }
    setError(data.error || 'Failed to login')
    return false
  }, [])

  // Login with JWT token (for OAuth)
  const loginWithToken = useCallback(async (jwtToken: string): Promise<boolean> => {
    setToken(jwtToken)
    localStorage.setItem('jwt', jwtToken)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${jwtToken}` }
      })
      if (res.ok) {
        const userData: User = await res.json()
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
        return true
      } else {
        setLoading(false)
        setError('Failed to fetch user info')
        return false
      }
    } catch (e) {
      setLoading(false)
      setError(`Failed to fetch user info, ${e}`)
      return false
    }
  }, [])

  const updateExtensions = useCallback(
    async (newExtensions: UserExtensions[] | UserExtensions): Promise<boolean> => {
      try {
        const extensionsArray = Array.isArray(newExtensions) ? newExtensions : [newExtensions]

        const extensionUrls = extensionsArray.map((ext) =>
          typeof ext === 'string' ? ext : ext.url
        )

        const response = await fetch('http://localhost:8080/api/users/me/extensions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ extensions: extensionUrls })
        })

        if (!response.ok) {
          throw new Error('Failed to update extensions')
        }

        setExtensions(extensionsArray)
        localStorage.setItem('extensions', JSON.stringify(extensionsArray))
        return true
      } catch (error) {
        console.error('Extension update error:', error)
        return false
      }
    },
    [token]
  )

  return {
    token,
    user,
    extensions,
    loading,
    error,
    register,
    login,
    loginWithToken,
    logout,
    updateExtensions
  }
}
