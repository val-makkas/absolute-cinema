import { app, BrowserWindow } from 'electron';
import { ELECTRON_CONFIG } from '../config/electron-config.js';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import path from 'path';

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

  const servicePath = path.join(__dirname, "../../service/fetch_torrents");
  torrentService = spawn(servicePath, [], {
    cwd: path.dirname(servicePath),
    stdio: 'inherit',
  })

  torrentService.on('error', (err) => {
    console.error('Failed to start torrent service:', err);
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on('will-quit', () => {
  if (torrentService) {
    torrentService.kill();
  }
});