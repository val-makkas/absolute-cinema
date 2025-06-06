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
  }, [])

  // Handle status updates
  const handleStatusUpdate = useCallback((data: any) => {

    if (data.type === 'status_update') {
      const statusData = data.data

      setStatusOverrides((prev) => {
        const newMap = new Map(prev)
        const userId = parseInt(statusData.user_id.toString())

        newMap.set(userId, {
          status: statusData.status,
          activity: statusData.activity
        })
        return newMap
      })

      setIsTracking(true)
    } else {
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
      } else {
        const timeoutId = setTimeout(subscribe, 1000)
        return () => clearTimeout(timeoutId)
      }
    }

    subscribe()

    return () => {
      websocketService.unsubscribe('presence_debug')
      websocketService.unsubscribe('presence')
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
