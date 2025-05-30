import { useState, useEffect, useCallback, useRef } from 'react'
import { entry, WatchHistoryEntry } from '@/types'
import useWatchHistory from './useWatchHistory'

const API_IMDB = import.meta.env.VITE_API_IMDB
const API_CINE = import.meta.env.VITE_API_CINE
const API_PDM = import.meta.env.VITE_PUBLIC_MOVIES

const EXPIRY = 15 * 60 * 1000
const MAX_SIZE = 50

export function useMovies(
  token: string,
  searchQuery: string,
  type: 'movie' | 'series',
  catalog: 'IMDB' | 'CINE' | 'PDM'
): {
  movies: entry[]
  loading: boolean
  error: string | null
  loadMore: () => void
  searching: boolean
} {
  const [movies, setMovies] = useState<entry[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [searching, setSearching] = useState<boolean>(false)

  const browseCache = useRef<Map<string, { data: entry[]; timestamp: number }>>(new Map())
  const searchCache = useRef<Map<string, { data: entry[]; timestamp: number }>>(new Map())

  const getCacheKey = useCallback(
    (isSearch: boolean, query: string = '', pageNum: number = 1) => {
      return isSearch
        ? `search-${query}-${type}-${catalog}`
        : `browse-${type}-${catalog}-page${pageNum}`
    },
    [catalog, type]
  )

  const getFromCache = (key: string): entry[] | null => {
    const cache = key.startsWith('search') ? searchCache : browseCache
    const entry = cache.current.get(key)

    if (!entry) return null

    if (Date.now() - entry.timestamp > EXPIRY) {
      cache.current.delete(key)
      return null
    }

    return entry.data
  }

  const saveToCache = (key: string, data: entry[]): void => {
    const cache = key.startsWith('search') ? searchCache : browseCache

    cache.current.set(key, {
      data,
      timestamp: Date.now()
    })

    if (cache.current.size > MAX_SIZE) {
      let oldKey = ''
      let oldTime = Infinity

      for (const [k, v] of cache.current.entries()) {
        if (v.timestamp < oldTime) {
          oldKey = k
          oldTime = v.timestamp
        }
      }

      if (oldKey) {
        cache.current.delete(oldKey)
      }
    }
  }

  const searchCatalog = useCallback(
    async (query: string) => {
      if (query !== '' && query.length >= 3) {
        setSearching(true)
        const cacheKey = getCacheKey(true, query)
        const cacheData = getFromCache(cacheKey)

        if (cacheData) {
          setMovies(cacheData)
          setSearching(false)
          return
        }

        try {
          const endpoints: string[] = []

          endpoints.push(`${API_CINE}/catalog/movie/top/search=${query}.json`)

          endpoints.push(`${API_CINE}/catalog/series/top/search=${query}.json`)

          const results = await Promise.all(
            endpoints.map(async (endpoint) => {
              const res = await fetch(endpoint)
              if (!res.ok) throw new Error(`Failed to search: ${res.status}`)
              return res.json()
            })
          )

          let allMetas: entry[] = []
          results.forEach((data) => {
            if (data.metas && Array.isArray(data.metas)) {
              allMetas = [...allMetas, ...data.metas]
            }
          })

          const uniqueMetas = allMetas.filter(
            (meta, index, self) => index === self.findIndex((m) => m.id === meta.id)
          )

          saveToCache(cacheKey, uniqueMetas)

          setMovies(uniqueMetas)
          setError(null)
        } catch (err) {
          console.error('Search error:', err)
          setError(err instanceof Error ? err.message : 'Search failed')
        } finally {
          setSearching(false)
        }
      }
    },
    [getCacheKey]
  )

  const fetchPopular = useCallback(
    async (page: number) => {
      setLoading(true)
      setError(null)

      const cacheKey = getCacheKey(false, '', page)
      const cacheData = getFromCache(cacheKey)

      if (cacheData) {
        setMovies(page === 1 ? cacheData : [...movies, ...cacheData])
        setLoading(false)
        return
      }

      let endpoint = ''
      if (catalog === 'CINE') {
        endpoint = `${API_CINE}/catalog/${type}/top/skip=${(page - 1) * 50}.json`
      } else if (catalog === 'PDM') {
        endpoint = `${API_PDM}/catalog/${type}/top/skip=${(page - 1) * 50}.json`
      } else {
        endpoint = `${API_IMDB}/catalog/${type}/IMDB.json`
      }

      try {
        const response = await fetch(endpoint)

        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
        const data = await response.json()

        const newMetas: entry[] = data.metas

        const updatedMovies = page === 1 ? newMetas : [...movies, ...newMetas]

        saveToCache(cacheKey, newMetas)

        setMovies(updatedMovies)
        setError(null)
      } catch (err) {
        console.log(err)
      } finally {
        setLoading(false)
      }
    },
    [type, catalog, movies, getCacheKey]
  )

  const loadMore = (): void => {
    if (loading) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchPopular(nextPage)
  }

  const { watchHistory } = useWatchHistory(token)

  useEffect(() => {
    setPage(1)
    if (!searchQuery) fetchPopular(1)
  }, [fetchPopular, searchQuery])

  useEffect(() => {
    if (searchQuery && searchQuery.length >= 3) {
      searchCatalog(searchQuery)
    } else if (searchQuery === '') {
      fetchPopular(1)
    }
  }, [fetchPopular, searchCatalog, searchQuery])

  return {
    movies,
    loading,
    error,
    loadMore,
    searching
  }
}
