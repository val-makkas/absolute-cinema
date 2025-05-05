import { app, BrowserWindow } from 'electron';
import { ELECTRON_CONFIG } from '../config/electron-config.js';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import path from 'path';

let pyProc = null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function startFetchTorrents() {
  const fetchTorrents = path.join(__dirname, '../../service/fetch_torrents.py')
  pyProc = spawn('python', [fetchTorrents], { stdio: 'inherit' })
}

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
}

app.whenReady().then(() => {
  startFetchTorrents();

  createWindow();

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
    if (pyProc) pyProc.kill();
  });
});