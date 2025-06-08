import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { websocketService } from '../services/websocketService'
import { User } from '@/types'
import sound from '@/assets/sounds/mixkit-message-pop-alert-2354.mp3'

const API_BASE = 'http://localhost:8080/api/rooms'

export interface RoomMovie {
  title: string
  year: string
  poster?: string
  imdb_id: string
  type: 'movie' | 'series'
  season?: number
  episode?: number
  episodeTitle?: string
  genre: string[]
}

export interface RoomSource {
  infoHash: string
  fileIdx: number
  quality?: string
}

export interface RoomMemberStatus {
  userId: number
  username: string
  hasCompatibleSource: boolean
  extensionName?: string
  timestamp: number
}

export interface RoomMember {
  room_od: number
  user_id: number
  role: string
  joined_at: string
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
  data
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

  //

  roomMovie: RoomMovie | null
  roomSource: RoomSource | null
  memberStatuses: Map<number, RoomMemberStatus>
  allMembersReady: boolean
  canStartParty: boolean
  myCompatibleSource: any | null
  selectMovieForParty: (movie: RoomMovie, source: RoomSource) => void
  checkExtensionsForParty: () => Promise<boolean>
  startWatchParty: () => void
  clearPartyMovie: () => void
}

export function useRoom(
  token: string,
  user: User | null,
  extensionManifests: Record<string, any>,
  roomId?: number
): useRoomReturn {
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

  const [roomMovie, setRoomMovie] = useState<RoomMovie | null>(null)
  const [roomSource, setRoomSource] = useState<RoomSource | null>(null)
  const [memberStatuses, setMemberStatuses] = useState<Map<number, RoomMemberStatus>>(new Map())
  const [allMembersReady, setAllMembersReady] = useState(false)
  const [canStartParty, setCanStartParty] = useState(false)
  const [myCompatibleSource, setMyCompatibleSource] = useState<any | null>(null)
  const roomRef = useRef<Room | null>(null)
  const roomMovieRef = useRef<RoomMovie | null>(null)
  const roomSourceRef = useRef<RoomSource | null>(null)

  const navigate = useNavigate()

  const memberUpdateAudioRef = useRef<HTMLAudioElement | null>(null)

  const isInRoom = room !== null

  useEffect(() => {
    roomRef.current = room
  }, [room])

  useEffect(() => {
    roomMovieRef.current = roomMovie
  }, [roomMovie])

  useEffect(() => {
    roomSourceRef.current = roomSource
  }, [roomSource])

  useEffect(() => {
    memberUpdateAudioRef.current = new Audio(sound)
    memberUpdateAudioRef.current.volume = 1
    memberUpdateAudioRef.current.play().catch((error) => {})

    memberUpdateAudioRef.current.load()

    return () => {
      if (memberUpdateAudioRef.current) {
        memberUpdateAudioRef.current = null
      }
    }
  }, [])

  const playMemberUpdateSound = useCallback(() => {
    if (memberUpdateAudioRef.current) {
      memberUpdateAudioRef.current.currentTime = 0
      memberUpdateAudioRef.current.play().catch((error) => {})
    }
  }, [])

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
    (data) => {
      if (data.type === 'party_movie_selected') {
        setRoomMovie(data.data.movie)
        setRoomSource(data.data.source)
        return
      }

      if (data.type === 'party_source_status') {
        setMemberStatuses((prev) => {
          const updated = new Map(prev)
          updated.set(data.data.userId, {
            userId: data.data.userId,
            username: data.data.username,
            hasCompatibleSource: data.data.hasCompatibleSource,
            extensionName: data.data.extensionName,
            timestamp: data.data.timestamp
          })
          return updated
        })
        return
      }

      if (data.type === 'party_start') {
        // Use refs to get current values instead of stale closure values
        const currentRoom = roomRef.current
        const currentRoomMovie = roomMovieRef.current
        const currentRoomSource = roomSourceRef.current

        if (currentRoom) {
          navigate('/watch-party', {
            state: {
              selectedSource: myCompatibleSource || currentRoomSource,
              details: currentRoomMovie,
              room: currentRoom
            }
          })
        } else {
          console.error('❌ Cannot navigate to party: missing room', {
            currentRoom: !!currentRoom,
            currentRoomMovie: !!currentRoomMovie
          })
          alert('Cannot start party - room not found')
        }
        return
      }
      if (data.type === 'room_invitation') {
        playMemberUpdateSound()
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

      if (data.type === 'party_movie_cleared') {
        setRoomMovie(null)
        setRoomSource(null)
        setMemberStatuses(new Map())
        setMyCompatibleSource(null)
        setAllMembersReady(false)
        setCanStartParty(false)
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

      if (data.type === 'user_left') {
        setRoom((prev) => {
          if (!prev) return null
          const filteredMembers = prev.members?.filter((member) => {
            return member.user_id !== data.data.user_id
          })
          return {
            ...prev,
            members: filteredMembers
          }
        })
      }

      if (data.type === 'ownership_transfer') {
        setRoom((prev) => {
          if (!prev) return null
          const changedOwnerMembers = prev.members?.map((member) => {
            if (member.user_id === data.data.new_owner_id) return { ...member, role: 'owner' }
            if (member.role === 'owner') {
              return { ...member, role: 'member' }
            }
            return member
          })
          return {
            ...prev,
            members: changedOwnerMembers,
            ownerId: data.data.new_owner_id
          }
        })

        if (user && data.data.new_owner_id === user.id) {
          setRole('owner')
        } else if (role === 'owner') {
          setRole('member')
        }
      }

      if (data.type === 'room_deleted') {
        setRoom(null)
        setCurrentRoom(null)
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
    [getRoom, playMemberUpdateSound, myCompatibleSource, navigate, role, user]
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

  const checkExtensionsForParty = useCallback(async (): Promise<boolean> => {
    if (!roomMovie || !roomSource || !user || !extensionManifests) return false

    try {
      for (const [manifestUrl, manifest] of Object.entries(extensionManifests)) {
        try {
          const baseUrl = manifestUrl.replace('/manifest.json', '')
          let streamUrl: string

          if (roomMovie.type === 'movie') {
            streamUrl = `${baseUrl}/stream/movie/${roomMovie.imdb_id}.json`
          } else if (roomMovie.type === 'series') {
            const season = roomMovie.season || 1
            const episode = roomMovie.episode || 1
            streamUrl = `${baseUrl}/stream/series/${roomMovie.imdb_id}:${season}:${episode}.json`
          } else {
            continue
          }

          const response = await fetch(streamUrl)
          if (!response.ok) continue

          const streamData = await response.json()
          if (!streamData.streams) continue

          const compatibleStream = streamData.streams.find((stream: any) => {
            const streamInfoHash = stream.infoHash?.toLowerCase()
            const requiredInfoHash = roomSource.infoHash.toLowerCase()
            const streamFileIdx = stream.fileIdx || 0
            const requiredFileIdx = roomSource.fileIdx || 0

            return streamInfoHash === requiredInfoHash && streamFileIdx === requiredFileIdx
          })

          if (compatibleStream) {
            setMyCompatibleSource({
              infoHash: compatibleStream.infoHash,
              fileIdx: compatibleStream.fileIdx || 0,
              quality: compatibleStream.title || compatibleStream.name || roomSource.quality,
              title: compatibleStream.title || compatibleStream.name,
              name: compatibleStream.name,
              behaviorHints: compatibleStream.behaviorHints
            })

            websocketService.send({
              type: 'party_source_status',
              data: {
                userId: user.id,
                username: user.username,
                hasCompatibleSource: true,
                extensionName: manifest.name,
                timestamp: Date.now()
              }
            })

            return true
          }
        } catch (err) {
          console.warn(`[Party] Error checking addon ${manifest.name}:`, err)
        }
      }

      websocketService.send({
        type: 'party_source_status',
        data: {
          userId: user.id,
          username: user.username,
          hasCompatibleSource: false,
          timestamp: Date.now()
        }
      })

      return false
    } catch (err) {
      console.error('[Party] Error checking extensions:', err)
      return false
    }
  }, [roomMovie, roomSource, user, extensionManifests])

  const selectMovieForParty = useCallback(
    (movie: RoomMovie, source: RoomSource) => {
      if (room?.userRole !== 'owner') return

      setRoomMovie(movie)
      setRoomSource(source)

      websocketService.send({
        type: 'party_movie_selected',
        data: {
          movie,
          source,
          timestamp: Date.now()
        }
      })
    },
    [room?.userRole]
  )

  const startWatchParty = useCallback(() => {
    if (room?.userRole !== 'owner' || !canStartParty) return

    websocketService.send({
      type: 'party_start',
      data: {
        timestamp: Date.now()
      }
    })
  }, [room?.userRole, canStartParty])

  const clearPartyMovie = useCallback(() => {
    if (room?.userRole !== 'owner') return

    setRoomMovie(null)
    setRoomSource(null)
    setMemberStatuses(new Map())
    setMyCompatibleSource(null)
    setAllMembersReady(false)
    setCanStartParty(false)

    websocketService.send({
      type: 'party_movie_cleared',
      data: {
        timestamp: Date.now()
      }
    })
  }, [room?.userRole])

  useEffect(() => {
    if (roomMovie && roomSource) {
      checkExtensionsForParty()
    }
  }, [roomMovie, roomSource, room?.userRole, checkExtensionsForParty])

  useEffect(() => {
    if (!room?.members || !roomMovie || !roomSource) {
      setAllMembersReady(false)
      setCanStartParty(false)
      return
    }

    const totalMembers = room.members.length
    const readyMembers = Array.from(memberStatuses.values()).filter(
      (status) => status.hasCompatibleSource
    ).length

    const allReady = totalMembers > 0 && readyMembers === totalMembers
    const canStart = room?.userRole === 'owner' && allReady && myCompatibleSource !== null

    setAllMembersReady(allReady)
    setCanStartParty(canStart)
  }, [memberStatuses, room?.members, room?.userRole, myCompatibleSource, roomMovie, roomSource])

  useEffect(() => {
    if (!token) return

    const subscribe = (): void => {
      if (websocketService.getConnectionStatus()) {
        websocketService.subscribe(
          'room',
          [
            'room_invitation',
            'member_list_update',
            'ownership_transfer',
            'room_deleted',
            'chat_message',
            'playback_update',
            'user_joined',
            'user_left',
            'success',
            'error',
            //
            'party_movie_selected',
            'party_source_status',
            'party_start',
            'party_movie_cleared'
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

  useEffect(() => {
    if (!room || !isInRoom) {
      setRoomMovie(null)
      setRoomSource(null)
      setMemberStatuses(new Map())
      setMyCompatibleSource(null)
      setAllMembersReady(false)
      setCanStartParty(false)
    }
  }, [room?.id, isInRoom])

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
    respondToInvitation,

    //

    roomMovie,
    roomSource,
    memberStatuses,
    allMembersReady,
    canStartParty,
    myCompatibleSource,
    selectMovieForParty,
    checkExtensionsForParty,
    startWatchParty,
    clearPartyMovie
  }
}
