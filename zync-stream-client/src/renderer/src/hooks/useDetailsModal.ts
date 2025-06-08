import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Source, entry } from '@/types'
import { useMovieDetails } from '@/hooks/useMovieDetails'

interface UseDetailsModalReturn {
  playerSource: Source | null
  selectedMovie: entry | null
  showDetailsModal: boolean
  details
  detailsLoading: boolean
  setShowDetailsModal: (flag: boolean) => void
  handleMovieClick: (movie: entry) => void
  handleWatchAlone: (details, selectedSource: Source, episode) => void
  handleWatchParty: (details, selectedSource: Source, episode) => void
  handleCloseDetails: () => void
  handleAddExtension: (setExtensionsOpen: (open: boolean) => void) => void
  clearPlayerSource: () => void
  selectedEpisode: any
  setSelectedEpisode: (episode: any) => void
  restorePreviousModal: () => void
}

export default function useDetailsModal(
  selectMovieForParty?: (movie: any, source: any) => void
): UseDetailsModalReturn {
  const [playerSource, setPlayerSource] = useState<Source | null>(null)
  const [selectedMovie, setSelectedMovie] = useState<entry | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false)
  const [selectedEpisode, setSelectedEpisode] = useState<any>(null)

  const [previousModalState, setPreviousModalState] = useState<{
    movie: entry | null
    details: any
    episode: any
  }>({
    movie: null,
    details: null,
    episode: null
  })

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
  }, [detailsLoading, details, selectedMovie])

  const handleMovieClick = useCallback(
    (movie: entry): void => {
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
    },
    [isCached, setDetailsFromCache, fetchDetails]
  )

  const handleWatchAlone = useCallback(
    (details, selectedSource: Source, episode?: any): void => {
      if (details?.id && selectedSource?.infoHash) {
        setPreviousModalState({
          movie: selectedMovie,
          details,
          episode: selectedEpisode
        })

        setShowDetailsModal(false)
        setPlayerSource(selectedSource)
        navigate('/watch-alone', {
          state: {
            selectedSource: {
              infoHash: selectedSource.infoHash,
              fileIdx: selectedSource.fileIdx || 0,
              quality: selectedSource.quality || selectedSource.title
            },
            details: {
              title: details.name || details.title,
              year: 'year' in details ? details.year : details.releaseInfo,
              poster: details.poster,
              imdb_id: details.imdb_id || details.id,
              type: details.type || 'movie',
              season: episode?.season || null,
              episode: episode?.number,
              episodeTitle: episode?.title
            }
          }
        })
      } else {
        alert('No valid streaming source selected.')
      }
    },
    [navigate]
  )

  const handleWatchParty = useCallback(
    (details: any, selectedSource: Source, episode?: any): void => {
      if (details?.id && selectedSource?.infoHash) {
        setPreviousModalState({
          movie: selectedMovie,
          details,
          episode: selectedEpisode
        })

        setShowDetailsModal(false)
        setPlayerSource(selectedSource)
        if (selectMovieForParty) {
          selectMovieForParty(
            {
              title: details.name || details.title,
              year: 'year' in details ? details.year : details.releaseInfo,
              poster: details.poster,
              imdb_id: details.imdb_id || details.id,
              type: details.type || 'movie',
              season: episode?.season,
              episode: episode?.number,
              episodeTitle: episode?.title,
              genre: details.genre
            },
            {
              infoHash: selectedSource.infoHash,
              fileIdx: selectedSource.fileIdx || 0,
              quality: selectedSource.quality || selectedSource.title
            }
          )
        }
      } else {
        alert('No valid streaming source selected.')
      }
    },
    [selectMovieForParty, selectedEpisode, selectedMovie]
  )
  const handleCloseDetails = useCallback((): void => {
    setShowDetailsModal(false)
    setSelectedMovie(null)
    setSelectedEpisode(null)
    setPreviousModalState({ movie: null, details: null, episode: null })
  }, [])

  const handleAddExtension = useCallback((setExtensionsOpen: (open: boolean) => void): void => {
    setShowDetailsModal(false)
    setSelectedMovie(null)
    setExtensionsOpen(true)
  }, [])

  const clearPlayerSource = useCallback(() => {
    setPlayerSource(null)
  }, [])

  const restorePreviousModal = useCallback(() => {
    if (previousModalState.movie && previousModalState.details) {
      setSelectedMovie(previousModalState.movie)
      setSelectedEpisode(previousModalState.episode)
      setShowDetailsModal(true)
    }
  }, [previousModalState])

  return {
    playerSource,
    selectedMovie,
    showDetailsModal,
    details: details || previousModalState,
    detailsLoading,

    setShowDetailsModal,
    handleMovieClick,
    handleWatchAlone,
    handleWatchParty,
    handleCloseDetails,
    handleAddExtension,
    clearPlayerSource,

    selectedEpisode,
    setSelectedEpisode,
    restorePreviousModal
  }
}
