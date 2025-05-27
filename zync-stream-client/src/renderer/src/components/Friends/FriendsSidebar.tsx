import { User, Friend } from '@/types'
import { useState, useEffect } from 'react'
import { Users, UserPlus, Circle } from 'lucide-react'
import FriendItem from './FriendItem'

interface FriendsSidebarProps {
  currUser: User | null
}

export default function FriendsSidebar({ currUser }: FriendsSidebarProps): React.ReactElement {
  const [friends, setFriends] = useState<Friend[]>([])
  const [onlineFriends, setOnlineFriends] = useState<Friend[]>([])
  const [offlineFriends, setOfflineFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    const mockFriends: Friend[] = [
      {
        id: 1,
        username: 'alice_cooper',
        display_name: 'Alice Cooper',
        status: 'online',
        activity: 'Watching The Matrix'
      },
      {
        id: 2,
        username: 'bob_builder',
        display_name: 'Bob the Builder',
        status: 'away',
        activity: 'Away for 5 minutes'
      },
      {
        id: 3,
        username: 'charlie_brown',
        display_name: 'Charlie',
        status: 'DND',
        activity: 'In a room'
      },
      {
        id: 4,
        username: 'diana_prince',
        display_name: 'Diana Prince',
        status: 'offline',
        last_seen: '2 hours ago'
      }
    ]

    setFriends(mockFriends)
    setOnlineFriends(mockFriends.filter((f) => f.status !== 'offline'))
    setOfflineFriends(mockFriends.filter((f) => f.status === 'offline'))
    setLoading(false)
  }, [])

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'DND':
        return 'bg-red-500'
      case 'away':
        return 'bg-yellow-500'
      case 'offline':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  const setStatusIcon = (status: string): React.ReactElement => {
    return (
      <Circle className={`w-3 h-3 ${getStatusColor(status)} rounded-full`} fill="currentColor" />
    )
  }

  const handleInviteToRoom = (friend: Friend) => {
    console.log(`Inviting ${friend.username} to room`)
  }

  const handleDirectMessage = (friend: Friend) => {
    console.log(`Starting DM with ${friend.username}`)
  }

  return (
    <div className="w-80 h-full bg-background border-l border-white/10 flex flex-col">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Friends</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
        {loading ? (
          <div className="p-4 text-center text-white/60">Loading friends...</div>
        ) : (
          <div className="p-2">
            {onlineFriends.length > 0 && (
              <div className="mb-4">
                <div className="px-2 py-1 text-xs font-semibold text-white/60 uppercase tracking-wide">
                  Online — {onlineFriends.length}
                </div>
                <div className="space-y-1">
                  {onlineFriends.map((friend) => (
                    <FriendItem
                      key={friend.id}
                      friend={friend}
                      onInvite={() => handleInviteToRoom(friend)}
                      onMessage={() => handleDirectMessage(friend)}
                    />
                  ))}
                </div>
              </div>
            )}

            {offlineFriends.length > 0 && (
              <div>
                <div className="px-2 py-1 text-xs font-semibold text-white/60 uppercase tracking-wide">
                  Offline — {offlineFriends.length}
                </div>
                <div className="space-y-1">
                  {offlineFriends.map((friend) => (
                    <FriendItem
                      key={friend.id}
                      friend={friend}
                      onInvite={() => handleInviteToRoom(friend)}
                      onMessage={() => handleDirectMessage(friend)}
                    />
                  ))}
                </div>
              </div>
            )}

            {friends.length === 0 && (
              <div className="p-4 text-center text-white/60">
                <UserPlus className="w-8 h-8 mx-auto mb-2 text-white/40" />
                <p>No friends yet</p>
                <p className="text-sm">Share the word bro.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/10">
        <button className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2">
          <UserPlus className="w-4 h-4" />
          Add Friend
        </button>
      </div>
    </div>
  )
}
