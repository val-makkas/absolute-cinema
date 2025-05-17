import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { overlayControls } from './overlayControls'

// Custom APIs for renderer
const api = {}

contextBridge.exposeInMainWorld('electronAPI', {
  playInMpv: (streamUrl, infoHash, fileIdx) =>
    ipcRenderer.invoke('play-in-mpv', streamUrl, infoHash, fileIdx),
  hideMpv: () => ipcRenderer.invoke('hide-mpv'),
  send: (channel, data) => {
    // Whitelist channels
    const validChannels = ['play-in-mpv', 'mpv-command', 'mpv-fetch', 'stop-mpv']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  receive: (channel, func) => {
    const validChannels = ['sync-update', 'chat-message', 'user-event']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => func(...args))
    }
  }
})

// Expose MPV controls in main window as well
contextBridge.exposeInMainWorld('overlayControls', overlayControls)

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}