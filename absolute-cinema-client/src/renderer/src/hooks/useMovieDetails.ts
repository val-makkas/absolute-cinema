import { useState, useCallback } from 'react'

const API_BASE = 'http://localhost:8080/api/metadata'

interface MovieDetails {
  title: string
  [key: string]: any
}

type DetailsCache = Record<string, MovieDetails | undefined>
const detailsCache: DetailsCache = {}

// Helper: Only cache valid details (adjust fields as needed)
const isValidDetails = (data: any): data is MovieDetails => {
  return data && typeof data === 'object' && data.title
}

export function useMovieDetails(): {
  details: MovieDetails | null
  loading: boolean
  error: string | null
  fetchDetails: (imdbId: string, tmdbId: string) => Promise<void>
  isCached: (imdbId: string, tmdbId: string) => boolean
  clearDetails: () => void
  setDetailsFromCache: (imdbId: string, tmdbId: string) => boolean
} {
  const [details, setDetails] = useState<MovieDetails | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const clearDetails = useCallback(() => {
    setDetails(null)
    setError(null)
    setLoading(false)
  }, [])

  const isCached = useCallback((imdbId: string, tmdbId: string) => {
    const cacheKey = imdbId + ':' + tmdbId
    const cached = detailsCache[cacheKey]
    return isValidDetails(cached)
  }, [])

  const setDetailsFromCache = useCallback((imdbId: string, tmdbId: string) => {
    if (!imdbId && !tmdbId) {
      // Clear details if no IDs provided
      setDetails(null)
      return false
    }

    const cacheKey = imdbId + ':' + tmdbId
    const cached = detailsCache[cacheKey]
    if (isValidDetails(cached)) {
      setDetails(cached)
      return true
    }
    return false
  }, [])

  const fetchDetails = useCallback(
    async (imdbId: string, tmdbId: string) => {
      const cacheKey = imdbId + ':' + tmdbId
      if (isCached(imdbId, tmdbId)) {
        setDetails(detailsCache[cacheKey]!)
        setLoading(false)
        return
      }
      setDetails(null)
      setLoading(true)
      setError(null)
      try {
        const url = `${API_BASE}/details/${imdbId}/${tmdbId}`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to fetch details')
        const data = await res.json()
        if (isValidDetails(data)) {
          detailsCache[cacheKey] = data
          setDetails(data)
        } else {
          throw new Error('Movie details not found')
        }
      } catch (err: any) {
        setError(err.message)
        setDetails(null)
      } finally {
        setLoading(false)
      }
    },
    [isCached]
  )

  return { details, loading, error, fetchDetails, isCached, clearDetails, setDetailsFromCache }
}
