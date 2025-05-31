import { useState, useEffect, useCallback, useRef } from 'react'
import { entry, WatchHistoryEntry } from '@/types'

const API_CINE = import.meta.env.VITE_API_CINE
const CACHE_EXPIRY = 30 * 60 * 1000

export interface updatedWatchHistoryEntry extends WatchHistoryEntry {
  movieDetails: entry | null
}

export default function useWatchHistory(token: string): {
  watchHistory: WatchHistoryEntry[]
  updatedWatchHistory: updatedWatchHistoryEntry[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
} {
  const [watchHistory, setWatchHistory] = useState<WatchHistoryEntry[]>([])
  const [updatedWatchHistory, setUpdatedWatchHistory] = useState<updatedWatchHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const movieDetailsCache = useRef<Map<string, { data: entry; timestamp: number }>>(new Map())

  const getMovieDetails = useCallback(
    async (imdbId: string, type: 'movie' | 'series'): Promise<entry | null> => {
      const cached = movieDetailsCache.current.get(imdbId)
      if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
        return cached.data
      }

      try {
        const response = await fetch(`${API_CINE}/meta/${type}/${imdbId}.json`)
        if (!response.ok) {
          console.warn(`Failed to fetch details for ${imdbId}`)
          return null
        }

        const data = await response.json()
        const movieDetails: entry = data.meta

        movieDetailsCache.current.set(imdbId, {
          data: movieDetails,
          timestamp: Date.now()
        })

        return movieDetails
      } catch (error) {
        console.error(`Error fetching movie details for ${imdbId}:`, error)
        return null
      }
    },
    []
  )

  const fetchWatchHistory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('http://localhost:8080/api/users/me/watch-history', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch watch history')
      }

      const data = await response.json()
      const historyEntries: WatchHistoryEntry[] = data.watchHistory || []

      setWatchHistory(historyEntries)

      const enhancedEntries = await Promise.all(
        historyEntries.map(async (entry): Promise<updatedWatchHistoryEntry> => {
          const movieDetails = await getMovieDetails(
            entry.imdbID,
            entry.MediaType.toLowerCase() as 'movie' | 'series'
          )

          return {
            ...entry,
            movieDetails
          }
        })
      )

      setUpdatedWatchHistory(enhancedEntries)
    } catch (err) {
      console.error('Failed to fetch watch history:', err)
      setError(err instanceof Error ? err.message : 'Failed to load watch history')
    } finally {
      setLoading(false)
    }
  }, [token, getMovieDetails])

  useEffect(() => {
    if (token) {
      fetchWatchHistory()
    }
  }, [token, fetchWatchHistory])

  return {
    watchHistory,
    updatedWatchHistory,
    loading,
    error,
    refetch: fetchWatchHistory
  }
}
