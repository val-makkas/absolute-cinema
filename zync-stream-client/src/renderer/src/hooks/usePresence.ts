import { useState, useCallback, useMemo, useEffect } from 'react'
import { Friend } from '@/types'
import { websocketService } from '../services/websocketService'

export interface StatusData {
  user_id: number
  username: string
  status: 'online' | 'offline' | 'dnd' | 'watching'
  activity: string
  timestamp: number
  data?: any
}

export interface UsePresenceReturn {
  enhancedFriends: Friend[]
  isTracking: boolean
  connected: boolean
  setStatus: (status: string) => void
}

export function usePresence(friends: Friend[], token: string): UsePresenceReturn {
  const [statusOverrides, setStatusOverrides] = useState<
    Map<number, { status: string; activity: string }>
  >(new Map())
  const [isTracking, setIsTracking] = useState(false)

  const debugHandler = useCallback((data: any) => {
    console.log('👤 Presence: DEBUG - Received message:', data)
    console.log('👤 Presence: DEBUG - Message type:', data.type)
    console.log('👤 Presence: DEBUG - Full data:', JSON.stringify(data, null, 2))
  }, [])

  // Handle status updates
  const handleStatusUpdate = useCallback((data: any) => {
    console.log('👤 Presence: handleStatusUpdate called with:', data)

    if (data.type === 'status_update') {
      console.log('👤 Presence: Status update received:', data.data)
      const statusData = data.data

      console.log('🔍 statusData.user_id:', statusData.user_id, 'type:', typeof statusData.user_id)
      console.log('🔍 statusData.status:', statusData.status)
      console.log('🔍 statusData.activity:', statusData.activity)

      setStatusOverrides((prev) => {
        const newMap = new Map(prev)
        const userId = parseInt(statusData.user_id.toString())
        console.log('🔍 Setting override for userId:', userId)

        newMap.set(userId, {
          status: statusData.status,
          activity: statusData.activity
        })

        console.log('🔍 Updated statusOverrides:', Array.from(newMap.entries()))
        return newMap
      })

      setIsTracking(true)
    } else {
      console.log('👤 Presence: Received non-status message:', data.type)
    }
  }, [])

  // Connect and subscribe to status updates
  useEffect(() => {
    if (!token) return

    const subscribe = () => {
      if (websocketService.getConnectionStatus()) {
        // 🔧 Subscribe to ALL messages first to debug
        websocketService.subscribe(
          'presence_debug',
          ['status_update', 'user_status', 'presence', 'connection_established'],
          debugHandler
        )
        websocketService.subscribe('presence', ['status_update'], handleStatusUpdate)
        console.log('👤 Presence: Subscribed to status updates')
      } else {
        console.log('👤 Presence: WebSocket not connected, retrying...')
        const timeoutId = setTimeout(subscribe, 1000)
        return () => clearTimeout(timeoutId)
      }
    }

    subscribe()

    return () => {
      websocketService.unsubscribe('presence_debug')
      websocketService.unsubscribe('presence')
      console.log('👤 Presence: Unsubscribed')
    }
  }, [token, handleStatusUpdate, debugHandler])

  // Function to set status
  const setStatus = useCallback((status: string) => {
    websocketService.send({
      type: 'set_status',
      data: { status }
    })
  }, [])

  // Enhance friends with live status
  const enhancedFriends = useMemo(() => {
    // 🔧 Add null/undefined check and ensure it's an array
    if (!friends || !Array.isArray(friends)) {
      console.log('👤 Presence: Friends is null/undefined or not an array:', friends)
      return []
    }

    return friends.map((friend) => {
      const override = statusOverrides.get(friend.id)
      if (override) {
        return {
          ...friend,
          status: override.status as any,
          activity: override.activity
        }
      }
      console.log(friends)
      return friend
    })
  }, [friends, statusOverrides])

  return {
    enhancedFriends,
    isTracking,
    connected: websocketService.getConnectionStatus(),
    setStatus
  }
}
