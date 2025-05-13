import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { connect } from 'net';
import { access, constants } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let overlayWindow = null;

// MPV IPC connection logic
let mpvIpcSocket = null;
let request_id = 0;
const pendingRequests = new Map();

function connectToMpvIpc(pipeName = "\\\\.\\pipe\\mpvpipe") {
    if (mpvIpcSocket) return;
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
                    console.error('Failed to parse MPV IPC response:', e, line);
                }
            });
        });
        mpvIpcSocket.on('error', (err) => {
            console.error('mpvIpcSocket error:', err);
        });
    }).catch(() => {
        console.error('Failed to connect to MPV IPC pipe');
    });
}

function createOverlayWindow() {
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
    overlayWindow.loadFile(join(__dirname, 'overlay.html'));
    overlayWindow.on('closed', () => { overlayWindow = null; });
    // Optionally, make overlay click-through for transparent areas only
    // overlayWindow.setIgnoreMouseEvents(false, { forward: true });
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

// Connect to MPV IPC on startup
connectToMpvIpc();

// Listen for overlay bounds from parent process
if (process.send) {
    process.on('message', (msg) => {
        if (msg && msg.type === 'set-bounds' && overlayWindow) {
            overlayWindow.setBounds(msg.bounds);
        }
    });
}
