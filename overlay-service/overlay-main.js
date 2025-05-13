// Overlay sync is now handled by the C++ overlay-follower.exe service.
// All JS-based overlay sync logic is deprecated and removed for performance and reliability.
//
// The overlay window title is hard-coded to 'AbsoluteCinemaOverlay'.
// The C++ service will keep it perfectly aligned with the main Electron window.
//
// If you need to change overlay sync, update the C++ service and launch logic in main.js.

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
const { join } = path;
import { connect } from 'net';
import { access, constants } from 'fs';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let overlayWindow = null;

// MPV IPC connection logic
let mpvIpcSocket = null;
let request_id = 0;
const pendingRequests = new Map();

function connectToMpvIpc(pipeName = "\\\\.\\pipe\\mpvpipe") {
    if (mpvIpcSocket) return;
    console.log('[Overlay] Waiting for MPV IPC pipe:', pipeName);
    // Wait for pipe to exist
    const waitForPipe = (timeout = 5000) => new Promise((resolve, reject) => {
        const start = Date.now();
        (function check() {
            access(pipeName, constants.F_OK, (err) => {
                if (!err) return resolve();
                if (Date.now() - start > timeout) return reject();
                setTimeout(check, 100);
            });
        })();
    });
    waitForPipe().then(() => {
        console.log('[Overlay] MPV IPC pipe found, connecting...');
        mpvIpcSocket = connect(pipeName);
        mpvIpcSocket.on('data', (data) => {
            data.toString().split('\n').forEach(line => {
                if (!line.trim()) return;
                try {
                    const msg = JSON.parse(line);
                    if (msg.request_id !== undefined && pendingRequests.has(msg.request_id)) {
                        pendingRequests.get(msg.request_id)(msg);
                        pendingRequests.delete(msg.request_id);
                    }
                } catch (e) {
                    console.error('[Overlay] Failed to parse MPV IPC response:', e, line);
                }
            });
        });
        mpvIpcSocket.on('error', (err) => {
            console.error('[Overlay] mpvIpcSocket error:', err);
        });
    }).catch(() => {
        console.error('[Overlay] Failed to connect to MPV IPC pipe');
    });
}

function createOverlayWindow() {
    console.log('[Overlay] Creating overlay window...');
    overlayWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        transparent: true,
        skipTaskbar: true,
        frame: false,
        resizable: false,
        backgroundColor: null,
        alwaysOnTop: true,
        hasShadow: false,
        title: 'AbsoluteCinemaOverlay', // Set a unique title for overlay
        webPreferences: {
            preload: join(__dirname, '../client/src/preload.js'),
            plugins: false,
        }
    });
    overlayWindow.setTitle('AbsoluteCinemaOverlay'); // Hard-code window name at runtime too
    overlayWindow.loadFile(join(__dirname, 'overlay.html'));
    overlayWindow.on('closed', () => { 
        console.log('[Overlay] Overlay window closed');
        overlayWindow = null; 
    });
    overlayWindow.on('ready-to-show', () => {
        console.log('[Overlay] Overlay window ready to show');
        // Log the overlay window title for debugging
        console.log('[Overlay] Window title:', overlayWindow.getTitle());
    });
    // Optionally, make overlay click-through for transparent areas only
    overlayWindow.setIgnoreMouseEvents(false, { forward: true });
}

app.whenReady().then(createOverlayWindow);

ipcMain.handle('close-overlay', () => {
    if (overlayWindow) overlayWindow.close();
});

// Overlay UI IPC handlers
ipcMain.handle('mpv-command', async (event, data) => {
    let command;
    switch (data.command) {
        case 'toggle-pause':
            command = { command: ["cycle", "pause"] };
            break;
        case 'seek':
            command = { command: ["set_property", "time-pos", data.value] };
            break;
        case 'set-volume':
            command = { command: ["set_property", "volume", data.value] };
            break;
        case 'toggle-fullscreen':
            command = { command: ["cycle", "fullscreen"] };
            break;
        case 'set-subtitle':
            command = { command: ["set_property", "sid", data.value] };
            break;
        default:
            console.log("ipc handler didnt recieve a command");
            return;
    }
    if (command && mpvIpcSocket) {
        mpvIpcSocket.write(JSON.stringify(command) + "\n");
    }
});

ipcMain.handle('mpv-fetch', async (event, data) => {
    return new Promise((resolve, reject) => {
        const thisRequestId = request_id++;
        pendingRequests.set(thisRequestId, (msg) => {
            if (msg.error === 'success') {
                resolve(msg.data);
            } else {
                reject(msg.error);
            }
        });
        let command;
        switch (data.command) {
            case 'isPlaying':
                command = { command: ["get_property", "pause"], request_id: thisRequestId };
                break;
            case 'currentTime':
                command = { command: ["get_property", "time-pos"], request_id: thisRequestId };
                break;
            case 'duration':
                command = { command: ["get_property", "duration"], request_id: thisRequestId };
                break;
            case 'volume':
                command = { command: ["get_property", "volume"], request_id: thisRequestId };
                break;
            case 'isFullscreen':
                command = { command: ["get_property", "fullscreen"], request_id: thisRequestId };
                break;
            case 'currentSubtitle':
                command = { command: ["get_property", "sid"], request_id: thisRequestId };
                break;
            case 'subtitleTracks':
                command = { command: ["get_property", "track-list"], request_id: thisRequestId };
                break;
            default:
                pendingRequests.delete(thisRequestId);
                reject('ipc fetcher didnt recieve a command');
                return;
        }
        if (mpvIpcSocket) {
            mpvIpcSocket.write(JSON.stringify(command) + "\n");
        }
    });
});

ipcMain.handle('toggle-overlay-fullscreen', async () => {
    if (overlayWindow) {
        if (overlayWindow.isFullScreen()) {
            overlayWindow.setFullScreen(false);
        } else {
            overlayWindow.setFullScreen(true);
        }
    }
});

// Remove the old relay logic for fullscreen
// Add WebSocket client for fullscreen relay to main Electron process

let ws = null;
function connectToMainWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    ws = new WebSocket('ws://127.0.0.1:31337');
    ws.on('open', () => {
        console.log('[Overlay] Connected to main process WebSocket for fullscreen relay');
    });
    ws.on('close', () => {
        console.warn('[Overlay] WebSocket to main process closed, retrying in 2s');
        setTimeout(connectToMainWebSocket, 2000);
    });
    ws.on('error', (err) => {
        console.error('[Overlay] WebSocket error:', err);
    });
}
connectToMainWebSocket();

ipcMain.handle('toggle-main-fullscreen', async () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'toggle-fullscreen' }));
        console.log('[Overlay] Sent toggle-fullscreen to main process via WebSocket');
    } else {
        console.warn('[Overlay] WebSocket not connected, cannot relay fullscreen');
    }
});

ipcMain.handle('close-main-window', async () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'close-main' }));
        console.log('[Overlay] Sent close-main to main process via WebSocket');
    } else {
        console.warn('[Overlay] WebSocket not connected, cannot relay close-main');
    }
});

// Connect to MPV IPC on startup
connectToMpvIpc();

/* // Listen for overlay bounds from parent process
if (process.send) {
    process.on('message', (msg) => {
        if (msg && msg.type === 'set-bounds' && overlayWindow) {
            overlayWindow.setBounds(msg.bounds);
        }
    });
} */
