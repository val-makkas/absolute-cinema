import { Users, UserPlus } from 'lucide-react'
import { Friend, FriendRequest } from '@/types'
import FriendItem from './FriendItem'

interface FriendsSidebarProps {
  friends: Friend[]
  friendRequests: FriendRequest[]
  friendsLoading: boolean
  friendsError: string | null
  onFriendAction: (action: 'send' | 'accept' | 'reject' | 'remove', payload: string) => void
}

export default function FriendsSidebar({
  friends,
  friendRequests,
  friendsLoading,
  friendsError,
  onFriendAction
}: FriendsSidebarProps): React.ReactElement {
  return (
    <div className="fixed right-0 top-0 w-80 h-screen backdrop-blur-xl border-l border-white/10 flex flex-col z-8">
      {/* header */}
      <div className="mt-15">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Friends</h2>
          </div>
          <UserPlus className="w-5 h-5 text-white/60 hover:text-white cursor-pointer transition-colors" />
        </div>

        {/* incoming requests */}
        {friendRequests.length > 0 && (
          <div className="px-4 py-2 space-y-2 border-b border-white/10">
            <h3 className="text-xs text-white/60 uppercase">Requests</h3>
            {friendRequests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-2 bg-[rgba(255,255,255,0.05)] rounded"
              >
                <span className="text-sm text-white truncate">{r.username}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onFriendAction('accept', r.sender_id.toString())}
                    className="text-green-400 hover:text-green-500 text-sm"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onFriendAction('reject', r.sender_id.toString())}
                    className="text-red-400 hover:text-red-500 text-sm"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* friends list */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 scrollbar-thin scrollbar-thumb-white/20">
          {friendsLoading ? (
            <div className="flex items-center justify-center p-4">
              <div className="text-white/60">Loading friends...</div>
            </div>
          ) : friendsError ? (
            <div className="flex items-center justify-center p-4">
              <div className="text-red-400 text-sm">{friendsError}</div>
            </div>
          ) : (
            (Array.isArray(friends) ? friends : []).map((f) => (
              <FriendItem
                key={f.id}
                friend={f}
                onInvite={() => onFriendAction('remove', f.username)}
                onMessage={() => console.log(`DM ${f.username}`)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
