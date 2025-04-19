import { WebSocketServer } from 'ws';

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  joinRoom(ws, roomId, username) {
    // Create room if it doesn't exist
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        users: new Map(),
        playbackState: null
      });
    }

    const room = this.rooms.get(roomId);
    room.users.set(ws, username);
    ws.roomId = roomId;

    // Notify other users
    this.broadcast(roomId, {
      type: 'user-joined',
      username,
      timestamp: Date.now()
    }, ws);
  }

  leaveRoom(ws) {
    if (!ws.roomId) return;
    
    const room = this.rooms.get(ws.roomId);
    if (!room) return;

    const username = room.users.get(ws);
    room.users.delete(ws);

    // Notify other users
    this.broadcast(ws.roomId, {
      type: 'user-left',
      username,
      timestamp: Date.now()
    });

    // Cleanup empty rooms
    if (room.users.size === 0) {
      this.rooms.delete(ws.roomId);
    }
  }

  broadcast(roomId, message, excludeWs = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.users.forEach((_, client) => {
      if (client !== excludeWs && client.readyState === 1) { // 1 = OPEN
        client.send(JSON.stringify(message));
      }
    });
  }

  handleMessage(ws, message) {
    switch (message.type) {
      case 'join':
        this.joinRoom(ws, message.roomId, message.username);
        break;
        
      case 'playback':
        this.broadcast(ws.roomId, {
          type: 'playback',
          data: message.data,
          sender: message.username
        }, ws);
        break;

      case 'chat':
        this.broadcast(ws.roomId, {
          type: 'chat',
          message: message.text,
          username: message.username,
          timestamp: Date.now()
        }, ws);
        break;
    }
  }
}

// WebSocket Server Setup
const wss = new WebSocketServer({ port: 8080 });
const roomManager = new RoomManager();

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      roomManager.handleMessage(ws, message);
    } catch (error) {
      console.error('Invalid message:', error);
    }
  });

  ws.on('close', () => {
    roomManager.leaveRoom(ws);
  });
});

console.log('WebSocket server running on port 8080 with room management');