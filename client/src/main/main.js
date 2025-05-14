import { app, BrowserWindow, ipcMain } from 'electron';
import { ELECTRON_CONFIG } from '../config/electron-config.js';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import net from 'net';

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

  // Helper to sync overlay with main window content bounds
  function syncOverlayToMain() {
    if (overlayWindow) {
      const bounds = mainWindow.getContentBounds();
      overlayWindow.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      });
    }
  }

  mainWindow.on('move', syncOverlayToMain);
  mainWindow.on('resize', syncOverlayToMain);
  mainWindow.on('maximize', syncOverlayToMain);
  mainWindow.on('unmaximize', syncOverlayToMain);
  mainWindow.on('restore', () => {
    if (overlayWindow) overlayWindow.restore();
    setTimeout(syncOverlayToMain, 50);
  });
  mainWindow.on('enter-full-screen', syncOverlayToMain);
  mainWindow.on('leave-full-screen', syncOverlayToMain);
  mainWindow.on('show', syncOverlayToMain);
  mainWindow.on('close', () => {
    if (overlayWindow) {
      overlayWindow.close();
      overlayWindow = null;
    }
  });
  mainWindow.on('blur', () => {
    if (overlayWindow) {
      overlayWindow.hide();
    }
  });
  mainWindow.on('focus', () => {
    if (overlayWindow) {
      overlayWindow.show();
      syncOverlayToMain();
    }
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

// In your main.js, add a function to start MPV in idle mode
let mpvProcess = null;
let mpvIpcSocket = null;
let windowMergerProcess = null;
let mpvOverlay = null;
const pipeName = '\\\\.\\pipe\\mpvpipe';

const parentHelperPath = path.resolve(__dirname, '../../../tools/absolute-cinema-window-merger/window-merger.exe');
const mpvTitle = 'MPV-EMBED-' + Date.now();

function waitForPipe(pipePath, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      fs.access(pipePath, fs.constants.F_OK, (err) => {
        if (!err) return resolve(); // Found, good
        if (Date.now() - start > timeout) {
          return reject(new Error('Pipe not created after timeout'));
        }
        setTimeout(check, 100);
      });
    })();
  });
}

let overlayWindow = null;

function createMpvOverlayWindow() {
  console.log('[Overlay] Creating overlay window...');
  if (overlayWindow) {
    console.log('[Overlay] Closing existing overlay window');
    overlayWindow.close();
    overlayWindow = null;
  }
  // Use content bounds for perfect overlay alignment
  const bounds = mainWindow.getContentBounds();
  overlayWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    focusable: false,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '../mpv-overlay-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });
  overlayWindow.setIgnoreMouseEvents(false);
  overlayWindow.loadFile(path.join(__dirname, '../../dist/overlay/mpv-overlay.html'));
  global.overlayWindow = overlayWindow;
  overlayWindow.on('ready-to-show', () => {
    console.log('[Overlay] Overlay window ready to show');
  });
  overlayWindow.on('closed', () => {
    console.log('[Overlay] Overlay window closed');
  });
  return overlayWindow;
}

function removeMpvOverlayWindow() {
  console.log('[Overlay] Removing overlay window...');
  if (overlayWindow) {
    overlayWindow.close();
    overlayWindow = null;
    global.overlayWindow = null;
  }
}

async function startIdleMpv() {
  if (mpvProcess && !mpvProcess.killed) return; // Already running

  await waitForPipeToBeDeleted(pipeName, 5000);
  const mpvPath = path.resolve(__dirname, '../../../mpv/mpv.exe');

  const args = [
    '--idle',
    '--force-window=no',
    '--no-video',
    `--title=${mpvTitle}`,
    '--no-terminal',
    '--hwdec=auto',
    '--no-border',
    '--no-osc',              // Disable on-screen controller
    '--no-osd-bar',          // Disable on-screen display bar
    '--osd-level=0',         // Disable on-screen display completely
    '--cursor-autohide=no',  // Keep cursor hidden
    `--input-ipc-server=${pipeName}`
  ];

  console.log('Starting idle MPV with args:', args);
  mpvProcess = spawn(mpvPath, args, { detached: true });

  // Connect to the IPC socket
  await waitForPipe(pipeName);
  mpvIpcSocket = net.connect(pipeName);
  setupMpvIpcListener(); // <-- Ensure IPC responses are handled

  mpvIpcSocket.on('connect', () => {
    console.log('Connected to MPV IPC socket!');
  });

  mpvIpcSocket.on('error', (err) => {
    console.error('MPV IPC socket error:', err);
  });

  return true;
}


