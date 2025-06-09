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

      startPartySync: (roomId: number, isHost: boolean) => Promise<{ success: boolean }>
      applySyncUpdate: (syncData: any) => Promise<{ success: boolean }>
      stopPartySync: () => Promise<{ success: boolean }>
      triggerManualSync: () => Promise<{ success: boolean }>

      onSyncUpdate: (callback: (syncData: any) => void) => void
      onManualSync: (callback: (syncData: any) => void) => void
      offSyncEvents: () => void

      getSyncStatus: () => Promise<{
        isActive: boolean
        isInSync: boolean
        lastSyncTime: number
        isHost: boolean
      }>
      updatePartyMembers: (count: number) => Promise<{ success: boolean }>

      on: (channel: string, callback: (...args: any[]) => void) => void
      removeListener: (channel: string, callback: (...args: any[]) => void) => void
    }
    overlayControls: any
  }
}

export {}
