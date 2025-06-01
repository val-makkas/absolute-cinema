import { useState, useCallback, useEffect } from 'react'
import { websocketService } from '../services/websocketService'
import { User } from '@/types'

const API_BASE = 'http://localhost:8080/api/rooms'

export interface RoomMember {
  roomID: number
  userID: number
  role: string
  joinedAt: string
  username: string
  display_name: string
  avatar_url?: string
}

export interface Room {
  id: string
  name: string
  description: string
  ownerId: number
  isPrivate: boolean
  status: string
  createdAt: string
  updatedAt: string
  members?: RoomMember[]
  isMember?: boolean
  userRole?: string
}

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
  isInRoom: boolean
  room: Room | null
  sendMessage: (message: string) => void
  sendPlaybackUpdate: (timestamp: number, playing: boolean) => void
  joinRoom: (roomId: number) => void
  leaveRoom: () => void
  createRoom: () => void
  getRoom: (id: string) => void
  deleteRoom: (id: string) => void
}

export function useRoom(token: string, user: User | null, roomId?: number): useRoomReturn {
  const [messages, setMessages] = useState<RoomMessage[]>([])
  const [connected, setConnected] = useState(false)
  const [room, setRoom] = useState<Room | null>(null)
  const [role, setRole] = useState<'owner' | 'member' | null>(null)
  const [currentRoom, setCurrentRoom] = useState<number | null>(null)

  const isInRoom = room !== null

  const joinRoom = useCallback((roomId: number) => {
    websocketService.send({
      type: 'join_room',
      data: { room_id: roomId }
    })
    setCurrentRoom(roomId)
    setMessages([])
  }, [])

  const createRoom = useCallback(async () => {
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `Party by ${user?.display_name || user?.username || 'User'}`,
          description: 'Watch party room',
          is_private: true
        })
      })
      if (res.ok) {
        const roomData = await res.json()
        setRoom(roomData.room)
        console.log(roomData.room)
        if (roomData.room?.id) {
          joinRoom(parseInt(roomData.room?.id))
        }
      } else {
        console.log('Error creating room')
      }
    } catch {
      console.log('Possible network error.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, joinRoom])

  const getRoom = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`${API_BASE}/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const roomData = await res.json()
          setRoom(roomData)
        } else {
          console.log('Error getting room')
        }
      } catch {
        console.log('Possible network error.')
      }
    },
    [token]
  )

  const deleteRoom = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`${API_BASE}/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          console.log('Successfully deleted room.')
          setRoom(null)
        } else {
          console.log('You dont have permission to delete this party')
        }
      } catch {
        console.log('Possible network error.')
      }
    },
    [token]
  )

  const handleRoomMessage = useCallback(
    (data: any) => {
      console.log('Room: Received message:', data.type)

      if (['chat_message', 'playback_update', 'user_joined', 'user_left'].includes(data.type)) {
        setMessages((prev) => [...prev, data])
      }

      if (data.type === 'success') {
        console.log('✅ Room success:', data.message)

        if (data.message === 'Joined room successfully') {
          if (data.data?.role) {
            setRole(data.data.role === 'owner' ? 'owner' : 'member')
            console.log(data.data.role)
          }

          if (data.data?.room_id) {
            getRoom(data.data.room_id.toString())
          }
        }
      }

      if (data.type === 'error') {
        console.error('❌ Room error:', data.message)
      }
      if (data.type === 'error') {
        console.log(data.message)
      }
    },
    [getRoom]
  )

  const leaveRoom = useCallback(() => {
    websocketService.send({
      type: 'leave_room',
      data: {}
    })
    if (role === 'owner' && room?.room?.id) {
      deleteRoom(room?.room?.id)
    }
    setCurrentRoom(null)
    setRoom(null)
    setMessages([])
  }, [deleteRoom, role, room])

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

  useEffect(() => {
    if (!token) return

    const subscribe = (): void => {
      if (websocketService.getConnectionStatus()) {
        websocketService.subscribe(
          'room',
          ['chat_message', 'playback_update', 'user_joined', 'user_left', 'success', 'error'],
          handleRoomMessage
        )
        setConnected(true)
        console.log('Room: Subscribed to messages')

        if (roomId) {
          joinRoom(roomId)
        }
      } else {
        setConnected(false)
        setTimeout(subscribe, 1000)
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
  }, [token, roomId, handleRoomMessage])

  return {
    messages,
    connected,
    isInRoom,
    room,
    sendMessage,
    sendPlaybackUpdate,
    joinRoom,
    leaveRoom,
    createRoom,
    getRoom,
    deleteRoom
  }
}
