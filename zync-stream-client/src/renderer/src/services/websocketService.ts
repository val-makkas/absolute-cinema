type MessageHandler = (data: any) => void

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
        console.log('WebSocket: Already connected')
        resolve(true)
        return
      }

      if (this.isConnecting) {
        console.log('WebSocket: Connection already in progress')
        resolve(true)
        return
      }

      this.token = token
      this.isConnecting = true

      try {
        console.log('🔌 WebSocket: Connecting to master endpoint...')
        this.socket = new WebSocket('ws://localhost:8080/api/ws')

        const authTimeout = setTimeout(() => {
          if (!this.isConnected) {
            console.error('WebSocket: Authentication timeout')
            this.isConnecting = false
            this.socket?.close()
            reject(new Error('Authentication timeout'))
          }
        }, 5000)

        this.socket.onopen = () => {
          console.log('WebSocket: Connected, sending auth...')
          const authMessage = { type: 'auth', token }
          console.log('WebSocket: Sending auth message:', {
            type: 'auth',
            token: token.substring(0, 20) + '...'
          })
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
          } catch (error) {
            console.error('WebSocket: Parse error:', error)
          }
        }

        this.socket.onclose = (event) => {
          console.log(`WebSocket: Disconnected (code: ${event.code})`)
          clearTimeout(authTimeout)
          this.isConnected = false
          this.isConnecting = false

          if (event.code !== 1000) {
            this.handleReconnect(event)
          }
        }

        this.socket.onerror = (error) => {
          console.error('WebSocket: Connection error:', error)
          clearTimeout(authTimeout)
          this.isConnecting = false 
          reject(error)
        }
      } catch (error) {
        console.error('WebSocket: Failed to create connection:', error)
        this.isConnecting = false
        reject(error)
      }
    })
  }

  send(message: any) {
    if (this.socket?.readyState === WebSocket.OPEN && this.isConnected) {
      this.socket.send(JSON.stringify(message))
      console.log('WebSocket: Sent message:', message.type)
    } else {
      console.error('WebSocket: Cannot send message, not connected or not authenticated')
    }
  }

  subscribe(id: string, messageTypes: string[], handler: MessageHandler) {
    if (this.subscriptions.has(id)) {
      console.log(`WebSocket: ${id} already subscribed, updating handler`)
      this.subscriptions.set(id, { id, handler, messageTypes })
      return
    }

    console.log(`📡 WebSocket: Subscribing ${id} to:`, messageTypes)
    this.subscriptions.set(id, { id, handler, messageTypes })
  }

  unsubscribe(id: string) {
    if (this.subscriptions.has(id)) {
      console.log(`WebSocket: Unsubscribing ${id}`)
      this.subscriptions.delete(id)
    } else {
      console.log(`📡 WebSocket: ${id} not found, skipping unsubscribe`)
    }
  }

  private routeMessage(data: any) {
    console.log('WebSocket: Routing message:', data.type)

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

  private handleReconnect(event: CloseEvent) {
    if (event.code === 1000) return

    if (this.reconnectAttempts < this.maxReconnectAttempts && this.token) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
      this.reconnectAttempts++

      console.log(
        `WebSocket: Reconnecting in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      )

      setTimeout(() => {
        if (this.token) {
          console.log('WebSocket: Attempting to reconnect...')
          this.connect(this.token).catch((error) => {
            console.error('WebSocket: Reconnection failed:', error)
          })
        }
      }, delay)
    } else {
      console.error('WebSocket: Max reconnection attempts reached or no token available')
    }
  }

  disconnect() {
    console.log('WebSocket: Disconnecting...')
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
