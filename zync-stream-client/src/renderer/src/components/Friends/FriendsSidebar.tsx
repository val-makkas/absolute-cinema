import { useState } from 'react'
import { Users, UserPlus, Search, ArrowLeft } from 'lucide-react'
import { Friend, FriendRequest } from '@/types'
import FriendItem from './FriendItem'

interface FriendsSidebarProps {
  friends: Friend[]
  friendRequests: FriendRequest[]
  friendsLoading: boolean
  friendsError: string | null
  onFriendAction: (action: 'send' | 'accept' | 'reject' | 'invite', payload: string) => void
  searchUser: (query: string) => Promise<SearchUser[]>
}

interface SearchUser {
  id: string
  username: string
  display_name: string
  avatar?: string
}

export default function FriendsSidebar({
  friends,
  friendRequests,
  friendsLoading,
  friendsError,
  onFriendAction,
  searchUser
}: FriendsSidebarProps): React.ReactElement {
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)

  const handleSearch = async (query: string): Promise<void> => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const results = await searchUser(query)
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleSearchInputChange = (value: string): void => {
    setSearchQuery(value)
    handleSearch(value)
  }

  const toggleSearch = (): void => {
    setShowSearch(!showSearch)
    if (showSearch) {
      setSearchQuery('')
      setSearchResults([])
    }
  }

  return (
    <div className="fixed right-0 top-0 w-80 h-screen backdrop-blur-xl border-l border-white/10 flex flex-col z-8">
      <div className="mt-15">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            {showSearch ? (
              <>
                <button
                  onClick={toggleSearch}
                  className="p-1 hover:bg-white/10 rounded-md transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <h2 className="text-lg font-semibold text-white">Add Friends</h2>
              </>
            ) : (
              <>
                <Users className="w-6 h-6 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">Friends</h2>
              </>
            )}
          </div>

          {!showSearch && (
            <button
              onClick={toggleSearch}
              className="p-1 hover:bg-white/10 rounded-md transition-colors"
            >
              <UserPlus className="w-5 h-5 text-white/60 hover:text-white transition-colors" />
            </button>
          )}
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            showSearch ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-4 py-3 border-b border-white/10">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-white/50" />
              </div>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all"
              />
            </div>
          </div>
        </div>

        {!showSearch && friendRequests.length > 0 && (
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
                    onClick={() => onFriendAction('accept', r.id.toString())}
                    className="text-green-400 hover:text-green-500 text-sm"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onFriendAction('reject', r.id.toString())}
                    className="text-red-400 hover:text-red-500 text-sm"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 scrollbar-thin scrollbar-thumb-white/20">
          <div className="relative min-h-full">
            {!showSearch && (
              <div className="transition-all duration-300 ease-in-out opacity-100 transform translate-x-0">
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
                      onInvite={() => onFriendAction('invite', f.username)}
                      onMessage={() => console.log(`DM ${f.username}`)}
                    />
                  ))
                )}
              </div>
            )}

            {showSearch && (
              <div className="transition-all duration-300 ease-in-out opacity-100 transform translate-x-0">
                {searching ? (
                  <div className="flex items-center justify-center p-4">
                    <div className="text-white/60">Searching...</div>
                  </div>
                ) : searchQuery && searchResults.length === 0 ? (
                  <div className="flex items-center justify-center p-4">
                    <div className="text-white/60">No users found</div>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-1">
                    <h3 className="text-xs text-white/60 uppercase px-2 mb-2">Search Results</h3>
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {user.display_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-white text-sm font-medium">
                              {user.display_name}
                            </div>
                            <div className="text-white/60 text-xs">@{user.username}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            onFriendAction('send', user.username)
                          }}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-md transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                ) : !searchQuery ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <Search className="w-12 h-12 text-white/30 mx-auto mb-3" />
                      <div className="text-white/60 text-sm">
                        Search for users to add as friends
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
