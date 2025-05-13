import { app, protocol, BrowserWindow, ipcMain, shell } from 'electron';
import { ELECTRON_CONFIG } from '../config/electron-config.js';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { emitKeypressEvents } from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    ...ELECTRON_CONFIG.WINDOW_OPTIONS,
    webPreferences: {
      ...ELECTRON_CONFIG.WINDOW_OPTIONS.webPreferences,
      preload: path.join(__dirname, '../preload.js'),
      plugins: false,
    }
  });
  mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));

  if (ELECTRON_CONFIG.ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

let mpvProcess = null;
let windowMergerProcess = null;
//let mpvIpcSocket = null;
let overlayProcess = null;

ipcMain.handle('play-in-mpv', async (event, streamUrl) => {
  console.log('play-in-mpv handler called');
  try {
    const mpvPath = path.resolve(__dirname, '../../../mpv/mpv.exe');
    const uoscScriptPath = path.resolve(__dirname, '../../../mpv/scripts/uosc.lua');
    const parentHelperPath = path.resolve(__dirname, '../../../tools/window-merger/window-merger.exe');
    console.log('Checking mpvPath:', mpvPath, fs.existsSync(mpvPath));
    console.log('Checking uoscScriptPath:', uoscScriptPath, fs.existsSync(uoscScriptPath));
    console.log('Checking parentHelperPath:', parentHelperPath, fs.existsSync(parentHelperPath));
    if (!fs.existsSync(mpvPath)) throw new Error('mpv.exe not found at: ' + mpvPath);
    if (!fs.existsSync(uoscScriptPath)) throw new Error('uosc.lua not found: ' + uoscScriptPath);
    if (!fs.existsSync(parentHelperPath)) throw new Error('window-merger.exe: ' + parentHelperPath);
    const mpvTitle = 'MPV-EMBED-' + Date.now();
    const electronTitle = mainWindow.getTitle();
    const overlayTitle = 'AbsoluteCinemaOverlay';
    const args = [
      streamUrl,
      `--script=${uoscScriptPath}`,
      '--force-window=yes',
      `--title=${mpvTitle}`,
      '--no-terminal',
      '--hwdec=auto',
      '--no-border',
      '--ontop',
      '--input-ipc-server=\\\\.\\pipe\\mpvpipe',
    ];
    console.log('Spawning mpv with args:', args);
    mpvProcess = spawn(mpvPath, args, { detached: true/* , stdio: 'ignore' */ });
    mpvProcess.unref();
    // Overlay follow logic: send bounds to overlay after move/resize
    let overlayBoundsThrottleTimer = null;
    function sendOverlayBoundsThrottled() {
      if (overlayBoundsThrottleTimer) return;
      overlayBoundsThrottleTimer = setTimeout(() => {
        overlayBoundsThrottleTimer = null;
        sendOverlayBounds();
      }, 4);
    }
    function sendOverlayBounds() {
      if (!mainWindow) return;
      const bounds = mainWindow.getBounds();
      let overlayBounds = { ...bounds };
      overlayBounds.y = bounds.y + 40;
      overlayBounds.height = bounds.height - 40;
      if (overlayProcess && overlayProcess.connected) {
        overlayProcess.send({ type: 'set-bounds', bounds: overlayBounds });
      }
    }
    mainWindow.on('move', sendOverlayBoundsThrottled);
    mainWindow.on('resize', sendOverlayBoundsThrottled);
    mainWindow.on('minimize', sendOverlayBounds);
    mainWindow.on('restore', sendOverlayBounds);
    mainWindow.on('maximize', sendOverlayBounds);
    mainWindow.on('unmaximize', sendOverlayBounds);
    mainWindow.on('enter-full-screen', sendOverlayBounds);
    mainWindow.on('leave-full-screen', sendOverlayBounds);
    setTimeout(() => {
      launchOverlayService();
    }, 300);
    // Ensure overlay is positioned immediately after launch
    setTimeout(() => {
      sendOverlayBounds(); // Initial sync
      // MPV window merger
      windowMergerProcess = spawn(parentHelperPath, [mpvTitle, electronTitle], { detached: true, stdio: 'ignore' });
      windowMergerProcess.unref();
    }, 1200);
    /* const pipeName = '\\\\.\\pipe\\mpvpipe';
    console.log('Pipe exists before wait:', fs.existsSync(pipeName));
    await waitForPipe(pipeName);
    console.log('Pipe exists after wait:', fs.existsSync(pipeName));
    console.log('Connecting to mpvIpcSocket');
    mpvIpcSocket = net.connect(pipeName);
    mpvIpcSocket.on('connect', () => {
      console.log('mpvIpcSocket connected!');
    });
    mpvIpcSocket.on('error', (err) => {
      console.error('mpvIpcSocket error:', err);
    });
    return { success: true }; */
  } catch (err) {
    console.error('Failed to launch MPV:', err);
    return { success: false, error: err.message };
  }
});

/* ipcMain.handle('mpv-command', async(event, data) => {
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
  if (command) {
    mpvIpcSocket.write(JSON.stringify(command) + "\n");
  }
})

let request_id = 0;
const pendingRequests = new Map();

if (mpvIpcSocket) {
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
} */

/* ipcMain.handle('mpv-fetch', async(event, data) => {
  return new Promise((resolve, reject) => {
    const thisRequestId = request_id++;
    pendingRequests.set(thisRequestId, (msg) => {
      // For get_property, result is in msg.data
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
      default:
        pendingRequests.delete(thisRequestId);
        reject('ipc fetcher didnt recieve a command');
        return;
    }
    mpvIpcSocket.write(JSON.stringify(command) + "\n");
  });
}) */

ipcMain.handle('stop-mpv', async () => {
  try {
    if (mpvProcess && !mpvProcess.killed) {
      process.kill(-mpvProcess.pid);
      mpvProcess = null;
    }
    if (windowMergerProcess && !windowMergerProcess.killed) {
      process.kill(-windowMergerProcess.pid);
      windowMergerProcess = null;
    }
    stopOverlayService();
    return { success: true };
  } catch (err) {
    console.error('Failed to stop MPV or window-merger:', err);
    return { success: false, error: err.message };
  }
});

function launchOverlayService() {
  if (overlayProcess) return;
  const overlayEntry = path.resolve(__dirname, '../../../overlay-service/overlay-main.js');
  overlayProcess = spawn(process.execPath, [overlayEntry], {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'], // Enable IPC
    env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }
  });
  overlayProcess.unref();
  overlayProcess.on('exit', () => { overlayProcess = null; });
}

function stopOverlayService() {
  if (overlayProcess) {
    overlayProcess.kill();
    overlayProcess = null;
  }
}

// Example usage: launchOverlayService() to start, stopOverlayService() to stop

app.whenReady().then(() => {
  createWindow();
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  const match = url.match(/token=([^&]+)/);
  if (match && mainWindow) {
    const token = match[1];
    mainWindow.webContents.send('oauth-token', token);
  }
});