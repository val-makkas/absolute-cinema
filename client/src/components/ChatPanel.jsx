import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ChatPanel = ({ chatOpen, messages, chatInput, setChatInput, handleSendChat, status, username, onDisconnect }) => (
  <aside id="chat-container" className={chatOpen ? '' : 'hidden'}>
    <div id="chat-messages" style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', background: '#000', borderRadius: 8, padding: '0.8rem', fontSize: '0.98rem', color: '#fff' }}>
      {messages.map((msg, i) => (
        <div key={i} className="chat-message">
          <strong>{msg.username}</strong>
          <span className="timestamp" style={{ color: '#888', fontSize: '0.85em', marginLeft: '0.3em' }}>{new Date(msg.timestamp).toLocaleTimeString()}</span>
          <div className="message-text">{msg.message}</div>
        </div>
      ))}
    </div>
    <div id="chat-input-container" style={{ display: 'flex', gap: '0.5rem' }}>
      <Input id="chat-input" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type a message..." className="text-white placeholder:text-gray-400 focus:ring-0 focus:outline-none" style={{ background: 'rgba(32,32,32,0.95)', borderColor: '#fff', color: '#fff' }} />
      <Button id="send-button" style={{ background: '#fff', color: '#181818', fontWeight: 700, borderRadius: 8, boxShadow: '0 2px 8px 0 #2228' }} onClick={handleSendChat}>Send</Button>
      <Button variant="outline" style={{ marginLeft: 8 }} onClick={onDisconnect}>Disconnect</Button>
    </div>
    <div style={{ marginTop: 8, color: status === 'connected' ? '#00e676' : '#ff5555' }}>
      {status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected'} as <b>{username}</b>
    </div>
  </aside>
);

export default ChatPanel;
