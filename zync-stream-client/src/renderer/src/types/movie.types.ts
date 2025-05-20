export interface Movie {
  imdb_id: string
  tmdb_id?: string
  title: string
  year?: number
  poster?: string
  type?: 'movie' | 'series' | 'episode'
}

export interface MovieDetails extends Movie {
  plot?: string
  rating?: number
  runtime?: string
  genre?: string[]
  director?: string
  actors?: string[]
  language?: string
  country?: string
  awards?: string
  released?: string
  production?: string
  writer?: string
}

export interface MovieSource {
  infoHash: string
  fileIdx: number
  quality?: string
  title?: string
  size?: number
}

export interface MovieCache {
  [id: string]: MovieDetails
}
