import React, { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Source, User } from '@/types'
import { RoomMovie } from '@renderer/hooks/useRoom'
import { useLocation } from 'react-router-dom'
import {
  CheckCircle,
  XCircle,
  Loader2,
  Play,
  Clock,
  LogOut,
  Users2,
  Crown,
  Sparkles,
  Zap,
  ArrowLeft
} from 'lucide-react'

interface ElectronAPI {
  prepareStream: (
    streamUrl: string,
    infoHash: string,
    fileIdx: number,
    movieDetails: RoomMovie | null
  ) => Promise<{ success: boolean; ready: boolean }>
  startSynchronizedPlayback: () => Promise<{ success: boolean }>
  initWatchParty: (roomId: number, isHost: boolean) => Promise<{ success: boolean }>
  allMembersReady: () => Promise<{ success: boolean }>
  resetWatchParty: () => Promise<{ success: boolean }>
  onPartyEvent: (callback: (event: string, data?: any) => void) => void
  offPartyEvent: () => void

  playInMpvSolo: (
    streamUrl: string,
    infoHash: string,
    fileIdx: number,
    movieDetails: RoomMovie | null
  ) => Promise<{ success: boolean }>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

interface VideoPlayerProps {
  source: Source | null
  details: RoomMovie | null
  onExit: () => void
  user: User | null
  room: any
  memberStatuses: Map<number, any>
  startWatchParty: () => void
  leaveRoom: () => void
  sendMessage: (message: string) => void
  messages: any[]
  token: string
}

const API_BASE_URL = 'http://localhost:8888'

export default function PartyPage({
  source,
  details,
  onExit,
  user,
  room,
  memberStatuses,
  startWatchParty,
  leaveRoom,
  sendMessage,
  messages
}: VideoPlayerProps): React.ReactElement {
  const location = useLocation()
  const { selectedSource, details: locationDetails, room: locationRoom } = location.state || {}

  console.log(details, "||||||", locationDetails)
  const finalSource = source || selectedSource
  const finalDetails = details || locationDetails
  const finalRoom = room || locationRoom

  const [phase, setPhase] = useState<'loading' | 'ready' | 'countdown' | 'playing' | 'error'>(
    'loading'
  )
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [loadingStep, setLoadingStep] = useState('Initializing')
  const [memberReadyStates, setMemberReadyStates] = useState<Set<number>>(new Set())

  const movieTitle = finalDetails?.name || finalDetails?.title || 'Unknown Title'
  const movieYear = finalDetails?.year
  const isHost = finalRoom?.userRole === 'owner'
  const totalMembers = finalRoom?.members?.length || 0
  const readyMembers = memberReadyStates.size
  const allReady = readyMembers === totalMembers && totalMembers > 0

  const infoHash = finalSource?.infoHash || ''
  const fileIdx = finalSource?.fileIdx ?? 0
  const magnetUri = `magnet:?xt=urn:btih:${infoHash}`

  const handleStartPlayback = useCallback(async (): Promise<void> => {
    setPhase('playing')
    try {
      const result = await window.electronAPI?.startSynchronizedPlayback()
      if (!result?.success) {
        throw new Error('Failed to start synchronized playback')
      }
    } catch (err) {
      setError('Failed to start watch party: ' + (err as Error).message)
      setPhase('error')
    }
  }, [])

  const setupStream = useCallback(async () => {
    if (!finalSource) {
      setError('No source available')
      setPhase('error')
      return
    }

    try {
      setLoadingStep('Connecting to network')
      const response = await fetch(`${API_BASE_URL}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnet: magnetUri, fileIdx: fileIdx })
      })

      setLoadingStep('Processing metadata')
      let data: any = null
      if (response.ok) {
        data = await response.json()
      } else {
        if (response.status === 504) {
          throw new Error('No seeds available for this torrent')
        }
        throw new Error(`Network error: ${response.statusText}`)
      }

      if (data?.infoHash) {
        setLoadingStep('Preparing stream')
        const directStreamUrl = `${API_BASE_URL}/stream/${data.infoHash}/${fileIdx}`
        const prepareResult = await window.electronAPI?.prepareStream(
          directStreamUrl,
          data.infoHash,
          fileIdx,
          details
        )
        if (prepareResult?.ready) {
          setPhase('ready')
        } else {
          throw new Error('Failed to prepare stream')
        }
      } else {
        throw new Error('Invalid stream data')
      }
    } catch (err) {
      setError((err as Error).message)
      setPhase('error')
    }
  }, [finalSource, magnetUri, fileIdx])

  const handleStart = async () => {
    if (isHost && allReady) {
      await handleStartPlayback()
      if (startWatchParty) startWatchParty()
      sendMessage(JSON.stringify({ type: 'watch_party_start' }))
    }
  }

  const handleExit = async () => {
    try {
      await window.electronAPI?.resetWatchParty?.()
      if (finalRoom && leaveRoom) leaveRoom()
    } catch {}
    onExit()
  }

  useEffect(() => {
    if (!finalSource || !finalDetails) {
      setError('No content selected')
      setPhase('error')
      return
    }

    const initParty = async () => {
      try {
        const userIsHost = finalRoom?.userRole === 'owner'
        const result = await window.electronAPI?.initWatchParty?.(
          parseInt(finalRoom.id),
          userIsHost
        )
        if (result?.success) {
          setupStream()
        } else {
          throw new Error('Failed to initialize watch party')
        }
      } catch (err) {
        setError('Failed to initialize watch party')
        setPhase('error')
      }
    }

    initParty()
  }, [finalRoom, finalSource, finalDetails, setupStream])

  useEffect(() => {
    const handleMainEvents = (event: string, data?: any) => {
      switch (event) {
        case 'member-ready-local':
          if (user) {
            sendMessage(
              JSON.stringify({
                type: 'watch_party_ready',
                user_id: user.id,
                username: user.username,
                prepared: true,
                timestamp: Date.now()
              })
            )
          }
          break
        case 'party-countdown-broadcast':
          setCountdown(data)
          setPhase('countdown')
          break
        case 'party-start-playback-broadcast':
          handleStartPlayback()
          break
      }
    }

    if (window.electronAPI?.onPartyEvent) {
      window.electronAPI.onPartyEvent(handleMainEvents)
    }
    return () => window.electronAPI?.offPartyEvent?.()
  }, [user, sendMessage, handleStartPlayback])

  useEffect(() => {
    if (!messages || !Array.isArray(messages)) return

    const newReadyStates = new Set(memberReadyStates)

    messages.forEach((msg) => {
      try {
        const parsed = JSON.parse(msg.data?.message || '{}')
        switch (parsed.type) {
          case 'watch_party_ready':
            newReadyStates.add(parsed.user_id)
            break
          case 'watch_party_countdown':
            setCountdown(parsed.countdown)
            setPhase('countdown')
            break
          case 'watch_party_start':
            if (!isHost) handleStartPlayback()
            break
        }
      } catch {
        //
      }
    })

    setMemberReadyStates(newReadyStates)
  }, [messages, isHost, handleStartPlayback])

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="bg-black/60 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-white text-xl font-semibold mb-3">Connection Failed</h2>
            <p className="text-gray-400 text-sm mb-6">{error}</p>
            <Button
              onClick={handleExit}
              className="w-full bg-white/10 hover:bg-white/20 text-white border-0"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Browse
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'countdown' && countdown !== null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-8 relative">
            <div className="absolute inset-0 rounded-full border-2 border-white/10" />
            <div className="absolute inset-0 rounded-full border-2 border-t-orange-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold text-white">{countdown}</span>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-3">{movieTitle}</h1>
          <p className="text-gray-400 text-lg mb-8">{movieYear}</p>

          <div className="bg-black/40 backdrop-blur-xl border border-orange-500/20 rounded-2xl p-6 mb-8 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-orange-400 animate-pulse" />
              <span className="text-orange-300 font-medium">Starting Soon</span>
            </div>
            <p className="text-gray-300 text-sm">Movie begins in {countdown} seconds</p>
          </div>

          <Button
            onClick={handleExit}
            className="bg-white/10 hover:bg-white/20 text-white border-0"
          >
            <LogOut className="w-4 h-4 mr-2" /> Leave
          </Button>
        </div>
      </div>
    )
  }

  if (phase === 'playing') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-8 relative">
            <div className="absolute inset-0 rounded-full bg-green-500/20 flex items-center justify-center">
              <Play className="w-12 h-12 text-green-400" fill="currentColor" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-green-400/30 animate-ping" />
          </div>

          <h1 className="text-4xl font-bold text-white mb-3">{movieTitle}</h1>
          <p className="text-gray-400 text-lg mb-8">{movieYear}</p>

          <div className="bg-black/40 backdrop-blur-xl border border-green-500/20 rounded-2xl p-6 mb-8 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Sparkles className="w-5 h-5 text-green-400 animate-pulse" />
              <span className="text-green-300 font-medium">Now Playing</span>
            </div>
            <p className="text-gray-300 text-sm">Synchronized experience has begun</p>
          </div>

          <Button
            onClick={handleExit}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border-0"
          >
            <LogOut className="w-4 h-4 mr-2" /> Leave Party
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">{movieTitle}</h1>
          <p className="text-xl text-gray-400 mb-6">{movieYear}</p>
          <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-4 py-1">
            <Users2 className="w-4 h-4 mr-2" />
            Watch Party
          </Badge>
        </div>

        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-white mb-2">
              {phase === 'loading'
                ? loadingStep
                : allReady
                  ? 'Ready to Start'
                  : `${readyMembers} of ${totalMembers} Ready`}
            </h2>
          </div>

          <div className="flex justify-center mb-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 max-w-3xl">
              {finalRoom?.members?.map((member: any) => {
                const isCurrentUser = member.user_id === user?.id
                const isReady =
                  memberReadyStates.has(member.user_id) || (isCurrentUser && phase === 'ready')
                const initials = (member.display_name || member.username || 'U')
                  .charAt(0)
                  .toUpperCase()

                return (
                  <div key={member.user_id} className="flex flex-col items-center text-center">
                    <div className="relative mb-3">
                      <div
                        className={`
                        w-14 h-14 rounded-full flex items-center justify-center text-white font-medium text-lg
                        border-2 transition-all duration-300
                        ${
                          isReady
                            ? 'bg-green-500/20 border-green-500/40'
                            : phase === 'loading'
                              ? 'bg-blue-500/20 border-blue-500/40'
                              : 'bg-gray-500/20 border-gray-500/40'
                        }
                      `}
                      >
                        {phase === 'loading' && !isReady ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          initials
                        )}
                      </div>

                      {member.role === 'owner' && (
                        <Crown className="absolute -top-1 -right-1 w-5 h-5 text-yellow-400" />
                      )}

                      {isReady && (
                        <CheckCircle className="absolute -bottom-1 -right-1 w-5 h-5 text-green-400 bg-black rounded-full" />
                      )}
                    </div>

                    <div className="flex flex-col items-center space-y-1">
                      <p className="text-white text-sm font-medium truncate max-w-20">
                        {member.display_name || member.username}
                      </p>
                      {isCurrentUser && (
                        <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs px-2 py-0.5">
                          You
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {phase === 'loading' ? (
            <div className="space-y-4">
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 animate-pulse rounded-full" />
              </div>
              <p className="text-center text-gray-400 text-sm">
                Setting up synchronized experience
              </p>
            </div>
          ) : allReady ? (
            <div className="text-center space-y-6">
              <div className="flex items-center justify-center gap-3 text-green-400">
                <CheckCircle className="w-6 h-6" />
                <span className="text-lg font-semibold">All members ready!</span>
              </div>
              {isHost ? (
                <Button
                  onClick={handleStart}
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0 px-8 py-3"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Start Movie
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-3 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-lg">Waiting for host to start...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 rounded-full"
                  style={{ width: `${(readyMembers / totalMembers) * 100}%` }}
                />
              </div>
              <p className="text-center text-gray-400 text-sm">Waiting for all members to sync</p>
            </div>
          )}
        </div>

        <div className="text-center space-y-4">
          <Button
            onClick={handleExit}
            className="bg-white/10 hover:bg-white/20 text-white border-0"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {phase === 'loading' ? 'Cancel' : 'Leave Party'}
          </Button>
          <p className="text-gray-500 text-sm">
            {finalRoom?.name || `Room #${finalRoom?.id}`} • {totalMembers} members
          </p>
        </div>
      </div>
    </div>
  )
}
