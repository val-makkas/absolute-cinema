import { Friend } from '@/types'

interface FriendItemProps {
  friend: Friend
  onInvite: () => void
  onMessage: () => void
}

// FriendItem.tsx - Add status indicators
export default function FriendItem({
  friend,
  onInvite,
  onMessage
}: FriendItemProps): React.ReactElement {
  // Status color mapping
  const getStatusColor = (status: string) => {
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
        {/* Avatar with status indicator */}
        <div className="relative">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {friend.display_name?.charAt(0).toUpperCase() ||
                friend.username.charAt(0).toUpperCase()}
            </span>
          </div>
          {/* 🆕 Status indicator dot */}
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${getStatusColor(friend.status)} border-2 border-gray-900 rounded-full`}
          />
        </div>

        <div className="flex-1">
          <div className="text-white text-sm font-medium">
            {friend.display_name || friend.username}
          </div>
          <div className="text-white/60 text-xs">@{friend.username}</div>
          {/* 🆕 Activity status */}
          {friend.activity && <div className="text-white/50 text-xs mt-0.5">{friend.activity}</div>}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button onClick={onMessage} className="text-white/60 hover:text-white">
          💬
        </button>
        <button onClick={onInvite} className="text-white/60 hover:text-white">
          🎬
        </button>
      </div>
    </div>
  )
}
