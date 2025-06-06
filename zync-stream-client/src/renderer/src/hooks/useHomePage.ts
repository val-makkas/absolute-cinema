import { useState, useEffect, useCallback, useRef } from 'react'
import { entry } from '@/types'
import useWatchHistory, { updatedWatchHistoryEntry } from './useWatchHistory'

const API_CINE = import.meta.env.VITE_API_CINE
const EXPIRY = 2 * 60 * 60 * 1000
const MAX_SIZE = 50

const cache = new Map<string, { data: { movies: entry[]; series: entry[] }; timestamp: number }>()

interface UseHomePageReturn {
  featuredMovie: entry | null
  popularMovies: entry[]
  popularSeries: entry[]
  updatedWatchHistory: updatedWatchHistoryEntry[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export default function useHomePage(token: string): UseHomePageReturn {
  const [featuredMovie, setFeaturedMovie] = useState<entry | null>(null)
  const [popularMovies, setPopularMovies] = useState<entry[]>([])
  const [popularSeries, setPopularSeries] = useState<entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const hasFetchedRef = useRef(false)
  const previousTokenRef = useRef<string | null>(null)

  const {
    updatedWatchHistory,
    loading: watchHistoryLoading,
    error: watchHistoryError
  } = useWatchHistory(token)

  const getCacheKey = useCallback(() => {
    return 'homepage-data'
  }, [])

  const getFromCache = (key: string): { movies: entry[]; series: entry[] } | null => {
    const entry = cache.get(key)

    if (!entry) {
      return null
    }

    if (Date.now() - entry.timestamp > EXPIRY) {
      cache.delete(key)
      return null
    }

    return entry.data
  }

  const saveToCache = (key: string, data: { movies: entry[]; series: entry[] }): void => {
    cache.set(key, {
      data,
      timestamp: Date.now()
    })

    if (cache.size > MAX_SIZE) {
      let oldKey = ''
      let oldTime = Infinity

      for (const [k, v] of cache.entries()) {
        if (v.timestamp < oldTime) {
          oldKey = k
          oldTime = v.timestamp
        }
      }

      if (oldKey) {
        cache.delete(oldKey)
      }
    }
  }

  const fetchPopularContent = useCallback(
    async (forceRefresh = false) => {
      setLoading(true)
      setError(null)

      const cacheKey = getCacheKey()

      if (!forceRefresh) {
        const cacheData = getFromCache(cacheKey)
        if (cacheData) {
          setPopularMovies(cacheData.movies)
          setPopularSeries(cacheData.series)

          const random = Math.floor(Math.random() * 10)
          if (Math.random() > 0.5) {
            setFeaturedMovie(cacheData.series[random])
          } else {
            setFeaturedMovie(cacheData.movies[random])
          }

          setLoading(false)
          return
        }
      }
      try {
        const [moviesResponse, seriesResponse] = await Promise.all([
          fetch(`${API_CINE}/catalog/movie/top.json`),
          fetch(`${API_CINE}/catalog/series/top.json`)
        ])
        if (!moviesResponse.ok || !seriesResponse.ok) {
          throw new Error('Failed to fetch popular content')
        }

        const [moviesData, seriesData] = await Promise.all([
          moviesResponse.json(),
          seriesResponse.json()
        ])

        const movies: entry[] = moviesData.metas
        const series: entry[] = seriesData.metas

        setPopularMovies(movies)
        setPopularSeries(series)

        const random = Math.floor(Math.random() * 10)
        if (Math.random() > 0.5) {
          const res = await fetch(`${API_CINE}/meta/movie/${movies[random].imdb_id}.json`)
          if (!res.ok) {
            setFeaturedMovie(movies[random])
          } else {
            const data = await res.json()
            setFeaturedMovie(data.meta)
          }
        } else {
          const res = await fetch(`${API_CINE}/meta/series/${series[random].imdb_id}.json`)
          if (!res.ok) {
            setFeaturedMovie(series[random])
          } else {
            const data = await res.json()
            setFeaturedMovie(data.meta)
          }
        }

        saveToCache(cacheKey, { movies, series })
      } catch (err) {
        console.error('Failed to fetch popular content:', err)
        setError(err instanceof Error ? err.message : 'Failed to load popular content')
      } finally {
        setLoading(false)
      }
    },
    [getCacheKey]
  )

  const refetch = useCallback(() => {
    hasFetchedRef.current = false
    fetchPopularContent(true)
  }, [fetchPopularContent])

  useEffect(() => {
    if (!hasFetchedRef.current && API_CINE) {
      hasFetchedRef.current = true
      fetchPopularContent()
    } else if (!API_CINE) {
      setError('API configuration missing')
      setLoading(false)
    }
  }, [fetchPopularContent])

  useEffect(() => {
    if (previousTokenRef.current !== null && previousTokenRef.current !== token) {
      cache.clear()
      hasFetchedRef.current = false
    }
    previousTokenRef.current = token
  }, [token])

  const isLoading = loading || watchHistoryLoading
  const combinedError = watchHistoryError || error

  return {
    featuredMovie,
    popularMovies,
    popularSeries,
    updatedWatchHistory,
    loading: isLoading,
    error: combinedError,
    refetch
  }
}
