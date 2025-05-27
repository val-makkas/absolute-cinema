import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Home, Search, Puzzle, LogOut } from 'lucide-react'
import Logo from '@/components/ui/logo'
import { useState } from 'react'

interface SidebarProps {
  onSelect: (key: string) => void
  onSearchValue: (value: string) => void
  onLogout: () => void
  username: string | null
  searching: boolean
}

export default function Sidebar({
  onSelect,
  onSearchValue,
  onLogout,
  username,
  searching
}: SidebarProps): React.ReactElement {
  const [searchInputValue, setSearchInputValue] = useState<string>('')
  return (
    <>
      {/* Sidebar (vertical, left) with animated gradient border */}
      {/* Actual sidebar content with a small inset to show the border */}
      <aside className="fixed left-[2px] h-[calc(100vh-4px)] w-[calc(5rem-4px)] bg-black/70 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-6 z-10">
        {/* Logo at top */}
        <div
          className="relative group cursor-pointer flex items-center justify-center"
          onClick={() => onSelect('home')}
        >
          <Logo w={10} h={10} abs={false} />
        </div>

        <div className="h-5"></div>

        {/* Navigation icons with specific spacing */}
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
            onClick={() => onSelect('extensions')}
            title="Extensions"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
          >
            <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-gradient-to-br from-purple-600/40 to-blue-600/40 transition-all duration-300 group-hover:shadow-[0_0_10px_rgba(120,87,255,0.5)]"></span>
            <Puzzle className="w-6 h-6 text-white relative z-10 group-hover:text-white" />
          </Button>
        </div>
        {/* Logout at bottom */}
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
      {/* Topbar (horizontal, merges with sidebar) */}
      <header
        className="fixed left-0 top-0 right-0 h-[calc(4rem-4px)] bg-#121212 backdrop-blur-xl flex items-center px-8 z-9"
        style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
      >
        {/* Left space */}
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
            placeholder="Search for movies, series, more..."
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

        {/* Right space with actions */}
        <div className="flex-1 flex justify-end items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 rounded-full relative group focus-visible:ring-2 focus-visible:ring-white/30 border-2 border-transparent transition-all hover:scale-105 overflow-hidden"
            title="Chat"
            onClick={() => onSelect && onSelect('chat')}
          >
            {/* Hover effect */}
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
          </Button>{' '}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 rounded-full relative group focus-visible:ring-2 focus-visible:ring-white/30 border-2 border-transparent transition-all hover:scale-105 overflow-hidden"
            title="Notifications"
          >
            {/* Hover effect */}
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
                d="M12 3C12.5523 3 13 3.44772 13 4V4.51986C15.5704 5.08259 17.5 7.375 17.5 10.1667V14.25L18.6429 16.5357C18.8783 17.0064 18.6418 17.5798 18.1711 17.8152C18.0252 17.8864 17.8654 17.9231 17.7032 17.9231H6.26782C5.76605 17.9231 5.35951 17.5166 5.35951 17.0148C5.35951 16.8527 5.39614 16.6928 5.46741 16.5469L6.5 14.25V10.1667C6.5 7.36502 8.4407 5.06614 11.0256 4.51248L11 4C11 3.44772 11.4477 3 12 3Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M9 18H15V18.5C15 19.8807 13.8807 21 12.5 21H11.5C10.1193 21 9 19.8807 9 18.5V18Z"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </Button>{' '}
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 h-9 px-3 rounded-full relative group focus-visible:ring-2 focus-visible:ring-white/30 border-2 border-transparent transition-all hover:scale-105 overflow-hidden"
          >
            {/* Hover effect */}
            <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 bg-gradient-to-br from-purple-600/40 to-blue-600/40 transition-all duration-300 group-hover:shadow-[0_0_10px_rgba(120,87,255,0.5)]"></span>
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600/30 to-blue-600/30 flex items-center justify-center relative z-10">
              <span className="text-white text-xs font-semibold"></span>
            </div>
            <span className="text-sm relative z-10">{username}</span>
          </Button>
        </div>
      </header>
    </>
  )
}
