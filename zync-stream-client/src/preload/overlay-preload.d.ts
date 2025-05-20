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
    setSubtitle: (id: number | string) => Promise<boolean>
    getCurrentTime: () => Promise<number>
    getDuration: () => Promise<number>
    getPlaybackState: () => Promise<boolean>
    getVolume: () => Promise<number>
    getSubtitleTracks: () => Promise<SubtitleTrack[]>
    getCurrentSubtitle: () => Promise<number | string>
    getTorrentInfo: () => Promise<any>
    hideMpv: () => Promise<void>
  }
}