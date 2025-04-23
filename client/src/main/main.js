import { app, BrowserWindow } from 'electron';
import { ELECTRON_CONFIG } from '../config/electron-config.js';
import { fileURLToPath } from 'url';
import path from 'path';

// ES Module compatible __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    ...ELECTRON_CONFIG.WINDOW_OPTIONS,
    webPreferences: {
      ...ELECTRON_CONFIG.WINDOW_OPTIONS.webPreferences,
      preload: path.join(__dirname, '../renderer/preload.js')
    }
  });

  win.loadFile(path.join(__dirname, '../renderer/index.html'));
  

  // Open dev tools in development
  if (ELECTRON_CONFIG.ENV === 'development') {
    win.webContents.openDevTools();
  }

  win.webContents.openDevTools({
    mode: 'detach',
    activate: true,
    title: 'Custom DevTools'
  });
}

app.whenReady().then(createWindow);