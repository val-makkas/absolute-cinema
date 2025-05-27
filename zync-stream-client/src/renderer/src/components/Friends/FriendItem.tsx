import { useState } from 'react'
import { Friend } from '@/types'
import { MessageCircle, Video } from 'lucide-react'

interface FriendItemProps {
  friend: Friend
  onInvite: () => void
  onMessage: () => void
}

export default function FriendItem({
  friend,
  onInvite,
  onMessage
}: FriendItemProps): React.ReactElement {
  const [showActions, setShowActions] = useState(false)

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'away':
        return 'bg-yellow-500'
      case 'busy':
        return 'bg-red-500'
      case 'offline':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div
      className="group relative p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-sm font-semibold text-white">
            {friend.display_name?.[0]?.toUpperCase() || friend.username[0]?.toUpperCase()}
          </div>
          {/* Status indicator */}
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(friend.status)}`}
          />
        </div>

        {/* Friend info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white text-sm truncate">
            {friend.display_name || friend.username}
          </div>
          <div className="text-xs text-white/60 truncate">
            {friend.status === 'offline' ? friend.last_seen : friend.activity || 'Online'}
          </div>
        </div>

        {/* Action buttons */}
        {showActions && friend.status !== 'offline' && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onMessage}
              className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              title="Send message"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            <button
              onClick={onInvite}
              className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              title="Invite to room"
            >
              <Video className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
