const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  invoke: (...args) => ipcRenderer.invoke(...args),
  // Optionally, you can expose other safe methods here
});

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => {
    // Whitelist channels
    const validChannels = ['sync-event', 'chat-message', 'room-action', 'play-in-mpv', 'mpv-command', 'mpv-fetch', 'stop-mpv'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    const validChannels = ['sync-update', 'chat-message', 'user-event'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  openUrlInChrome: (url) => ipcRenderer.invoke('open-url-in-chrome', url),
  onOAuthToken: (callback) => ipcRenderer.on('oauth-token', (event, token) => callback(token)),
  playInMpv: (streamUrl) => ipcRenderer.invoke('play-in-mpv', streamUrl),
});