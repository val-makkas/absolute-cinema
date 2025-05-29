import { WatchHistoryEntry } from '@renderer/types'
import { useCallback, useEffect, useState } from 'react'

const API_BASE = 'http://localhost:8080/api/users'

export default function useWatchHistory(token: string): {
  watchHistory: WatchHistoryEntry[]
  watchHistoryItem: WatchHistoryEntry | null
  loading: boolean
  error: string | null
  updateWatchHistory: (entry: WatchHistoryEntry) => Promise<void>
  getWatchHistoryItem: (imdb_id: string, season?: number, episode?: number) => Promise<void>
} {
  const [watchHistory, setWatchHistory] = useState<WatchHistoryEntry[]>([])
  const [watchHistoryItem, setWatchHistoryItem] = useState<WatchHistoryEntry | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWatchHistory = useCallback(async () => {
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/me/watch-history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setLoading(false)
        const watchHistoryData = await res.json()
        setWatchHistory(watchHistoryData)
        localStorage.setItem('watch_history', JSON.stringify(watchHistoryData))
      } else {
        setLoading(false)
        setError('Failed to fetch watch history data.')
      }
    } catch (err) {
      setLoading(false)
      setError('Possible network error.')
      console.log(err)
    }
  }, [token])

  const updateWatchHistory = useCallback(
    async (entry: WatchHistoryEntry) => {
      if (!token) return

      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`${API_BASE}/me/watch-history`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            entry
          })
        })
        if (res.ok) {
          setLoading(false)
        } else {
          setLoading(false)
          setError('Failed to update watch history data.')
        }
      } catch (err) {
        setLoading(false)
        setError('Possible network error.')
        console.log(err)
      }
    },
    [token]
  )

  const getWatchHistoryItem = useCallback(
    async (imdb_id: string, season?: number, episode?: number) => {
      if (!token) return

      setLoading(true)
      setError(null)

      try {
        let res: Response
        if (season && episode) {
          res = await fetch(
            `${API_BASE}/me/watch-history/${encodeURIComponent(imdb_id)}?season=${encodeURIComponent(season)}&episode=${encodeURIComponent(episode)}`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          )
        } else {
          res = await fetch(`${API_BASE}/me/watch-history/${imdb_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        }
        if (res.ok) {
          setLoading(false)
          const watchHistoryItemData = await res.json()
          setWatchHistoryItem(watchHistoryItemData)
        } else {
          setLoading(false)
          setError('Failed to fetch watch history data.')
        }
      } catch (err) {
        setLoading(false)
        setError('Possible network error.')
        console.log(err)
      }
    },
    [token]
  )

  useEffect(() => {
    fetchWatchHistory()
  }, [token])

  return {
    watchHistory,
    watchHistoryItem,
    loading,
    error,
    updateWatchHistory,
    getWatchHistoryItem
  }
}
