import { User } from "@renderer/types"

type MessageHandler = (data) => void

interface WebSocketSubscription {
  id: string
  handler: MessageHandler
  messageTypes: string[]
}

class WebSocketService {
  private socket: WebSocket | null = null
  private subscriptions: Map<string, WebSocketSubscription> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 1
  private token: string | null = null
  private isConnected = false
  private isConnecting = false

  connect(token: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.socket?.readyState === WebSocket.OPEN && this.isConnected) {
        resolve(true)
        return
      }

      if (this.isConnecting) {
        resolve(true)
        return
      }

      this.token = token
      this.isConnecting = true

      try {
        this.socket = new WebSocket('ws://localhost:8080/api/ws')

        const authTimeout = setTimeout(() => {
          if (!this.isConnected) {
            this.isConnecting = false
            this.socket?.close()
            reject(new Error('Authentication timeout'))
          }
        }, 5000)

        this.socket.onopen = () => {
          const authMessage = { type: 'auth', token }
          this.socket?.send(JSON.stringify(authMessage))
        }

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)

            if (data.type === 'auth_success') {
              clearTimeout(authTimeout)
              this.isConnected = true
              this.isConnecting = false
              this.reconnectAttempts = 0
              resolve(true)
              return
            }

            if (data.type === 'auth_error') {
              clearTimeout(authTimeout)
              this.isConnecting = false
              this.socket?.close()
              reject(new Error(`Authentication failed: ${data.message || 'Unknown error'}`))
              return
            }

            this.routeMessage(data)
          } catch {
            //
          }
        }

        this.socket.onclose = (event) => {
          clearTimeout(authTimeout)
          this.isConnected = false
          this.isConnecting = false

          if (event.code !== 1000) {
            this.handleReconnect(event)
          }
        }

        this.socket.onerror = (error) => {
          clearTimeout(authTimeout)
          this.isConnecting = false
          reject(error)
        }
      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  send(message): void {
    if (this.socket?.readyState === WebSocket.OPEN && this.isConnected) {
      this.socket.send(JSON.stringify(message))
    }
  }

  subscribe(id: string, messageTypes: string[], handler: MessageHandler): void {
    if (this.subscriptions.has(id)) {
      this.subscriptions.set(id, { id, handler, messageTypes })
      return
    }
    this.subscriptions.set(id, { id, handler, messageTypes })
  }

  unsubscribe(id: string): void {
    if (this.subscriptions.has(id)) {
      this.subscriptions.delete(id)
    }
  }

  private getCurrentUserID(): string | null {
    if (typeof window !== 'undefined') {
      const currentUserString = localStorage.getItem('user')
      if (currentUserString) {
        try {
          const currentUser = JSON.parse(currentUserString)
          return currentUser.id
        } catch {
          return null
        }
      }
    }
    return null
  }

  private handlePartySyncData(data): void {
    const { eventType } = data.data
    const senderID = data.user_id

    const currentUserID = this.getCurrentUserID()
    const isOwnEvent = senderID === currentUserID

    window.electronAPI
      .applySyncUpdate({
        ...data.data,
        isOwnEvent,
        senderID,
        senderUsername: data.username
      })
      .catch((err) => {
        console.log('Failed to apply sync state', err)
      })

    const uiEvents = ['play', 'pause', 'seek', 'member_ready', 'watch_party_start']
    if (uiEvents.includes(eventType)) {
      for (const subscription of this.subscriptions.values()) {
        if (subscription.messageTypes.includes(data.type)) {
          try {
            subscription.handler(data)
          } catch {
            //
          }
        }
      }
    }
  }

  private routeMessage(data): void {
    if (data.type === 'party_sync_data') {
      this.handlePartySyncData(data)
      return
    }

    for (const subscription of this.subscriptions.values()) {
      if (subscription.messageTypes.includes(data.type)) {
        try {
          subscription.handler(data)
        } catch {
          //
        }
      }
    }
  }

  private handleReconnect(event: CloseEvent): void {
    if (event.code === 1000) return

    if (this.reconnectAttempts < this.maxReconnectAttempts && this.token) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
      this.reconnectAttempts++

      setTimeout(() => {
        if (this.token) {
          this.connect(this.token).catch(() => {
            //
          })
        }
      }, delay)
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close(1000, 'User disconnected')
      this.socket = null
    }
    this.isConnected = false
    this.isConnecting = false
    this.subscriptions.clear()
    this.token = null
    this.reconnectAttempts = 0
  }

  getConnectionStatus(): boolean {
    return this.isConnected && this.socket?.readyState === WebSocket.OPEN
  }

  hasSubscription(id: string): boolean {
    return this.subscriptions.has(id)
  }

  getCurrentToken(): string | null {
    return this.token
  }
}

export const websocketService = new WebSocketService()
