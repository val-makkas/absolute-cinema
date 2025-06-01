import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Home,
  Search,
  Puzzle,
  LogOut,
  Compass,
  PartyPopper,
  Users,
  Plus,
  X,
  Play,
  Crown,
  ChevronDown
} from 'lucide-react'
import Logo from '@/components/ui/logo'
import { useState } from 'react'
import { Notification } from '@/types'
import NotificationBell from '@/components/Notifications/NotificationBell'
import { RoomMember } from '@/hooks/useRoom'

interface SidebarProps {
  onSelect: (key: string) => void
  onSearchValue: (value: string) => void
  onLogout: () => void
  username: string | null
  searching: boolean
  notifications?: Notification[]
  unreadCount?: number
  connected?: boolean
  onMarkAsRead?: (id: string) => void
  onMarkAllAsRead?: () => void
  onClearAll?: () => void
  onRemoveNotification?: (id: string) => void

  party?: RoomMember[] | null
  isHost?: boolean
  onCreateParty?: () => void
  onInviteFriend?: (friendId: number) => void
  onKickMember?: (memberId: number) => void
  onStartParty?: () => void
  onLeaveParty?: () => void
}

export default function Sidebar({
  onSelect,
  onSearchValue,
  onLogout,
  username,
  searching,
  notifications = [],
  unreadCount = 0,
  connected = false,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onRemoveNotification,

  party = null,
  isHost = false,
  onCreateParty,
  onInviteFriend,
  onKickMember,
  onStartParty,
  onLeaveParty
}: SidebarProps): React.ReactElement {
  const [searchInputValue, setSearchInputValue] = useState<string>('')
  const [partyExpanded, setPartyExpanded] = useState(false)

  const partyDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(event.target as Node)) {
        setPartyExpanded(false)
      }
    }

    if (partyExpanded) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [partyExpanded])

  return (
    <>
      <aside className="fixed left-[2px] h-[calc(100vh-4px)] w-[calc(5rem-4px)] bg-black/70 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-6 z-60">
        <div
          className="relative group cursor-pointer flex items-center justify-center"
          onClick={() => onSelect('home')}
        >
          <Logo w={10} h={10} abs={false} />
        </div>

        <div className="h-5"></div>

        <div className="flex-1 flex flex-col items-center gap-6 pt-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl relative group focus-visible:ring-2 focus-visible:ring-white/30 border border-transparent transition-all hover:scale-105"
            onClick={() => onSelect('home')}
            title="Home"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
          >
            <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-gradient-to-br from-purple-600/40 to-blue-600/40 transition-all duration-300 group-hover:shadow-[0_0_10px_rgba(120,87,255,0.5)]"></span>
            <Home className="w-6 h-6 text-white relative z-10 group-hover:text-white" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl relative group focus-visible:ring-2 focus-visible:ring-white/30 border border-transparent transition-all hover:scale-105"
            onClick={() => onSelect('discover')}
            title="Discover"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
          >
            <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-gradient-to-br from-purple-600/40 to-blue-600/40 transition-all duration-300 group-hover:shadow-[0_0_10px_rgba(120,87,255,0.5)]"></span>
            <Compass className="w-6 h-6 text-white relative z-10 group-hover:text-white" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl relative group focus-visible:ring-2 focus-visible:ring-white/30 border border-transparent transition-all hover:scale-105"
            onClick={() => onSelect('extensions')}
            title="Extensions"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
          >
            <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-gradient-to-br from-purple-600/40 to-blue-600/40 transition-all duration-300 group-hover:shadow-[0_0_10px_rgba(120,87,255,0.5)]"></span>
            <Puzzle className="w-10 h-10 text-white relative z-10 group-hover:text-white" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="mt-auto mb-4 rounded-xl relative group focus-visible:ring-2 focus-visible:ring-white/30 border border-transparent transition-all hover:scale-105"
          onClick={onLogout}
          title="Logout"
          style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
        >
          <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-gradient-to-br from-purple-600/40 to-blue-600/40 transition-all duration-300 group-hover:shadow-[0_0_10px_rgba(120,87,255,0.5)]"></span>
          <LogOut className="w-6 h-6 text-white relative z-10 group-hover:text-white" />
        </Button>
      </aside>
      <header className="fixed left-0 top-0 right-0 h-[calc(4rem-4px)] backdrop-blur-xl flex items-center px-8 z-50">
        <div className="flex-1" />

        <div className="relative w-[275px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {searching ? (
              <svg
                className="animate-spin h-5 w-5 text-purple-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <Search className="h-5 w-5 text-white/50" />
            )}
          </div>

          <Input
            placeholder="Search for movies, series..."
            className="h-11 pl-10 pr-12 py-3 bg-black/40 border border-white/10 rounded-xl text-white/90 
    placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-purple-500/50 
    shadow-lg transition-all hover:bg-black/50"
            value={searchInputValue}
            onChange={(e) => setSearchInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                onSearchValue && onSearchValue(e.currentTarget.value.trim())
              } else if (e.key === 'Escape') {
                setSearchInputValue('')
                onSearchValue && onSearchValue('')
              }
            }}
          />

          {searchInputValue && (
            <button
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/50 hover:text-white/80"
              onClick={() => {
                setSearchInputValue('')
                onSearchValue && onSearchValue('')
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        <div className="flex-1 flex justify-end items-center space-x-3">
          <div className="relative">
            {party && party.length > 0 ? (
              <div className="relative mr-30" ref={partyDropdownRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 rounded-full relative group focus-visible:ring-2 focus-visible:ring-white/30 border-2 border-transparent transition-all hover:scale-105 overflow-hidden"
                  onClick={() => setPartyExpanded(!partyExpanded)}
                  title="Party"
                >
                  <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 bg-gradient-to-br from-purple-600/40 to-pink-600/40 transition-all duration-300"></span>

                  <div className="flex items-center gap-2 relative z-10">
                    <div className="p-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white font-medium text-sm">{party.length}</span>

                    <div className="flex -space-x-1">
                      {party.slice(0, 6).map((member, index) => (
                        <div
                          key={`preview-${member.userID}-${index}`}
                          className="relative w-6 h-6 rounded-full border border-black overflow-hidden"
                          style={{ zIndex: 10 - index }}
                        >
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={member.display_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {member.display_name[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <ChevronDown
                      className={`w-3 h-3 text-gray-400 transition-transform ${partyExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </Button>

                {partyExpanded && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-[100]">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-semibold">Party Members</h3>
                        <div className="flex gap-2">
                          {isHost && onInviteFriend && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-black/50 border-white/20 hover:bg-white/10"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                          {onLeaveParty && (
                            <Button
                              onClick={onLeaveParty}
                              size="sm"
                              variant="outline"
                              className="bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30"
                            >
                              Leave Party
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                        {party.map((member) => (
                          <div
                            key={member.userID}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
                          >
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full overflow-hidden">
                                {member.avatar_url ? (
                                  <img
                                    src={member.avatar_url}
                                    alt={member.display_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                                    <span className="text-white text-sm font-bold">
                                      {member.display_name[0].toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-white text-sm font-medium">
                                  {member.display_name}
                                </span>
                                {member.role === 'owner' && (
                                  <Crown className="w-3 h-3 text-yellow-400" />
                                )}
                              </div>
                              <span className="text-gray-400 text-xs">@{member.username}</span>
                            </div>

                            {isHost && member.role !== 'owner' && onKickMember && (
                              <Button
                                onClick={() => onKickMember(member.userID)}
                                size="sm"
                                variant="ghost"
                                className="w-6 h-6 p-0 hover:bg-red-500/20"
                              >
                                <X className="w-3 h-3 text-red-400" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>

                      {isHost && onStartParty && (
                        <Button
                          onClick={onStartParty}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Watch Party
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="mr-30 h-9 px-3 rounded-full relative group focus-visible:ring-2 focus-visible:ring-white/30 border-2 border-transparent transition-all hover:scale-105 overflow-hidden"
                onClick={() => {
                  console.log('Party button clicked!', { onCreateParty })
                  if (onCreateParty) {
                    onCreateParty()
                  } else {
                    console.error('onCreateParty function is not provided!')
                  }
                }}
                title="Create Party"
              >
                <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 bg-gradient-to-br from-purple-600/40 to-pink-600/40 transition-all duration-300"></span>
                <div className="flex items-center gap-2 relative z-10">
                  <PartyPopper className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium">Create Party</span>
                </div>
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 rounded-full relative group focus-visible:ring-2 focus-visible:ring-white/30 border-2 border-transparent transition-all hover:scale-105 overflow-hidden"
            title="Chat"
            onClick={() => onSelect && onSelect('chat')}
          >
            <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 bg-gradient-to-br from-purple-600/40 to-blue-600/40 transition-all duration-300 group-hover:shadow-[0_0_10px_rgba(120,87,255,0.5)]"></span>

            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="relative z-10"
            >
              <path
                d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
          {onMarkAsRead && onMarkAllAsRead && onClearAll && onRemoveNotification && (
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              connected={connected}
              onMarkAsRead={onMarkAsRead}
              onMarkAllAsRead={onMarkAllAsRead}
              onClearAll={onClearAll}
              onRemoveNotification={onRemoveNotification}
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 h-9 px-3 rounded-full relative group focus-visible:ring-2 focus-visible:ring-white/30 border-2 border-transparent transition-all hover:scale-105 overflow-hidden"
          >
            <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 bg-gradient-to-br from-purple-600/40 to-blue-600/40 transition-all duration-300 group-hover:shadow-[0_0_10px_rgba(120,87,255,0.5)]"></span>
            <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center rounded-full">
              <span className="text-white text-xs font-semibold">
                {username?.charAt(0).toUpperCase() ?? ''}
              </span>
            </div>
            <span className="text-sm relative z-10">{username}</span>
          </Button>
        </div>
      </header>
    </>
  )
}
