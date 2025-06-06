import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { overlayControls } from './overlayControls'

const api = {
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, callback)
  }
}

interface RoomMovie {
  title: string
  year: string
  poster?: string
  imdb_id: string
  type: 'movie' | 'series'
  season?: number
  episode?: number
  episodeTitle?: string
}

contextBridge.exposeInMainWorld('electronAPI', {
  playInMpvSolo: (streamUrl: string, infoHash: string, fileIdx: number, movieDetails: RoomMovie) =>
    ipcRenderer.invoke('play-in-mpv-solo', streamUrl, infoHash, fileIdx, movieDetails),
  hideMpv: () => ipcRenderer.invoke('hide-mpv'),
  initWatchParty: (roomId: number, isHost: boolean) =>
    ipcRenderer.invoke('init-watch-party', roomId, isHost),
  allMembersReady: () => ipcRenderer.invoke('all-members-ready'),
  resetWatchParty: () => ipcRenderer.invoke('reset-watch-party'),
  prepareStream: (streamUrl: string, infoHash: string, fileIdx: number, movieDetails: RoomMovie) =>
    ipcRenderer.invoke('prepare-stream', streamUrl, infoHash, fileIdx, movieDetails),
  startSynchronizedPlayback: () => ipcRenderer.invoke('start-synchronized-playback'),
  onPartyEvent: (callback: (event: string, data?: any) => void) => {
    ipcRenderer.removeAllListeners('member-ready-local')
    ipcRenderer.removeAllListeners('party-countdown-broadcast')
    ipcRenderer.removeAllListeners('party-start-playback-broadcast')

    ipcRenderer.on('member-ready-local', () => {
      callback('member-ready-local')
    })

    ipcRenderer.on('party-countdown-broadcast', (_, data) => {
      callback('party-countdown-broadcast', data)
    })

    ipcRenderer.on('party-start-playback-broadcast', () => {
      callback('party-start-playback-broadcast')
    })
  },

  offPartyEvent: () => {
    ipcRenderer.removeAllListeners('member-ready-local')
    ipcRenderer.removeAllListeners('party-countdown-broadcast')
    ipcRenderer.removeAllListeners('party-start-playback-broadcast')
  },
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, callback)
  },
  removeListener: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  }
})

contextBridge.exposeInMainWorld('overlayControls', overlayControls)

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (defined in dts)
  window.electron = electronAPI
  // @ts-ignore (defined in dts)
  window.api = api
}
