import { useState, useEffect, useCallback } from 'react'
import { Movie } from '@/types'

const API_BASE = 'http://localhost:8080/api/metadata'

export function useMovies(searchQuery: string): {
  movies: Movie[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
} {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMovies = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url =
        searchQuery && searchQuery.length >= 3
          ? `${API_BASE}/movies/search?query=${encodeURIComponent(searchQuery)}`
          : `${API_BASE}/movies/popular`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch movies')
      const data = await res.json()
      setMovies(data)
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
  }, [searchQuery])

  useEffect(() => {
    fetchMovies()
  }, [fetchMovies])

  return { movies, loading, error, refetch: fetchMovies }
}
