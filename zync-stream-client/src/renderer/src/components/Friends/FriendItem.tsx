import { Friend } from '@/types'
import { Room } from '@/hooks/useRoom'
import { Plus, MessageCircle, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'

interface FriendItemProps {
  friend: Friend
  isInRoom: boolean
  room: Room | null
  onInvite: (username: string) => void
  onMessage: () => void
}

export default function FriendItem({
  friend,
  isInRoom,
  room,
  onInvite,
  onMessage
}: FriendItemProps): React.ReactElement {
  const [inviteTimeout, setInviteTimeout] = useState<number>(0)
  const [isInviting, setIsInviting] = useState(false)

  const isAlreadyInRoom =
    room?.members?.some((member) => member.username === friend.username) || false

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'dnd':
        return 'bg-red-500'
      case 'watching':
        return 'bg-purple-500'
      case 'offline':
      default:
        return 'bg-gray-500'
    }
  }

  const handleInvite = (): void => {
    if (inviteTimeout > 0) return

    setIsInviting(true)
    onInvite(friend.username)

    setInviteTimeout(30)

    setTimeout(() => setIsInviting(false), 1000)
  }

  useEffect(() => {
    if (inviteTimeout <= 0) return

    const timer = setInterval(() => {
      setInviteTimeout((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [inviteTimeout])

  const CircleProgress = ({ seconds }: { seconds: number }): React.ReactElement => {
    const circumference = 2 * Math.PI * 8
    const strokeDasharray = circumference
    const strokeDashoffset = circumference - (circumference * (30 - seconds)) / 30

    return (
      <div className="relative w-7 h-7">
        <svg className="w-7 h-7 transform -rotate-90" viewBox="0 0 20 20">
          <circle
            cx="10"
            cy="10"
            r="8"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-white/20"
          />
          <circle
            cx="10"
            cy="10"
            r="8"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="text-white transition-all duration-1000 ease-linear"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-xs font-medium">{seconds}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {friend.display_name?.charAt(0).toUpperCase() ||
                friend.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${getStatusColor(friend.status)} border-2 border-gray-900 rounded-full`}
          />
        </div>

        <div className="flex-1">
          <div className="text-white text-sm font-medium">
            {friend.display_name || friend.username}
          </div>
          <div className="text-white/60 text-xs">@{friend.username}</div>
          {friend.activity && <div className="text-white/50 text-xs mt-0.5">{friend.activity}</div>}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onMessage} className="text-white/60 hover:text-white">
          <MessageCircle className="w-5 h-5" />
        </button>
        {isInRoom && !isAlreadyInRoom ? (
          inviteTimeout > 0 ? (
            <div
              className="text-orange-500 opacity-80 cursor-not-allowed"
              title={`Wait ${inviteTimeout}s before inviting again`}
            >
              <CircleProgress seconds={inviteTimeout} />
            </div>
          ) : (
            <button
              onClick={handleInvite}
              disabled={isInviting}
              className={`text-white/60 hover:text-white transition-colors ${
                isInviting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title={`Invite ${friend.username} to room`}
            >
              {isInviting ? (
                <Clock className="w-5 h-5 animate-pulse" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </button>
          )
        ) : isInRoom && isAlreadyInRoom ? (
          <></>
        ) : (
          <button
            onClick={() => {
              onInvite(friend.username)
            }}
            className="text-white/60 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:text-white"
            disabled={true}
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
