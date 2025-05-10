import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { ELECTRON_CONFIG } from '../config/electron-config.js';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let torrentService = null;

function createWindow() {
  const win = new BrowserWindow({
    ...ELECTRON_CONFIG.WINDOW_OPTIONS,
    webPreferences: {
      ...ELECTRON_CONFIG.WINDOW_OPTIONS.webPreferences,
      preload: path.join(__dirname, '../preload.js')
    }
  });

  win.loadFile(path.join(__dirname, '../../dist/index.html'));

  if (ELECTRON_CONFIG.ENV === 'development') {
    win.webContents.openDevTools();
  }

  const servicePath = path.join(__dirname, "../../service/torrentstream");
  torrentService = spawn(servicePath, [], {
    cwd: path.dirname(servicePath),
    stdio: 'inherit',
  })

  torrentService.on('error', (err) => {
    console.error('Failed to start torrent service:', err);
  });
}

// Helper: Find Chrome executable path (cross-platform)
function getChromePath() {
  const platform = process.platform;
  if (platform === 'win32') {
    const prefixes = [
      process.env['PROGRAMFILES(X86)'],
      process.env['PROGRAMFILES'],
      process.env['LOCALAPPDATA']
    ];
    const suffix = '\\Google\\Chrome\\Application\\chrome.exe';
    for (const prefix of prefixes) {
      if (!prefix) continue;
      const chromePath = prefix + suffix;
      if (fs.existsSync(chromePath)) return chromePath;
    }
  } else if (platform === 'darwin') {
    const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (fs.existsSync(chromePath)) return chromePath;
  } else if (platform === 'linux') {
    const candidates = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/snap/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ];
    for (const chromePath of candidates) {
      if (fs.existsSync(chromePath)) return chromePath;
    }
  }
  return null;
}

// IPC handler: open-url-in-chrome
ipcMain.handle('open-url-in-chrome', async (event, url) => {
  const chromePath = getChromePath();
  if (chromePath) {
    spawn(chromePath, [url], { detached: true, stdio: 'ignore' });
    return { success: true, browser: 'chrome' };
  } else {
    // Fallback: open in default browser
    shell.openExternal(url);
    return { success: true, browser: 'default' };
  }
});

app.whenReady().then(() => {
  createWindow();
});

app.on('will-quit', () => {
  if (torrentService) {
    torrentService.kill();
  }
});