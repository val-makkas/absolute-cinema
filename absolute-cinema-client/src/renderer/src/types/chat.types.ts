export interface ChatMessage {
  id: string
  text: string
  sender: string
  timestamp: number
  roomId: string
}

export interface ChatState {
  messages: ChatMessage[]
  status: 'connected' | 'disconnected' | 'connecting' | 'error'
}

export interface ChatOptions {
  roomId: string
  username: string
}

export interface ChatHook extends ChatState {
  send: (message: string) => void
  joinRoom: (roomId: string) => void
  disconnect: () => void
}
