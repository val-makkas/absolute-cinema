// Configuration
const WS_URL = 'ws://localhost:8080';
const DEFAULT_ROOM_ID = 'default-room';
let currentRoom = null;
let username = 'Anonymous';
let isMaster = false;

// Initialize Player
const player = new window.RxPlayer({
    videoElement: document.getElementById('video-player')
});

// WebSocket Connection
const ws = new WebSocket(WS_URL);

// UI Elements
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const roomIdInput = document.getElementById('room-id-input');
const usernameInput = document.getElementById('username-input');
const joinButton = document.getElementById('join-button');

// WebSocket Handlers
ws.onopen = () => {
    console.log('Connected to server');
    updateConnectionStatus('connected');
};

ws.onclose = () => {
    updateConnectionStatus('disconnected');
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    handleServerMessage(message);
};

// Player Event Listeners
player.addEventListener('playerStateChange', (state) => {
    if (isMaster) {
        sendPlaybackState(state);
    }
});

// UI Event Listeners
joinButton.addEventListener('click', joinRoom);
sendButton.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

// Core Functions
function joinRoom() {
    console.log('Join button clicked'); // Add this
    currentRoom = roomIdInput.value || DEFAULT_ROOM_ID;
    username = usernameInput.value || 'Anonymous';

    console.log('Attempting to join room:', currentRoom); // Add this

    ws.send(JSON.stringify({
        type: 'join',
        roomId: currentRoom,
        username: username
    }));

    loadSampleVideo();
}

ws.onerror = (error) => {
    console.error('WebSocket Error:', error);
    updateConnectionStatus('error');
};

function loadSampleVideo() {
    player.loadVideo({
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        transport: 'directfile' // Simple MP4 file playback
    });
}

function sendPlaybackState(state) {
    ws.send(JSON.stringify({
        type: 'playback',
        roomId: currentRoom,
        data: {
            position: state.position,
            paused: state.paused,
            timestamp: Date.now()
        }
    }));
}

function handleServerMessage(message) {
    switch (message.type) {
        case 'playback':
            syncPlayback(message.data);
            break;
        case 'chat':
            displayChatMessage(message);
            break;
        case 'user-joined':
            displaySystemMessage(`${message.username} joined`);
            break;
        case 'user-left':
            displaySystemMessage(`${message.username} left`);
            break;
    }
}

function syncPlayback(data) {
    const latency = Date.now() - data.timestamp;
    const targetTime = data.position + (latency / 1000);

    if (Math.abs(player.getPosition() - targetTime) > 1) {
        player.seekTo(targetTime);
    }

    if (data.paused !== player.isPaused()) {
        data.paused ? player.pause() : player.play();
    }
}

function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    ws.send(JSON.stringify({
        type: 'chat',
        roomId: currentRoom,
        message: message,
        username: username,
        timestamp: Date.now()
    }));

    chatInput.value = '';
}

function displayChatMessage(msg) {
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    messageElement.innerHTML = `
    <strong>${msg.username}</strong>
    <span class="timestamp">${new Date(msg.timestamp).toLocaleTimeString()}</span>
    <div class="message-text">${msg.message}</div>
  `;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function displaySystemMessage(text) {
    const systemElement = document.createElement('div');
    systemElement.className = 'system-message';
    systemElement.textContent = text;
    chatMessages.appendChild(systemElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connection-status');
    statusElement.textContent = `Status: ${status}`;
    statusElement.className = `status-${status}`;
}

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
    // Set default values
    roomIdInput.value = DEFAULT_ROOM_ID;
    usernameInput.value = `User${Math.floor(Math.random() * 1000)}`;
});