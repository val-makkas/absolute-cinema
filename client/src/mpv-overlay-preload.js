const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mpvControls', {
  togglePlay: () => ipcRenderer.invoke('mpv-command', { command: 'toggle-pause' }),
  seek: (seconds) => ipcRenderer.invoke('mpv-command', { command: 'seek', value: seconds }),
  setVolume: (volume) => ipcRenderer.invoke('mpv-command', { command: 'set-volume', value: volume }),
  toggleFullscreen: () => ipcRenderer.invoke('fullscreen-main-window'),
  // Getters for player state
  getPlaybackState: () => ipcRenderer.invoke('mpv-fetch', { command: 'isPlaying' }),
  getCurrentTime: () => ipcRenderer.invoke('mpv-fetch', { command: 'currentTime' }),
  getDuration: () => ipcRenderer.invoke('mpv-fetch', { command: 'duration' }),
  getVolume: () => ipcRenderer.invoke('mpv-fetch', { command: 'volume' }),
  // Add hideMpv for overlay close button
  hideMpv: () => ipcRenderer.invoke('hide-mpv'),
  getCurrentTorrentInfo: () => ipcRenderer.invoke('get-current-torrent-info'),
});