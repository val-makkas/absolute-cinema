import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Source, entry } from '@/types'
import { useMovieDetails } from '@/hooks/useMovieDetails'

interface UseDetailsModalReturn {
  playerSource: Source | null
  selectedMovie: entry | null
  showDetailsModal: boolean
  details: any
  detailsLoading: boolean
  handleMovieClick: (movie: entry) => void
  handleWatchAlone: (details: any, selectedSource: Source) => void
  handleCloseDetails: () => void
  handleAddExtension: (setExtensionsOpen: (open: boolean) => void) => void
  clearPlayerSource: () => void
}

export default function useDetailsModal(): UseDetailsModalReturn {
  const [playerSource, setPlayerSource] = useState<Source | null>(null)
  const [selectedMovie, setSelectedMovie] = useState<entry | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false)

  const navigate = useNavigate()

  const {
    details,
    loading: detailsLoading,
    fetchDetails,
    isCached,
    setDetailsFromCache
  } = useMovieDetails()

  useEffect(() => {
    if (selectedMovie && !detailsLoading && details && !showDetailsModal) {
      setShowDetailsModal(true)
    }
  }, [detailsLoading, details, selectedMovie, showDetailsModal])

  const handleMovieClick = useCallback((movie: entry): void => {
    setSelectedMovie(movie)
    const id = movie.id || movie.imdb_id
    if (id && isCached(id)) {
      setDetailsFromCache(id)
      setShowDetailsModal(true)
    } else if (id) {
      setShowDetailsModal(false)
      fetchDetails(id, movie.type as 'movie' | 'series')
    } else {
      alert('Movie identifiers are missing.')
    }
  }, [])

  const handleWatchAlone = useCallback(
    (details: any, selectedSource: Source): void => {
      if (details?.id && selectedSource?.infoHash) {
        setShowDetailsModal(false)
        setPlayerSource(selectedSource)
        navigate('/watch-alone', { state: { selectedSource, details } })
      } else {
        alert('No valid streaming source selected.')
      }
    },
    [navigate]
  )

  const handleCloseDetails = useCallback((): void => {
    setShowDetailsModal(false)
    setSelectedMovie(null)
  }, [])

  const handleAddExtension = useCallback((setExtensionsOpen: (open: boolean) => void): void => {
    setShowDetailsModal(false)
    setSelectedMovie(null)
    setExtensionsOpen(true)
  }, [])

  const clearPlayerSource = useCallback(() => {
    setPlayerSource(null)
  }, [])

  return {
    // State
    playerSource,
    selectedMovie,
    showDetailsModal,
    details,
    detailsLoading,

    // Handlers
    handleMovieClick,
    handleWatchAlone,
    handleCloseDetails,
    handleAddExtension,
    clearPlayerSource
  }
}
