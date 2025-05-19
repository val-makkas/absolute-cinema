import { useState, useCallback } from 'react'
import { entry } from '@renderer/types'
const API_MANIFEST = 'https://v3-cinemeta.strem.io'

type MovieDetails = entry | null
type DetailsCache = Record<string, MovieDetails | undefined>
const detailsCache: DetailsCache = {}

// Helper: Only cache valid details (adjust fields as needed)
const isValidDetails = (data: any): data is MovieDetails => {
  return data && typeof data === 'object' && data.name
}

export function useMovieDetails(): {
  details: MovieDetails | null
  loading: boolean
  error: string | null
  fetchDetails: (imdbId: string, type: 'movie' | 'series') => Promise<void>
  isCached: (imdbId: string) => boolean
  clearDetails: () => void
  setDetailsFromCache: (imdbId: string) => boolean
} {
  const [details, setDetails] = useState<MovieDetails | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const clearDetails = useCallback(() => {
    setDetails(null)
    setError(null)
    setLoading(false)
  }, [])

  const isCached = useCallback((imdbId: string) => {
    const cacheKey = imdbId
    const cached = detailsCache[cacheKey]
    return isValidDetails(cached)
  }, [])

  const setDetailsFromCache = useCallback((imdbId: string) => {
    if (!imdbId) {
      // Clear details if no IDs provided
      setDetails(null)
      return false
    }

    const cacheKey = imdbId
    const cached = detailsCache[cacheKey]
    if (isValidDetails(cached)) {
      setDetails(cached)
      return true
    }
    return false
  }, [])

  const fetchDetails = useCallback(
    async (imdbId: string, type: 'movie' | 'series') => {
      const cacheKey = imdbId
      if (isCached(imdbId)) {
        setDetails(detailsCache[cacheKey]!)
        setLoading(false)
        return
      }
      setDetails(null)
      setLoading(true)
      setError(null)
      try {
        const url = `${API_MANIFEST}/meta/${type}/${imdbId}.json`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to fetch details')
        const data = await res.json()
        if (isValidDetails(data.meta)) {
          detailsCache[cacheKey] = data.meta
          setDetails(data.meta)
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
