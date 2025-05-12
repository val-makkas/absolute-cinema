import { app, protocol, BrowserWindow, ipcMain, shell } from 'electron';
import { ELECTRON_CONFIG } from '../config/electron-config.js';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    ...ELECTRON_CONFIG.WINDOW_OPTIONS,
    webPreferences: {
      ...ELECTRON_CONFIG.WINDOW_OPTIONS.webPreferences,
      preload: path.join(__dirname, '../preload.js'),
      plugins: false, // mpv.js deprecated, no Pepper plugin
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));

  if (ELECTRON_CONFIG.ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// --- Native MPV Launch & Window Reparenting (legacy approach) ---
function reparentAndResizeMPV(mpvTitle, electronTitle) {
  const parentHelperPath = path.resolve(__dirname, '../../../tools/window-merger/window-merger.exe');
  if (fs.existsSync(parentHelperPath)) {
    spawn(parentHelperPath, [mpvTitle, electronTitle], { detached: true, stdio: 'ignore' });
  }
}

let lastMpvTitle = null;
ipcMain.handle('play-in-mpv', async (event, streamUrl) => {
  try {
    const mpvPath = path.resolve(__dirname, '../../../mpv/mpv.exe');
    const uoscScriptPath = path.resolve(__dirname, '../../../mpv/scripts/uosc.lua');
    const parentHelperPath = path.resolve(__dirname, '../../../tools/window-merger/window-merger.exe');
    if (!fs.existsSync(mpvPath)) throw new Error('mpv.exe not found at: ' + mpvPath);
    if (!fs.existsSync(uoscScriptPath)) throw new Error('uosc.lua not found: ' + uoscScriptPath);
    if (!fs.existsSync(parentHelperPath)) throw new Error('window-merger.exe: ' + parentHelperPath);
    const mpvTitle = 'MPV-EMBED-' + Date.now();
    const electronTitle = mainWindow.getTitle();
    lastMpvTitle = mpvTitle;
    setTimeout(() => { reparentAndResizeMPV(mpvTitle, electronTitle); }, 1200);
    const args = [
      streamUrl,
      `--script=${uoscScriptPath}`,
      '--force-window=yes',
      `--title=${mpvTitle}`,
      '--no-terminal',
      '--hwdec=auto',
      '--no-border',
      '--ontop',
    ];
    const child = spawn(mpvPath, args, { detached: true, stdio: 'ignore' });
    child.unref();
    setTimeout(() => {
      spawn(parentHelperPath, [mpvTitle, electronTitle], { detached: true, stdio: 'ignore' });
    }, 1200);
    return { success: true };
  } catch (err) {
    console.error('Failed to launch MPV:', err);
    return { success: false, error: err.message };
  }
});

app.whenReady().then(() => {
  createWindow();
  if (mainWindow) {
    mainWindow.on('resize', () => {
      if (lastMpvTitle) {
        reparentAndResizeMPV(lastMpvTitle, mainWindow.getTitle());
      }
    });
  }
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  const match = url.match(/token=([^&]+)/);
  if (match && mainWindow) {
    const token = match[1];
    mainWindow.webContents.send('oauth-token', token);
  }
});