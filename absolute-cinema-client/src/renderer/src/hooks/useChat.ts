import { useState, useEffect, useRef, useCallback } from 'react'

interface ChatMessage {
  type: string
  message?: string
  username?: string
  roomId?: string
  timestamp?: number
  [key: string]: any
}

type Status = 'disconnected' | 'connecting' | 'connected'

interface useChatProps {
  roomId: string
  username: string
}

export function useChat({ roomId, username }: useChatProps): {
  messages: ChatMessage[]
  status: Status
  send: (message: string) => void
  joinRoom: () => void
  disconnect: () => void
} {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<Status>('disconnected')
  const wsRef = useRef<WebSocket | null>(null)

  const joinRoom = useCallback(() => {
    if (wsRef.current) wsRef.current.close()
    setMessages([])
    setStatus('connecting')
    wsRef.current = new window.WebSocket('ws://localhost:8080/ws')
    wsRef.current.onopen = () => {
      setStatus('connected')
      wsRef.current!.send(JSON.stringify({ type: 'join', roomId, username }))
    }
    wsRef.current.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      setMessages((prev) => [...prev, msg])
    }
    wsRef.current.onerror = () => {
      setStatus('disconnected')
      setMessages((prev) => [...prev, { type: 'system', message: 'WebSocket error' }])
    }
    wsRef.current.onclose = () => {
      setStatus('disconnected')
      setMessages((prev) => [...prev, { type: 'system', message: 'Disconnected' }])
    }
  }, [roomId, username])

  const disconnect = useCallback(() => {
    if (wsRef.current) wsRef.current.close()
    setStatus('disconnected')
  }, [])

  const send = useCallback(
    (message: string) => {
      if (wsRef.current && wsRef.current.readyState === 1) {
        wsRef.current.send(
          JSON.stringify({
            type: 'chat',
            roomId,
            message,
            username,
            timestamp: Date.now()
          })
        )
      }
    },
    [roomId, username]
  )

  useEffect(() => {
    if (roomId && username) joinRoom()
    return () => disconnect()
  }, [roomId, username])

  return { messages, status, send, joinRoom, disconnect }
}
