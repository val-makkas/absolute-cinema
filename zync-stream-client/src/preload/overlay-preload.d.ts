interface SubtitleTrack {
  id: number | string
  title?: string
  lang?: string
  type?: string
}

interface TorrentInfo {
  infoHash?: string
  fileIdx?: number
  title?: string
  year?: string
}

interface Window {
  overlayControls: {
    togglePlay: () => Promise<boolean>
    seek: (time: number) => Promise<boolean>
    setVolume: (volume: number) => Promise<boolean>
    toggleFullscreen: () => Promise<boolean>
    toggleFullscreenMainWindow: () => Promise<boolean>
    setSubtitle: (id: number | string | null) => Promise<boolean>
    getCurrentTime: () => Promise<number>
    getDuration: () => Promise<number>
    getPlaybackState: () => Promise<boolean>
    getVolume: () => Promise<number>
    getSubtitleTracks: () => Promise<any>
    getCurrentSubtitle: () => Promise<any>
    getTorrentInfo: () => Promise<any>
    hideMpv: () => Promise<void>

    setSubtitleDelay: (delay: number) => Promise<boolean>
    setSubtitleSize: (size: number) => Promise<boolean>
    removeSubtitle: (trackId: number) => Promise<boolean>
    cycleSubtitle: () => Promise<boolean>
    setSubtitleVisibility: (visible: boolean) => Promise<boolean>
    getSubtitleDelay: () => Promise<number>
    getSubtitleScale: () => Promise<number>
    getSubtitleVisibility: () => Promise<boolean>

    // New subtitle functions
    searchSubtitles: () => Promise<{
      success: boolean
      subtitles: any[]
      error?: string
    }>
    downloadSubtitle: (subtitleInfo: any) => Promise<{
      success: boolean
      filepath?: string
      filename?: string
      language?: string
      encoding?: string
      error?: string
    }>
    addExternalSubtitle: (subtitlePath: string | undefined) => Promise<boolean>
  }
  electron: {
    ipcRenderer: {
      on: (channel: string, callback: (event: any, ...args: any[]) => void) => void
      removeListener: (channel: string, callback: (event: any, ...args: any[]) => void) => void
    }
  }
}
