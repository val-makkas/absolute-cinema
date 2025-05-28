import { useState } from 'react'
import { MessageCircle, UserPlus } from 'lucide-react'
import { Friend } from '@/types'

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
  const [hover, setHover] = useState(false)

  const statusColor =
    {
      online: 'bg-green-500',
      away: 'bg-yellow-500',
      DND: 'bg-red-500',
      offline: 'bg-gray-500'
    }[friend.status] || 'bg-gray-500'

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors hover:bg-[rgba(255,255,255,0.1)]"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-semibold">
            {friend.display_name?.charAt(0) || friend.username.charAt(0)}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 block w-3 h-3 rounded-full border-2 border-[#1B1B1B] ${statusColor}`}
          />
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">
            {friend.display_name || friend.username}
          </p>
          <p className="text-xs text-white/60 truncate">
            {friend.status === 'offline' ? friend.last_seen : friend.activity}
          </p>
        </div>
      </div>

      {hover && friend.status !== 'offline' && (
        <div className="flex items-center gap-2 text-white">
          <MessageCircle
            className="w-5 h-5 hover:text-purple-400 transition-colors"
            onClick={onMessage}
          />
          <UserPlus
            className="w-5 h-5 hover:text-purple-400 transition-colors"
            onClick={onInvite}
          />
        </div>
      )}
    </div>
  )
}
