import { ipcRenderer } from 'electron'

export const overlayControls = {
  togglePlay: async () => ipcRenderer.invoke('mpv-command', { command: 'toggle-pause' }),
  seek: async (time) => ipcRenderer.invoke('mpv-command', { command: 'seek', value: time }),
  setVolume: async (volume) =>
    ipcRenderer.invoke('mpv-command', { command: 'set-volume', value: volume }),
  toggleFullscreen: async () => ipcRenderer.invoke('mpv-command', { command: 'toggle-fullscreen' }),
  toggleFullscreenMainWindow: async () => ipcRenderer.invoke('fullscreen-main-window'),

  getSubtitleTracks: () => ipcRenderer.invoke('mpv-fetch', { command: 'subtitleTracks' }),
  getCurrentSubtitle: () => ipcRenderer.invoke('mpv-fetch', { command: 'currentSubtitle' }),
  setSubtitle: (trackId) =>
    ipcRenderer.invoke('mpv-command', { command: 'set-subtitle', value: trackId }),
  addExternalSubtitle: (subtitlePath) =>
    ipcRenderer.invoke('mpv-command', { command: 'add-subtitle', value: subtitlePath }),
  setSubtitleDelay: (delay) =>
    ipcRenderer.invoke('mpv-command', { command: 'subtitle-delay', value: delay }),
  setSubtitleSize: (size) =>
    ipcRenderer.invoke('mpv-command', { command: 'subtitle-size', value: size }),
  removeSubtitle: (trackId) =>
    ipcRenderer.invoke('mpv-command', { command: 'remove-subtitle', value: trackId }),
  cycleSubtitle: () => ipcRenderer.invoke('mpv-command', { command: 'cycle-subtitle' }),
  setSubtitleVisibility: (visible) =>
    ipcRenderer.invoke('mpv-command', { command: 'set-subtitle-visibility', value: visible }),
  getSubtitleDelay: () => ipcRenderer.invoke('mpv-fetch', { command: 'subtitleDelay' }),
  getSubtitleScale: () => ipcRenderer.invoke('mpv-fetch', { command: 'subtitleScale' }),
  getSubtitleVisibility: () => ipcRenderer.invoke('mpv-fetch', { command: 'subtitleVisibility' }),

  searchSubtitles: (movieInfo) => ipcRenderer.invoke('search-subtitles', movieInfo),
  downloadSubtitle: (subtitleId) => ipcRenderer.invoke('download-subtitle', subtitleId),
  getCurrentTorrentInfo: () => ipcRenderer.invoke('get-current-torrent-info'),

  getCurrentTime: async () => ipcRenderer.invoke('mpv-fetch', { command: 'currentTime' }),
  getDuration: async () => ipcRenderer.invoke('mpv-fetch', { command: 'duration' }),
  getPlaybackState: async () => ipcRenderer.invoke('mpv-fetch', { command: 'isPlaying' }),
  getVolume: async () => ipcRenderer.invoke('mpv-fetch', { command: 'volume' }),
  getTorrentInfo: async () => ipcRenderer.invoke('get-current-torrent-info'),
  hideMpv: async () => ipcRenderer.invoke('hide-mpv')
}
