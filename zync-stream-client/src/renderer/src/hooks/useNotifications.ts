import { useRef, useState, useCallback, useEffect } from 'react'
import { Notification } from '@/types'

export default function useNotifications(
  token: string,
  onConnectionEstablished?: () => void
): {
  notifications: Notification[]
  connected: boolean
  unreadCount: number
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  removeNotification: (notificationId: string) => void
  connect: () => void
  disconnect: () => void
} {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [connected, setConnected] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const socket = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  useEffect(() => {
    console.log('📩 useNotifications state:', {
      notificationsCount: notifications.length,
      notifications: notifications,
      connected,
      unreadCount,
      token: token ? `${token.slice(0, 10)}...` : 'none'
    })
  }, [notifications, connected, unreadCount, token])

  const connect = useCallback(() => {
    if (!token) {
      console.log('No token provided for WebSocket connection')
      return
    }

    if (socket.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected')
      return
    }

    try {
      console.log('Connecting to notifications WebSocket...')

      // Create WebSocket without token in URL
      socket.current = new WebSocket('ws://localhost:8080/api/notifications/ws')

      // Send authentication after connection opens
      socket.current.onopen = () => {
        console.log('🔌 Connected to notifications WebSocket')

        // Send authentication message
        const authMessage = {
          type: 'auth',
          token: token
        }
        socket.current?.send(JSON.stringify(authMessage))

        setConnected(true)
        reconnectAttempts.current = 0
      }

      socket.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Handle auth response
          if (data.type === 'auth_success') {
            console.log('✅ Authentication successful')
            return
          }

          if (data.type === 'auth_error') {
            console.error('❌ Authentication failed:', data.message)
            socket.current?.close()
            return
          }

          console.log('📩 Received notification:', data)
          handleNotification(data)
        } catch (error) {
          console.error('Error parsing notification message:', error)
        }
      }

      socket.current.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason)
        setConnected(false)

        // Auto-reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
          reconnectAttempts.current++

          console.log(
            `Reconnecting in ${delay}ms... (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`
          )

          setTimeout(() => {
            connect()
          }, delay)
        }
      }

      socket.current.onerror = (error) => {
        console.error('🔌 WebSocket error:', error)
        setConnected(false)
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
    }
  }, [token])

  const disconnect = useCallback(() => {
    if (socket.current) {
      socket.current.close(1000, 'User disconnected')
      socket.current = null
    }
    setConnected(false)
    reconnectAttempts.current = 0
  }, [])

  const convertFriendRequestsToNotifications = useCallback(async () => {
    try {
      console.log('🔄 Fetching pending friend requests...')

      const response = await fetch('http://localhost:8080/api/friends/requests', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('📨 Friend requests data:', data)

        if (data.requests && data.requests.length > 0) {
          const notifications: Notification[] = data.requests.map((request: any) => ({
            id: `friend_request_${request.id}`,
            type: 'friend_request_received',
            title: 'New friend request',
            message: `${request.display_name || request.username} sent you a friend request`,
            data: {
              sender_id: request.sender_id,
              username: request.username,
              display_name: request.display_name,
              request_id: request.id
            },
            read: false,
            createdAt: request.created_at
          }))

          console.log('🔔 Converting friend requests to notifications:', notifications)

          setNotifications((prev) => {
            const existingIds = prev.map((n) => n.id)
            const newNotifications = notifications.filter((n) => !existingIds.includes(n.id))

            return [...newNotifications, ...prev].slice(0, 49)
          })
        }
      }
    } catch (error) {
      console.error('❌ Error fetching friend requests:', error)
    }
  }, [token])

  const handleNotification = useCallback(
    (data: any) => {
      console.log('📨 Raw WebSocket message received:', data)

      if (data.type === 'connection_established') {
        console.log('🔗 Connection established, calling onConnectionEstablished')
        if (onConnectionEstablished) {
          onConnectionEstablished()
        }

        convertFriendRequestsToNotifications()
        return
      }

      // Handle the backend's notification wrapper format
      if (data.type === 'notification') {
        console.log('🔔 Notification wrapper received:', data)

        const notificationId = `${Date.now()}_${Math.random()}`
        let notification: Notification

        switch (data.notification_type) {
          case 'friend_request_received':
            notification = {
              id: notificationId,
              type: 'friend_request_received',
              title: 'New friend request',
              message: `${data.data?.display_name || data.data?.username} sent you a friend request`,
              data: data.data,
              read: false,
              createdAt: new Date().toISOString()
            }
            break
          case 'friend_request_accepted':
            notification = {
              id: notificationId,
              type: 'friend_request_accepted',
              title: 'Friend request accepted',
              message: `${data.data?.display_name || data.data?.username} accepted your friend request`,
              data: data.data,
              read: false,
              createdAt: new Date().toISOString()
            }
            break
          case 'friend_request_rejected':
            notification = {
              id: notificationId,
              type: 'friend_request_rejected',
              title: 'Friend Request Declined',
              message: `${data.data?.display_name || data.data?.username} declined your friend request`,
              data: data.data,
              read: false,
              createdAt: new Date().toISOString()
            }
            break
          case 'room_invitation':
            notification = {
              id: notificationId,
              type: 'room_invitation',
              title: 'Room invitation',
              message: `${data.data?.inviter_name} invited you to join ${data.data?.room_name}`,
              data: data.data,
              read: false,
              createdAt: new Date().toISOString()
            }
            break
          default:
            console.log('❌ Unknown notification type:', data.notification_type)
            return
        }

        console.log('🔔 Created notification object:', notification)

        setNotifications((prev) => {
          const updated = [notification, ...prev.slice(0, 49)]
          console.log('🔔 Updated notifications array:', updated)
          return updated
        })
        return
      }

      console.log('❌ Unknown message type:', data.type)
    },
    [onConnectionEstablished]
  )

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notificationId === notification.id ? { ...notification, read: true } : notification
      )
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const removeNotification = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
  }, [])

  useEffect(() => {
    const unread = notifications.filter((n) => !n.read).length
    setUnreadCount(unread)
  }, [notifications])

  useEffect(() => {
    if (token) {
      connect()
    }
    return () => disconnect()
  }, [token, connect, disconnect])

  return {
    notifications,
    connected,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    connect,
    disconnect
  }
}
