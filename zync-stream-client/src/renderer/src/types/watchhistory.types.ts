export interface WatchHistoryEntry {
  ID: number
  UserID: number
  imdbID: string
  MediaType: 'movie' | 'tv'
  SeasonNumber?: number
  EpisodeNumber?: number
  TimestampSeconds: number
  DurationSeconds?: number
  PercentageWatched?: number
  LastWatched?: number
}
