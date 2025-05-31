import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Notification } from '@/types'
import NotificationDropdown from './NotificationDropdown'

interface NotificationBellProps {
  notifications: Notification[]
  unreadCount: number
  connected: boolean
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onClearAll: () => void
  onRemoveNotification: (id: string) => void
}

export default function NotificationBell({
  notifications,
  unreadCount,
  connected,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onRemoveNotification
}: NotificationBellProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

   useEffect(() => {
    console.log('🔔 NotificationBell Props:', {
      notificationsCount: notifications.length,
      notifications: notifications,
      unreadCount,
      connected,
      isOpen
    })
  }, [notifications, unreadCount, connected, isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return undefined
  }, [isOpen])

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        className="h-9 w-9 p-0 rounded-full relative group focus-visible:ring-2 focus-visible:ring-white/30 border-2 border-transparent transition-all hover:scale-105"
        onClick={handleToggle}
        disabled={!connected}
        title={connected ? 'Notifications' : 'Notifications (Disconnected)'}
      >
        <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 bg-gradient-to-br from-purple-600/40 to-blue-600/40 transition-all duration-300 group-hover:shadow-[0_0_10px_rgba(120,87,255,0.5)]"></span>

        <Bell
          className={`w-[18px] h-[18px] relative z-10 ${connected ? 'text-white' : 'text-white/50'}`}
        />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center min-w-[16px] text-[10px] font-medium z-20">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        <div
          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${
            connected ? 'bg-green-400' : 'bg-red-400'
          }`}
        />
      </Button>

      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          onMarkAsRead={onMarkAsRead}
          onMarkAllAsRead={onMarkAllAsRead}
          onClearAll={onClearAll}
          onRemoveNotification={onRemoveNotification}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