ipcMain.handle('play-in-mpv', async (event, streamUrl) => {
  await new Promise(resolve => setTimeout(resolve, 5000));
  try {
    // Make sure MPV is running
    if (!mpvProcess || mpvProcess.killed) {
      await startIdleMpv();
    }

    const electronTitle = mainWindow.getTitle();

    mpvIpcSocket.write(JSON.stringify({ command: ["set_property", "vid", "auto"] }) + "\n");
    mpvIpcSocket.write(JSON.stringify({ command: ["set_property", "force-window", "yes"] }) + "\n");

    await new Promise(resolve => setTimeout(resolve, 100));

    const command = {
      command: ["loadfile", streamUrl]
    };
    mpvIpcSocket.write(JSON.stringify(command) + "\n");

    // Poll MPV for duration, only create overlay and merge window when ready
    const pollForDuration = async (retries = 25) => {
      for (let i = 0; i < retries; i++) {
        try {
          console.log(`[Overlay] Polling MPV for duration (attempt ${i + 1}/${retries})...`);
          const duration = await new Promise((resolve, reject) => {
            const thisRequestId = request_id++;
            const timeoutId = setTimeout(() => {
              if (pendingRequests.has(thisRequestId)) {
                pendingRequests.delete(thisRequestId);
                resolve(0);
              }
            }, 500);
            pendingRequests.set(thisRequestId, (msg) => {
              clearTimeout(timeoutId);
              if (msg.error === 'success') {
                resolve(msg.data);
              } else {
                resolve(0);
              }
            });
            const cmd = { command: ["get_property", "duration"], request_id: thisRequestId };
            mpvIpcSocket.write(JSON.stringify(cmd) + "\n");
          });
          console.log(`[Overlay] MPV duration response:`, duration);
          if (typeof duration === 'number' && duration > 0) {
            console.log('[Overlay] Valid duration received, merging MPV window and creating overlay window.');
            windowMergerProcess = spawn(
              parentHelperPath,
              [mpvTitle, electronTitle],
              { detached: true }
            );
            createMpvOverlayWindow();
            return;
          }
        } catch (e) {
          console.error('[Overlay] Error polling for duration:', e);
        }
        await new Promise(r => setTimeout(r, 200));
      }
      // Fallback: merge and create overlay anyway after timeout
      console.warn('[Overlay] Timed out waiting for valid duration, merging MPV window and creating overlay window as fallback.');
      windowMergerProcess = spawn(
        parentHelperPath,
        [mpvTitle, electronTitle],
        { detached: true }
      );
      createMpvOverlayWindow();
    };
    pollForDuration();

    return { success: true };
  } catch (err) {
    console.error('Failed to load video in MPV:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('hide-mpv', async () => {
  try {
    console.log("Killing MPV and restarting in idle mode");

    // First, disconnect from the socket if it exists
    if (mpvIpcSocket) {
      try {
        // Try to send a quit command to MPV first
        mpvIpcSocket.write(JSON.stringify({ command: ["quit"] }) + "\n");
        await new Promise(resolve => setTimeout(resolve, 100));

        // Then close the socket
        mpvIpcSocket.end();
        mpvIpcSocket.destroy();
        mpvIpcSocket = null;

        removeMpvOverlayWindow();
      } catch (err) {
        console.error('Error closing socket:', err);
      }
    }

    // Kill the window merger process if it exists
    if (windowMergerProcess && !windowMergerProcess.killed) {
      try {
        windowMergerProcess.kill('SIGKILL'); // Force kill with SIGKILL
        windowMergerProcess = null;
      } catch (err) {
        console.error('Error killing window merger:', err);
      }
    }

    // Kill the MPV process if it exists - use forceful termination
    if (mpvProcess && !mpvProcess.killed) {
      try {
        // First try a graceful exit
        mpvProcess.kill('SIGTERM');

        // Wait a short time and check if it's still running
        await new Promise(resolve => setTimeout(resolve, 300));

        // If still running, force kill it
        if (!mpvProcess.killed) {
          mpvProcess.kill('SIGKILL');

          // On Windows, as a last resort, use taskkill
          try {
            spawn('taskkill', ['/f', '/im', 'mpv.exe'], { stdio: 'ignore' });
          } catch (taskKillErr) {
            console.error('Error using taskkill:', taskKillErr);
          }
        }

        mpvProcess = null;
      } catch (err) {
        console.error('Error killing MPV process:', err);

        // As a fallback, try to kill using taskkill
        try {
          spawn('taskkill', ['/f', '/im', 'mpv.exe'], { stdio: 'ignore' });
        } catch (taskKillErr) {
          console.error('Error using taskkill fallback:', taskKillErr);
        }
      }
    }

    // Wait longer for everything to clean up
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Restart MPV in idle mode
    try {
      await startIdleMpv();
      console.log("MPV restarted in idle mode");
      return { success: true };
    } catch (restartErr) {
      console.error('Failed to restart MPV in idle mode:', restartErr);
      return { success: false, error: restartErr.message };
    }
  } catch (err) {
    console.error('Failed to hide and restart MPV:', err);
    return { success: false, error: err.message };
  }
});

// --- MPV Overlay IPC Handlers ---
let request_id = 0;
const pendingRequests = new Map();

function setupMpvIpcListener() {
  if (!mpvIpcSocket) return;
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
}

ipcMain.handle('mpv-command', async (event, data) => {
  if (!mpvIpcSocket) {
    console.error("No MPV IPC socket connection");
    return { success: false, error: "No MPV connection" };
  }
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
      console.log("ipc handler didn't receive a command");
      return { success: false, error: "Invalid command" };
  }
  try {
    if (command) {
      mpvIpcSocket.write(JSON.stringify(command) + "\n");
      return { success: true };
    }
  } catch (err) {
    console.error("Error sending command to MPV:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('mpv-fetch', async (event, data) => {
  if (!mpvIpcSocket) {
    console.error("No MPV IPC socket connection");
    return null;
  }
  return new Promise((resolve, reject) => {
    const thisRequestId = request_id++;
    const timeoutId = setTimeout(() => {
      if (pendingRequests.has(thisRequestId)) {
        pendingRequests.delete(thisRequestId);
        reject('Request timed out');
      }
    }, 3000);
    pendingRequests.set(thisRequestId, (msg) => {
      clearTimeout(timeoutId);
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
        clearTimeout(timeoutId);
        reject('ipc fetcher didnt receive a command');
        return;
    }
    try {
      mpvIpcSocket.write(JSON.stringify(command) + "\n");
    } catch (err) {
      pendingRequests.delete(thisRequestId);
      clearTimeout(timeoutId);
      reject(`Error sending command: ${err.message}`);
    }
  });
});

app.whenReady().then(async () => {
  createWindow();
  await startIdleMpv();
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  const match = url.match(/token=([^&]+)/);
  if (match && mainWindow) {
    const token = match[1];
    mainWindow.webContents.send('oauth-token', token);
  }
});