import { useState, useEffect, useCallback } from 'react'
import { websocketService } from '../services/websocketService'

export function useWebSocketConnection(token: string) {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)

  const connect = useCallback(async () => {
    if (!token || connecting || websocketService.getConnectionStatus()) return

    setConnecting(true)
    try {
      await websocketService.connect(token)
      setConnected(true)
      console.log('🚀 App: Master WebSocket connected')
    } catch (error) {
      console.error('❌ App: WebSocket connection failed:', error)
      setConnected(false)
    } finally {
      setConnecting(false)
    }
  }, [token, connecting])

  useEffect(() => {
    if (!token) {
      setConnected(false)
      return
    }

    // Initial connection
    connect()

    // Monitor connection status every 5 seconds
    const interval = setInterval(() => {
      const isConnected = websocketService.getConnectionStatus()
      setConnected(isConnected)

      // Auto-reconnect if disconnected
      if (!isConnected && !connecting) {
        console.log('🔄 App: Auto-reconnecting WebSocket...')
        connect()
      }
    }, 5000)

    return () => {
      clearInterval(interval)
    }
  }, [token, connect, connecting])

  const disconnect = useCallback(() => {
    websocketService.disconnect()
    setConnected(false)
  }, [])

  return {
    connected,
    connecting,
    connect,
    disconnect
  }
}
