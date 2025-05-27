import { useEffect, useState, useCallback } from 'react'
import { Friend, User } from '@/types'

const API_BASE = 'http://localhost:8080/api/friends'

export default function useFriends(token: string): {
  friends: Friend[]
  loading: boolean
  error: string | null
  fetchFriends: () => Promise<void>
  getFriendRequests: () => Promise<void>
  sendFriendRequest: (username: string) => Promise<void>
  acceptFriendRequest: () => Promise<void>
  rejectFriendRequest: () => Promise<void>
  removeFriend: () => Promise<void>
} {
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendRequests, getFriendRequests] = useState
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

  const getFriendRequests

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

  const 

  useEffect(() => {
    if (token) {
      fetchFriends()
    }
  }, [token, fetchFriends])

  return {
    friends,
    loading,
    error,
    fetchFriends,
    getFriendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend
  }
}
