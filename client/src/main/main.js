import { app, BrowserWindow, ipcMain } from 'electron';
import { ELECTRON_CONFIG } from '../config/electron-config.js';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import net from 'net';
// --- WebSocket server for overlay communication ---
import { WebSocketServer } from 'ws';

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
let windowOverlayProcess = null;
let overlayWss = null;
let overlayWsClients = [];

// Helper: Wait for a process to exit
function waitForProcessExit(proc, timeout = 5000) {
  return new Promise((resolve) => {
    if (!proc || proc.killed) return resolve();
    let done = false;
    const timer = setTimeout(() => {
      if (!done) resolve();
    }, timeout);
    proc.once('exit', () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve();
      }
    });
  });
}
// Helper: Wait for a file/pipe to not exist
function waitForPipeToBeDeleted(pipePath, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      fs.access(pipePath, fs.constants.F_OK, (err) => {
        if (err) return resolve(); // Not found, good
        if (Date.now() - start > timeout) return reject(new Error('Pipe still exists after timeout'));
        setTimeout(check, 100);
      });
    })();
  });
}

ipcMain.handle('play-in-mpv', async (event, streamUrl) => {
  console.log('play-in-mpv handler called');
  try {
    // Before spawning, ensure old mpv is dead and pipe is gone
    if (mpvProcess && !mpvProcess.killed) {
      try {
        mpvProcess.kill('SIGTERM');
        setTimeout(() => {
          if (!mpvProcess.killed) {
            try {
              process.kill(-mpvProcess.pid);
            } catch (e) {
              try {
                mpvProcess.kill('SIGKILL');
              } catch (e2) {
                console.error('Failed to kill mpvProcess directly:', e2);
              }
            }
          }
        }, 1000);
      } catch (e) {
        console.error('Failed to gracefully kill mpvProcess:', e);
      }
      await waitForProcessExit(mpvProcess, 5000);
      mpvProcess = null;
    }
    const pipeName = '\\\\.\\pipe\\mpvpipe';
    await waitForPipeToBeDeleted(pipeName, 5000);
    const mpvPath = path.resolve(__dirname, '../../../mpv/mpv.exe');
    const uoscScriptPath = path.resolve(__dirname, '../../../mpv/scripts/uosc.lua');
    const parentHelperPath = path.resolve(__dirname, '../../../tools/window-merger/window-merger.exe');
    const overlayHelperPath = path.resolve(__dirname, '../../../tools/window-merger/overlay-follower.exe');
    console.log('Checking mpvPath:', mpvPath, fs.existsSync(mpvPath));
    console.log('Checking uoscScriptPath:', uoscScriptPath, fs.existsSync(uoscScriptPath));
    console.log('Checking parentHelperPath:', parentHelperPath, fs.existsSync(parentHelperPath));
    console.log('Checking overlayHelperPath:', overlayHelperPath, fs.existsSync(overlayHelperPath));
    if (!fs.existsSync(mpvPath)) throw new Error('mpv.exe not found at: ' + mpvPath);
    if (!fs.existsSync(uoscScriptPath)) throw new Error('uosc.lua not found: ' + uoscScriptPath);
    if (!fs.existsSync(parentHelperPath)) throw new Error('window-merger.exe: ' + parentHelperPath);
    if (!fs.existsSync(overlayHelperPath)) throw new Error('overlay-follower.exe ' + overlayHelperPath);
    const mpvTitle = 'MPV-EMBED-' + Date.now();
    const electronTitle = mainWindow.getTitle();
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
    launchOverlayService();
    setTimeout(() => {
      // Use stdio: 'inherit' and remove detached:true to ensure overlay-follower.exe logs are visible in the Electron terminal
      // IMPORTANT: Launch overlay-follower with HWND_TOPMOST and SWP_NOZORDER to force overlay above MPV
      windowOverlayProcess = spawn(overlayHelperPath, ['Overlay', mpvTitle, 40], { stdio: 'inherit' });
      windowOverlayProcess.unref();
      // Only after overlay-follower is started, start window-merger
      setTimeout(() => {
        windowMergerProcess = spawn(parentHelperPath, [mpvTitle, electronTitle], { detached: true, stdio: 'ignore' });
        windowMergerProcess.unref();
      }, 1200);
    }, 1200);
    // Overlay follow logic: send bounds to overlay after move/resize
    /* let overlayBoundsThrottleTimer = null;
    function sendOverlayBoundsThrottled() {
      if (overlayBoundsThrottleTimer) return;
      overlayBoundsThrottleTimer = setTimeout(() => {
        overlayBoundsThrottleTimer = null;
        sendOverlayBounds();
      }, 4);
    } */
    /* function sendOverlayBounds() {
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
    mainWindow.on('leave-full-screen', sendOverlayBounds); */
    // Ensure overlay is positioned immediately after launch
    setTimeout(() => {
      windowMergerProcess = spawn(parentHelperPath, [mpvTitle, electronTitle], { detached: true, stdio: 'ignore' });
      windowMergerProcess.unref();
    }, 1200);
     // Increased delay to ensure overlay window is created
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

ipcMain.handle('toggle-main-fullscreen', async () => {
  if (mainWindow) {
    if (mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
    } else {
      mainWindow.setFullScreen(true);
    }
  }
});

ipcMain.handle('close-overlay', async () => {
  try {
    stopOverlayService();
    return { success: true };
  } catch (err) {
    console.error('Failed to stop overlay process:', err);
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

function startOverlayWebSocketServer() {
  if (overlayWss) return;
  overlayWss = new WebSocketServer({ port: 31337 });
  overlayWss.on('connection', ws => {
    overlayWsClients.push(ws);
    ws.on('message', msg => {
      try {
        const data = JSON.parse(msg);
        if (data.type === 'toggle-fullscreen' && mainWindow) {
          mainWindow.setFullScreen(!mainWindow.isFullScreen());
        }
        if (data.type === 'close-main' && mainWindow) {
          // Gracefully kill mpv process first
          if (mpvProcess && !mpvProcess.killed) {
            try {
              mpvProcess.kill('SIGTERM'); // Graceful
              // Wait a moment for graceful shutdown
              setTimeout(() => {
                if (!mpvProcess.killed) {
                  try {
                    process.kill(-mpvProcess.pid); // Fallback to group kill
                  } catch (e) {
                    try {
                      mpvProcess.kill('SIGKILL'); // Force kill
                    } catch (e2) {
                      console.error('Failed to kill mpvProcess directly:', e2);
                    }
                  }
                }
              }, 1000); // 1s grace period
            } catch (e) {
              console.error('Failed to gracefully kill mpvProcess:', e);
            }
            mpvProcess = null;
          }
          // Stop overlay, window merger, and overlay helper process
          if (windowMergerProcess && !windowMergerProcess.killed) {
            try {
              process.kill(-windowMergerProcess.pid);
            } catch (e) {
              try {
                windowMergerProcess.kill('SIGKILL');
              } catch (e2) {
                console.error('Failed to kill windowMergerProcess directly:', e2);
              }
            }
            windowMergerProcess = null;
          }
          if (windowOverlayProcess && !windowOverlayProcess.killed) {
            try {
              process.kill(-windowOverlayProcess.pid);
            } catch (e) {
              try {
                windowOverlayProcess.kill('SIGKILL');
              } catch (e2) {
                console.error('Failed to kill windowOverlayProcess directly:', e2);
              }
            }
            windowOverlayProcess = null;
          }
          stopOverlayService();
        }
      } catch (e) {}
    });
    ws.on('close', () => {
      overlayWsClients = overlayWsClients.filter(c => c !== ws);
    });
  });
}

app.whenReady().then(() => {
  createWindow();
  startOverlayWebSocketServer();
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  const match = url.match(/token=([^&]+)/);
  if (match && mainWindow) {
    const token = match[1];
    mainWindow.webContents.send('oauth-token', token);
  }
});