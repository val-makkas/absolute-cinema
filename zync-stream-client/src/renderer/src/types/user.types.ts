import { Extension } from './extensions.types'

export interface User {
  id: number
  username: string
  email: string
  display_name: string
  profile_picture?: string
  bio?: string
  extensions: UserExtensions[]
  created_at: string
  last_login_at: string
}

export interface Friend {
  id: number
  username: string
  display_name: string
  avatar_url?: string
  status: 'online' | 'DND' | 'offline' | 'away'
  activity?: string
  last_seen?: string
}

export interface FriendRequest {
  id: number
  sender_id: number
  username: string
  created_at: string
  display_name?: string
}

export interface UserExtensions {
  url: string
}

export interface UserPlayerSource {
  infoHash: string
  fileIdx: string
  name: string
  poster: string
}

export interface UserCredentials {
  username: string
  password: string
}

export interface RegisterResponse {
  token: string
  username: string
}

export interface LoginResponse {
  token: string
  username: string
  extensions: Extension[] | string[]
}
