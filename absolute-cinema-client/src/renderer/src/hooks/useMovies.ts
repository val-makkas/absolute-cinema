import { useState, useEffect, useCallback } from 'react'
import { entry } from '@/types'

const API_MANIFEST = 'https://v3-cinemeta.strem.io'

export function useMovies(searchQuery: string, type: 'movie' | 'series'): {
  movies: entry[]
  loading: boolean
  error: string | null
} {

  const [movies, setMovies] = useState<entry[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPopular = useCallback(async () => {
    console.log('fetchPopular called with type:', type)
    setLoading(true)
    setError(null)
    try {
      let res
      if (!type) {
        res = await fetch(`${API_MANIFEST}/catalog/movie/top.json`)
      } else {
        res = await fetch(`${API_MANIFEST}/catalog/${type}/top.json`)
      }
      if (!res.ok) throw new Error('Failed to fetch popular movies')
      const data = await res.json()
      console.log('Fetched data:', data)
      setMovies(Array.isArray(data.metas) ? data.metas : [])
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unknown error')
      }
      setMovies([])
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => {
    fetchPopular()
  }, [fetchPopular, type])

  return { movies, loading, error }
}
