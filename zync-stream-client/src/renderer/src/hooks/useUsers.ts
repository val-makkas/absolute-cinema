import { useState, useCallback, useEffect } from 'react'
import { UserExtensions } from '@/types'

const API_BASE = 'http://localhost:8080/api/users'

export function useUsers(): {
  token: string
  username: string
  extensions: UserExtensions[]
  loading: boolean
  error: string | null
  register: (username: string, email: string, password: string) => Promise<boolean>
  login: (usernameOrEmail: string, password: string) => Promise<boolean>
  loginWithToken: (jwtToken: string) => Promise<boolean>
  logout: () => void
  updateExtensions: (newExtensions: UserExtensions[] | UserExtensions) => Promise<boolean>
} {
  const [token, setToken] = useState<string>('')
  const [username, setUsername] = useState<string>('')
  const [extensions, setExtensions] = useState<UserExtensions[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('jwt') || '')
      setUsername(localStorage.getItem('username') || '')
      try {
        const exts = JSON.parse(localStorage.getItem('extensions') || '[]')
        setExtensions(Array.isArray(exts) ? exts : [])
      } catch {
        setExtensions([])
      }
    }
  }, [])

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/extensions`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => setExtensions(data.extensions || []))
        .catch(() => setExtensions([]))
    } else {
      setExtensions([])
    }
  }, [token])

  const register = useCallback(
    async (username: string, email: string, password: string): Promise<boolean> => {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      })
      const data = await res.json()
      setLoading(false)
      if (res.ok) return true
      setError(data.error || 'Failed to register')
      return false
    },
    []
  )

  const login = useCallback(async (usernameOrEmail: string, password: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameOrEmail, password })
    })
    const data = await res.json()
    setLoading(false)
    if (data.token) {
      setToken(data.token)
      setUsername(data.username)
      localStorage.setItem('jwt', data.token)
      localStorage.setItem('username', data.username)
      localStorage.setItem('extensions', JSON.stringify(data.extensions || []))
      setExtensions(data.extensions || [])
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
        const data = await res.json()
        setUsername(data.username || '')
        setExtensions(data.extensions || [])
        localStorage.setItem('username', data.username || '')
        localStorage.setItem('extensions', JSON.stringify(data.extensions || []))
        setLoading(false)
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

  const logout = useCallback(() => {
    setToken('')
    setUsername('')
    setExtensions([])
    localStorage.removeItem('jwt')
    localStorage.removeItem('username')
    localStorage.removeItem('extensions')
  }, [])

  // Update your updateExtensions function to handle non-array inputs:
  const updateExtensions = useCallback(
    async (newExtensions: UserExtensions[] | UserExtensions): Promise<boolean> => {
      try {
        // Ensure newExtensions is an array
        const extensionsArray = Array.isArray(newExtensions) ? newExtensions : [newExtensions]

        // Extract URLs from UserExtensions objects for the API
        const extensionUrls = extensionsArray.map((ext) => (typeof ext === 'string' ? ext : ext.url))

        const response = await fetch('http://localhost:8080/api/users/extensions', {
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

        // Update local state after successful API call
        setExtensions(extensionsArray)

        // Update localStorage for persistence
        localStorage.setItem('extensions', JSON.stringify(extensionsArray))

        console.log('Extensions updated successfully:', extensionsArray)
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
    username,
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
