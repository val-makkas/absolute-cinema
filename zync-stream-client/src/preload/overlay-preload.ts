import { contextBridge, ipcRenderer } from 'electron'
import { overlayControls } from './overlayControls'

contextBridge.exposeInMainWorld('overlayControls', overlayControls)

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    on: (channel: string, callback: (...args: any[]) => void) => {
      ipcRenderer.on(channel, callback)
    },
    removeListener: (channel: string, callback: (...args: any[]) => void) => {
      ipcRenderer.removeListener(channel, callback)
    }
  }
})