import { Extension } from './extensions.types'

export interface User {
  username: string
  token?: string
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

export interface UserState extends User {
  extensions: Extension[] | string[]
  loading: boolean
  error: string | null
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
