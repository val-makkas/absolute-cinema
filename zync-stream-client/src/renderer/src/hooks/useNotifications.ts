import { useState, useCallback, useEffect, useRef } from 'react'
import { Notification } from '@/types'
import { websocketService } from '../services/websocketService'

export default function useNotifications(
  token: string,
  onNotificationReceived?: () => void
): {
  notifications: Notification[]
  connected: boolean
  unreadCount: number
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  removeNotification: (notificationId: string) => void
  disconnect: () => void
  connect: () => void
} {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [connected, setConnected] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const onNotificationReceivedRef = useRef(onNotificationReceived)

  onNotificationReceivedRef.current = onNotificationReceived

  const handleMessage = useCallback(
    (data: any) => {
      console.log('🔔 Notifications: Received message:', data.type)

      if (data.type === 'notification') {
        if (onNotificationReceived) {
          onNotificationReceived()
        }
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
            return
        }

        setNotifications((prev) => [notification, ...prev.slice(0, 49)])
      }
    },
    [onNotificationReceived]
  )

  // Connect and subscribe to notification messages
  useEffect(() => {
    if (!token) return

    const subscribe = () => {
      if (websocketService.getConnectionStatus()) {
        websocketService.subscribe(
          'notifications',
          ['connection_established', 'auth_success', 'notification'],
          handleMessage
        )
        console.log('🔔 Notifications: Subscribed to messages')
      } else {
        // Wait for connection and try again
        const timeoutId = setTimeout(subscribe, 1000)
        return () => clearTimeout(timeoutId)
      }
    }

    subscribe()

    return () => {
      websocketService.unsubscribe('notifications')
      console.log('🔔 Notifications: Unsubscribed')
    }
  }, [token, handleMessage])

  const connect = useCallback(async () => {
    if (!token) return
    try {
      await websocketService.connect(token)
      setConnected(true)
    } catch (error) {
      console.log(error)
      setConnected(false)
    }
  }, [token])

  const disconnect = useCallback(() => {
    websocketService.disconnect()
    setConnected(false)
  }, [])

  // ... rest of your notification management functions stay the same
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

  return {
    notifications,
    connected,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    disconnect,
    connect
  }
}
