// config/electron-config.js
export const ELECTRON_CONFIG = {
    ENV: process.env.NODE_ENV || 'development',
    WINDOW_OPTIONS: {
        width: 1440,
        height: 900,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: '../renderer/preload.js'
        }
    }
};