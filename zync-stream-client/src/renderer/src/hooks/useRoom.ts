import { useState, useCallback, useEffect } from 'react'
import { websocketService } from '../services/websocketService'

export interface RoomMessage {
  type: string
  user_id: number
  username: string
  timestamp: number
  data: any
}

export interface useRoomReturn {
  messages: RoomMessage[]
  connected: boolean
  currentRoom: number | null
  sendMessage: (message: string) => void
  sendPlaybackUpdate: (timestamp: number, playing: boolean) => void
  joinRoom: (roomId: number) => void
  leaveRoom: () => void
}

export function useRoom(token: string, roomId?: number): useRoomReturn {
  const [messages, setMessages] = useState<RoomMessage[]>([])
  const [connected, setConnected] = useState(false)
  const [currentRoom, setCurrentRoom] = useState<number | null>(null)

  const handleRoomMessage = useCallback((data: any) => {
    console.log('🎮 Room: Received message:', data.type)

    if (['chat_message', 'playback_update', 'user_joined', 'user_left'].includes(data.type)) {
      setMessages((prev) => [...prev, data])
    }
  }, [])

  const sendMessage = useCallback((message: string) => {
    websocketService.send({
      type: 'room_message',
      data: { message }
    })
  }, [])

  const sendPlaybackUpdate = useCallback((timestamp: number, playing: boolean) => {
    websocketService.send({
      type: 'playback_sync',
      data: { timestamp, playing }
    })
  }, [])

  const joinRoom = useCallback((roomId: number) => {
    websocketService.send({
      type: 'join_room',
      data: { room_id: roomId }
    })
    setCurrentRoom(roomId)
    setMessages([]) // Clear messages when joining new room
  }, [])

  const leaveRoom = useCallback(() => {
    websocketService.send({
      type: 'leave_room'
    })
    setCurrentRoom(null)
    setMessages([])
  }, [])

  useEffect(() => {
    if (!token) return

    const subscribe = () => {
      if (websocketService.getConnectionStatus()) {
        websocketService.subscribe(
          'room',
          ['chat_message', 'playback_update', 'user_joined', 'user_left'],
          handleRoomMessage
        )
        setConnected(true)
        console.log('🎮 Room: Subscribed to messages')

        if (roomId) {
          joinRoom(roomId)
        }
      } else {
        setConnected(false)
        const timeoutId = setTimeout(subscribe, 1000)
        return () => clearTimeout(timeoutId)
      }
    }

    subscribe()

    return () => {
      if (currentRoom) {
        leaveRoom()
      }
      websocketService.unsubscribe('room')
      setConnected(false)
      console.log('🎮 Room: Unsubscribed')
    }
  }, [token, roomId, handleRoomMessage, joinRoom, leaveRoom, currentRoom])

  return {
    messages,
    connected,
    currentRoom,
    sendMessage,
    sendPlaybackUpdate,
    joinRoom,
    leaveRoom
  }
}
