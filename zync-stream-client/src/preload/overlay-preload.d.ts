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
}
