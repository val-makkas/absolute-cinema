import { useEffect, useState, useCallback } from 'react'
import { Friend, FriendRequest } from '@/types'

const API_BASE = 'http://localhost:8080/api/friends'

const API_USERS = 'http://localhost:8080/api/users'

interface SearchUser {
  id: string
  username: string
  display_name: string
  avatar?: string
}

export default function useFriends(token: string): {
  friends: Friend[]
  friendRequests: FriendRequest[]
  loading: boolean
  error: string | null
  sendFriendRequest: (username: string) => Promise<void>
  acceptFriendRequest: (requestId: string) => Promise<void>
  rejectFriendRequest: (requestId: string) => Promise<void>
  removeFriend: (username: string) => Promise<void>
  searchUser: (query: string) => Promise<SearchUser[]>
} {
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFriends = useCallback(async () => {
    if (!token) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(API_BASE, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const friendsData: Friend[] = await res.json()
        setFriends(friendsData)
        localStorage.setItem('friends', JSON.stringify(friendsData))
        setLoading(false)
      } else {
        setError('Failed to load friends list')
        setLoading(false)
      }
    } catch (err) {
      setError('Network error')
      setLoading(false)
      console.log(err)
    }
  }, [token])

  const getFriendRequests = useCallback(async () => {
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const friendRequestsData: FriendRequest[] = await res.json()
        setFriendRequests(friendRequestsData)
        console.log('🔔 Friend requests data:', friendRequestsData)
        localStorage.setItem('friendRequests', JSON.stringify(friendRequestsData))
        setLoading(false)
      } else {
        setError('Failed to fetch friend requests.')
        setLoading(false)
      }
    } catch (err) {
      setError('Possible network error.')
      console.log(err)
    }
  }, [token])

  const sendFriendRequest = useCallback(
    async (username: string) => {
      if (!token) return

      setLoading(true)
      setError(null)

      try {
        const res = await fetch(API_BASE, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username
          })
        })
        if (res.ok) {
          setLoading(false)
        } else {
          setLoading(false)
          setError('Failed to send friend request')
        }
      } catch (err) {
        setLoading(false)
        setError('Possible network error')
        console.log(err)
      }
    },
    [token]
  )

  const acceptFriendRequest = useCallback(
    async (requestId: string) => {
      if (!token) return

      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`${API_BASE}/requests/${requestId}/accept`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          setLoading(false)
        } else {
          setLoading(false)
          setError('Failed to respond to friend request')
        }
      } catch (err) {
        setLoading(false)
        setError('Possible network error.')
        console.log(err)
      }
    },
    [token]
  )

  const rejectFriendRequest = useCallback(
    async (requestId: string) => {
      if (!token) return

      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`${API_BASE}/requests/${requestId}/reject`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          setLoading(false)
        } else {
          setLoading(false)
          setError('Failed to respond to friend request')
        }
      } catch (err) {
        setLoading(false)
        setError('Possible network error.')
        console.log(err)
      }
    },
    [token]
  )

  const removeFriend = useCallback(
    async (username: string) => {
      if (!token) return

      setLoading(true)
      setError(null)

      try {
        const res = await fetch(API_BASE, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            username
          })
        })
        if (res.ok) {
          setLoading(false)
        } else {
          setLoading(false)
          setError('Failed to remove friend.')
        }
      } catch (err) {
        setLoading(false)
        setError('Possible network error')
        console.log(err)
      }
    },
    [token]
  )

  const searchUser = useCallback(
    async (query: string): Promise<SearchUser[]> => {
      if (!token || !query.trim()) return []

      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`${API_USERS}/search?q=${encodeURIComponent(query)}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (res.ok) {
          const response = await res.json()
          const searchResults: SearchUser[] = response.users || []
          const mappedResults = searchResults.map((user: any) => ({
            id: user.id.toString(), // Convert to string
            username: user.username,
            display_name: user.display_name || user.username, // Fallback to username
            avatar: user.profile_picture_url
          }))
          setLoading(false)
          return mappedResults
        } else {
          setLoading(false)
          setError('Failed to search users')
          return []
        }
      } catch (err) {
        setLoading(false)
        setError('Network error while searching users')
        console.log(err)
        return []
      }
    },
    [token]
  )

  useEffect(() => {
    if (token) {
      fetchFriends()
      getFriendRequests()
    }
  }, [token, fetchFriends, getFriendRequests])

  return {
    friends,
    friendRequests,
    loading,
    error,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    searchUser
  }
}
