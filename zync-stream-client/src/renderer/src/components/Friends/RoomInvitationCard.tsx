import { PartyPopper, X } from 'lucide-react'
import { RoomInvitation } from '@renderer/hooks/useRoom'

interface RoomInvitationCardProps {
  invitation: RoomInvitation
  onAccept: () => void
  onDecline: () => void
}

export default function RoomInvitationCard({
  invitation,
  onAccept,
  onDecline
}: RoomInvitationCardProps): React.ReactElement {
  return (
    <div className="p-3 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <PartyPopper className="w-3 h-3 text-white" />
          </div>
          <div>
            <div className="text-white text-sm font-medium">Room Invitation</div>
            <div className="text-white/60 text-xs">from {invitation.inviter_name}</div>
          </div>
        </div>
        <button onClick={onDecline} className="p-1 hover:bg-white/10 rounded-md transition-colors">
          <X className="w-3 h-3 text-white/60" />
        </button>
      </div>

      <div className="mb-3">
        <div className="text-white/80 text-sm">{invitation.room_name}</div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 px-3 py-1.5 bg-green-600/20 border border-green-500/40 text-green-400 hover:bg-green-600/30 text-xs rounded-md transition-colors"
        >
          Accept
        </button>
        <button
          onClick={onDecline}
          className="flex-1 px-3 py-1.5 bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 text-xs rounded-md transition-colors"
        >
          Decline
        </button>
      </div>
    </div>
  )
}
