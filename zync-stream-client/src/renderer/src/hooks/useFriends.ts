import { useEffect, useState, useCallback } from 'react'
import { Friend, FriendRequest } from '@/types'

const API_BASE = 'http://localhost:8080/api/friends'

export default function useFriends(token: string): {
  friends: Friend[]
  friendRequests: FriendRequest[]
  loading: boolean
  error: string | null
  sendFriendRequest: (username: string) => Promise<void>
  acceptFriendRequest: (requestId: string) => Promise<void>
  rejectFriendRequest: (requestId: string) => Promise<void>
  removeFriend: (username: string) => Promise<void>
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
    removeFriend
  }
}
