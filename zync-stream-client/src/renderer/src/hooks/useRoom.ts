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

export interface RoomInvitation {
  invitation_id: number
  inviter_id: number
  inviter_name: string
  room_id: number
  room_name: string
  timestamp: number
}

export interface useRoomReturn {
  messages: RoomMessage[]
  connected: boolean
  isInRoom: boolean
  room: Room | null
  sendMessage: (message: string) => void
  sendPlaybackUpdate: (timestamp: number, playing: boolean) => void
  leaveRoom: () => void
  createRoom: () => void
  deleteRoom: (id: string) => void
  inviteToRoom: (username: string) => void
  roomInvitations: RoomInvitation[]
  respondToInvitation: (invitationId: number, accept: boolean) => void
}

export function useRoom(token: string, user: User | null, roomId?: number): useRoomReturn {
  const [messages, setMessages] = useState<RoomMessage[]>([])
  const [connected, setConnected] = useState(false)
  const [role, setRole] = useState<'owner' | 'member' | null>(null)
  const [room, setRoom] = useState<Room | null>(() => {
    const savedRoom = localStorage.getItem('current_room')
    return savedRoom ? JSON.parse(savedRoom) : null
  })
  const [currentRoom, setCurrentRoom] = useState<number | null>(() => {
    const savedRoomId = localStorage.getItem('current_room_id')
    return savedRoomId ? parseInt(savedRoomId) : null
  })
  const [roomInvitations, setRoomInvitations] = useState<RoomInvitation[]>([])

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
        if (roomData.room?.id) {
          joinRoom(parseInt(roomData.room?.id))
        }
      }
    } catch {
      //
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

          const extractedRoom = {
            ...roomData.room,
            members: roomData.members,
            isMember: roomData.is_member,
            userRole: roomData.user_role
          }
          setRoom(extractedRoom)
          localStorage.setItem('current_room', JSON.stringify(extractedRoom))
        }
      } catch {
        //
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
          setRoom(null)
        }
      } catch {
        //
      }
    },
    [token]
  )

  const handleRoomMessage = useCallback(
    (data: any) => {
      if (data.type === 'room_invitation') {
        const invitation: RoomInvitation = {
          invitation_id: data.data.invitation_id,
          inviter_id: data.data.inviter_id,
          inviter_name: data.data.inviter_name,
          room_id: data.data.room_id,
          room_name: data.data.room_name,
          timestamp: data.timestamp
        }

        setRoomInvitations((prev) => [...prev, invitation])
        return
      }

      if (data.type === 'member_list_update') {
        if (data.data.members) {
          setRoom((prev) => {
            if (!prev) return null
            return {
              ...prev,
              members: data.data.members
            }
          })
        }
        return
      }

      if (['chat_message', 'playback_update', 'user_joined', 'user_left'].includes(data.type)) {
        setMessages((prev) => [...prev, data])
      }

      if (data.type === 'success') {

        if (data.message === 'Joined room successfully') {
          if (data.data?.role) {
            setRole(data.data.role === 'owner' ? 'owner' : 'member')
          }

          if (data.data?.room_id) {
            localStorage.setItem('current_room_id', data.data?.room_id)
            getRoom(data.data.room_id)
          }
        }
      }
    },
    [getRoom]
  )

  const leaveRoom = useCallback(() => {
    websocketService.send({
      type: 'leave_room',
      data: {}
    })
    if (role === 'owner' && room?.id) {
      deleteRoom(room?.id)
    }
    localStorage.removeItem('current_room')
    localStorage.removeItem('current_room_id')
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

  const inviteToRoom = useCallback(
    (username: string) => {
      if (room?.id) {
        websocketService.send({
          type: 'invite_to_room',
          data: {
            room_id: parseInt(room.id),
            username: username
          }
        })
      }
    },
    [room?.id]
  )

  const removeRoomInvitation = useCallback((invitationId: number) => {
    setRoomInvitations((prev) => prev.filter((inv) => inv.invitation_id !== invitationId))
  }, [])

  const respondToInvitation = useCallback(
    (invitationId: number, accept: boolean) => {
      websocketService.send({
        type: 'respond_to_invitation',
        data: {
          invitation_id: invitationId,
          accept: accept
        }
      })

      if (accept) {
        const invitation = roomInvitations.find((inv) => inv.invitation_id === invitationId)
        if (invitation) {
          joinRoom(invitation.room_id)
        }
      }

      removeRoomInvitation(invitationId)
    },
    [roomInvitations, joinRoom, removeRoomInvitation]
  )

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
          [
            'room_invitation',
            'member_list_update',
            'chat_message',
            'playback_update',
            'user_joined',
            'user_left',
            'success',
            'error'
          ],
          handleRoomMessage
        )
        setConnected(true)

        if (roomId) {
          joinRoom(roomId)
        }
      } else {
        setConnected(false)
        setTimeout(subscribe, 2000)
      }
    }

    subscribe()

    return () => {
      if (currentRoom) {
        leaveRoom()
      }
      websocketService.unsubscribe('room')
      setConnected(false)
    }
  }, [token, roomId])

  return {
    messages,
    connected,
    isInRoom,
    room,
    sendMessage,
    sendPlaybackUpdate,
    leaveRoom,
    createRoom,
    deleteRoom,
    inviteToRoom,
    roomInvitations,
    respondToInvitation
  }
}
