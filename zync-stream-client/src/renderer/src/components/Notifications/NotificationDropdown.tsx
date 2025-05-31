import { CheckCheck, Trash2, X, UserPlus, Users, MessageSquare } from 'lucide-react'
import { Notification } from '@/types'

interface NotificationDropdownProps {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onClearAll: () => void
  onRemoveNotification: (id: string) => void
  onClose: () => void
}

export default function NotificationDropdown({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onRemoveNotification,
  onClose
}: NotificationDropdownProps): React.ReactElement {
  const getNotificationIcon = (type: string): React.ReactElement => {
    switch (type) {
      case 'friend_request_received':
      case 'friend_request_accepted':
      case 'friend_request_rejected':
        return <UserPlus className="w-4 h-4" />
      case 'room_invitation':
      case 'room_joined':
        return <Users className="w-4 h-4" />
      default:
        return <MessageSquare className="w-4 h-4" />
    }
  }

  const getNotificationColor = (type: string): string => {
    switch (type) {
      case 'friend_request_received':
        return 'text-blue-400'
      case 'friend_request_accepted':
        return 'text-green-400'
      case 'friend_request_rejected':
        return 'text-red-400'
      case 'room_invitation':
        return 'text-purple-400'
      default:
        return 'text-white/60'
    }
  }

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="z-50 absolute right-0 top-full mt-2 w-80 bg-black opacity-96 backdrop-blur-xl border-l border-white/10 rounded-lg borde shadow-xl max-h-96 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="font-semibold text-white">Notifications</h3>
        <div className="flex items-center gap-2">
          {notifications.some((n) => !n.read) && (
            <button
              onClick={onMarkAllAsRead}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
              title="Clear all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 text-white/30 mx-auto mb-2">
              <MessageSquare className="w-full h-full" />
            </div>
            <p className="text-white/60 text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${
                !notification.read ? 'bg-blue-500/5 border-l-2 border-l-blue-400' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`${getNotificationColor(notification.type)} mt-1`}>
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white">{notification.title}</h4>
                      <p className="text-xs text-white/60 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-white/40 mt-2">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onMarkAsRead(notification.id)
                          }}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="Mark as read"
                        >
                          <CheckCheck className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveNotification(notification.id)
                        }}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Remove"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-white/10 text-center">
          <button
            onClick={() => {
              onClose()
              // Navigate to notifications page if you have one
            }}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  )
}
