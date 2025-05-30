export interface Notification {
  id: string
  type:
    | 'friend_request_received'
    | 'friend_request_accepted'
    | 'friend_request_rejected'
    | 'room_invitation'
    | 'room_joined'
  title: string
  message: string
  data: any
  read: boolean
  createdAt: string
}

export interface WebSocketMessage {
  type: string
  data: any
  timestamp?: number
}

export interface FriendRequestNotification {
  id: string
  sender_id: number
  username: string
  display_name: string
  profile_picture_url?: string
  created_at: string
}
