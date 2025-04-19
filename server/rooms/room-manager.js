// server/rooms/room-manager.js
export class RoomManager {
    constructor() {
        this.rooms = new Map();
    }

    createRoom(roomId) {
        this.rooms.set(roomId, {
            users: new Set(),
            playbackState: null,
            lastUpdated: Date.now()
        });
    }

    joinRoom(ws, roomId, username) {
        if (!this.rooms.has(roomId)) {
            this.createRoom(roomId);
        }
        this.rooms.get(roomId).users.add(ws);
        ws.roomId = roomId;
    }

    handleMessage(ws, message) {
        const room = this.rooms.get(ws.roomId);
        if (!room) return;

        switch (message.type) {
            case 'playback':
                room.playbackState = message.data;
                room.lastUpdated = Date.now();
                this.broadcastToRoom(room, message);
                break;
        }
    }

    broadcastToRoom(room, message) {
        room.users.forEach(client => {
            if (client.readyState === 1) { // 1 = OPEN
                client.send(JSON.stringify(message));
            }
        });
    }

    removeClient(ws) {
        const room = this.rooms.get(ws.roomId);
        if (room) {
            room.users.delete(ws);
            if (room.users.size === 0) {
                this.rooms.delete(ws.roomId);
            }
        }
    }
}