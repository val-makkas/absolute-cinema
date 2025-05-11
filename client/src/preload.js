const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => {
    // Whitelist channels
    const validChannels = ['sync-event', 'chat-message', 'room-action'];
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
  playInMpv: (streamUrl) => ipcRenderer.invoke('play-in-mpv', streamUrl)
});