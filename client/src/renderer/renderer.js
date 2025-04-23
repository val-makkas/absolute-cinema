// Configuration
const WS_URL = 'ws://localhost:8080/ws';
const DEFAULT_ROOM_ID = 'default-room';
let currentRoom = null;
let username = 'Anonymous';
let isMaster = false;

let ws = null;

// UI Elements
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const roomIdInput = document.getElementById('room-id-input');
const usernameInput = document.getElementById('username-input');
const joinButton = document.getElementById('join-button');
const disconnectButton = document.getElementById('disconnect-button');

// Core Functions
function joinRoom() {
    currentRoom = roomIdInput.value || DEFAULT_ROOM_ID;
    username = usernameInput.value || 'Anonymous';

    if (ws && ws.readyState === WebSocket.OPEN) ws.close();

    // Καθαρίζουμε το history
    chatMessages.innerHTML = '';

    // Create WebSocket connection to a general URL (no room in the URL)
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        currentRoom = roomIdInput.value || 'default-room';
        username = usernameInput.value || 'Anonymous';
        ws.send(JSON.stringify({ type: 'join', roomId: currentRoom, username }));
    };

    ws.onmessage = e => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'chat') {
            displayChatMessage(msg);
        } else if (msg.type === 'user-joined' || msg.type === 'user-left') {
            displaySystemMessage(`${msg.username} ${msg.type === 'user-joined' ? 'joined' : 'left'}`);
        }
    };

    ws.onerror = () => displaySystemMessage('WebSocket error');

    ws.onclose = () => displaySystemMessage('Disconnected');
}


function disconnectFromRoom() {
    if (ws) {
        ws.close();
        ws = null;
    }
    chatMessages.innerHTML = '';
    updateConnectionStatus('disconnected');
}


function handleServerMessage(message) {
    switch (message.type) {
        case 'chat':
            displayChatMessage(message);
            break;
        case 'user-joined':
            displaySystemMessage(`${message.username} joined`);
            break;
        case 'user-left':
            displaySystemMessage(`${message.username} left`);
            break;
        default:
            console.log('Unknown message type:', message);
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
    initMovieList(imdbId => {
        showDetails(imdbId);
    });

    joinButton.addEventListener('click', joinRoom);
    sendButton.addEventListener('click', sendChatMessage);
    disconnectButton.addEventListener('click', disconnectFromRoom);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    roomIdInput.value = DEFAULT_ROOM_ID;
    usernameInput.value = `User${Math.floor(Math.random() * 1000)}`;
});