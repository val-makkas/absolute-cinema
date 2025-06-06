import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    electronAPI: {
      playInMpvSolo: (
        streamUrl: string,
        infoHash: string,
        fileIdx: number,
        movieDetails: any
      ) => Promise<any>
      hideMpv: () => Promise<any>
      initWatchParty: (roomId: number, isHost: boolean) => Promise<any>
      allMembersReady: () => Promise<any>
      resetWatchParty: () => Promise<any>
      prepareStream: (
        streamUrl: string,
        infoHash: string,
        fileIdx: number,
        movieDetails: any
      ) => Promise<any>
      startSynchronizedPlayback: () => Promise<any>
      onPartyEvent: (callback: (event: string, data?: any) => void) => void
      offPartyEvent: () => void
      on: (channel: string, callback: (...args: any[]) => void) => void
      removeListener: (channel: string, callback: (...args: any[]) => void) => void
    }
    overlayControls: any
  }
}
