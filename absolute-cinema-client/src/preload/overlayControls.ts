import { ipcRenderer } from 'electron'

export const overlayControls = {
  togglePlay: async () => ipcRenderer.invoke('mpv-command', { command: 'toggle-pause' }),
  seek: async (time) => ipcRenderer.invoke('mpv-command', { command: 'seek', value: time }),
  setVolume: async (volume) =>
    ipcRenderer.invoke('mpv-command', { command: 'set-volume', value: volume }),
  toggleFullscreen: async () => ipcRenderer.invoke('mpv-command', { command: 'toggle-fullscreen' }),
  toggleFullscreenMainWindow: async () => ipcRenderer.invoke('fullscreen-main-window'),
  setSubtitle: async (id) =>
    ipcRenderer.invoke('mpv-command', { command: 'set-subtitle', value: id }),
  getCurrentTime: async () => ipcRenderer.invoke('mpv-fetch', { command: 'currentTime' }),
  getDuration: async () => ipcRenderer.invoke('mpv-fetch', { command: 'duration' }),
  getPlaybackState: async () => ipcRenderer.invoke('mpv-fetch', { command: 'isPlaying' }),
  getVolume: async () => ipcRenderer.invoke('mpv-fetch', { command: 'volume' }),
  getSubtitleTracks: async () => ipcRenderer.invoke('mpv-fetch', { command: 'subtitleTracks' }),
  getCurrentSubtitle: async () => ipcRenderer.invoke('mpv-fetch', { command: 'currentSubtitle' }),
  getTorrentInfo: async () => ipcRenderer.invoke('get-current-torrent-info'),
  hideMpv: async () => ipcRenderer.invoke('hide-mpv')
}
