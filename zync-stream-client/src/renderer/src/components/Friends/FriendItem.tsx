import { Friend } from '@/types'
import { Room } from '@/hooks/useRoom'
import { Plus, MessageCircle } from 'lucide-react'

interface FriendItemProps {
  friend: Friend
  isInRoom: boolean
  room?: Room
  onInvite: (username: string) => void
  onMessage: () => void
}

// FriendItem.tsx - Add status indicators
export default function FriendItem({
  friend,
  isInRoom,
  room,
  onInvite,
  onMessage
}: FriendItemProps): React.ReactElement {
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
          <button
            onClick={() => {
              onInvite(friend.username)
            }}
            className="text-white/60 hover:text-white"
          >
            <Plus className="w-5 h-5" />
          </button>
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
