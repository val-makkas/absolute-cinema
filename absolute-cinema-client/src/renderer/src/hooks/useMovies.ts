import { useState, useEffect, useCallback } from 'react'
import { entry } from '@/types'

const API_MANIFEST = import.meta.env.VITE_API_MANIFEST

export function useMovies(
  searchQuery: string,
  type: 'movie' | 'series'
): {
  movies: entry[]
  loading: boolean
  error: string | null
  loadMore: () => void
} {
  const [movies, setMovies] = useState<entry[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const fetchPopular = useCallback(
    async (page: number) => {
      console.log('fetchPopular called with type:', type)
      setLoading(true)
      setError(null)
      const skip = 50 * page - 50
      if (skip <= 200) {
        try {
          let res
          if (!type) {
            res = await fetch(`${API_MANIFEST}/catalog/movie/top/skip=${skip}.json`)
          } else {
            res = await fetch(`${API_MANIFEST}/catalog/${type}/top/skip=${skip}.json`)
          }
          if (!res.ok) throw new Error('Failed to fetch popular movies')
          const data = await res.json()
          console.log('Fetched data:', data)
          if (page === 1) {
            setMovies(Array.isArray(data.metas) ? data.metas : [])
          } else {
            setTimeout(() => {
              setLoading(false)
            }, 1000)
            setMovies((prevMov) => [...prevMov, ...data.metas])
          }
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
      } else {
        setLoading(false)
      }
    },
    [type]
  )

  const loadMore = (): void => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchPopular(nextPage)
  }

  useEffect(() => {
    setPage(1)
    fetchPopular(1)
  }, [fetchPopular, type])

  return { movies, loading, error, loadMore }
}
