import { useState, useEffect, useRef, useCallback } from 'react';

export function useChat({ roomId, username }) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('disconnected');
  const wsRef = useRef(null);

  const joinRoom = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    setMessages([]);
    setStatus('connecting');
    wsRef.current = new window.WebSocket('ws://localhost:8080/ws');
    wsRef.current.onopen = () => {
      setStatus('connected');
      wsRef.current.send(JSON.stringify({ type: 'join', roomId, username }));
    };
    wsRef.current.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      setMessages((prev) => [...prev, msg]);
    };
    wsRef.current.onerror = () => {
      setStatus('disconnected');
      setMessages((prev) => [...prev, { type: 'system', message: 'WebSocket error' }]);
    };
    wsRef.current.onclose = () => {
      setStatus('disconnected');
      setMessages((prev) => [...prev, { type: 'system', message: 'Disconnected' }]);
    };
  }, [roomId, username]);

  const disconnect = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    setStatus('disconnected');
  }, []);

  const send = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        roomId,
        message,
        username,
        timestamp: Date.now(),
      }));
    }
  }, [roomId, username]);

  useEffect(() => {
    if (roomId && username) joinRoom();
    return () => disconnect();
    // eslint-disable-next-line
  }, [roomId, username]);

  return { messages, status, send, joinRoom, disconnect };
}
