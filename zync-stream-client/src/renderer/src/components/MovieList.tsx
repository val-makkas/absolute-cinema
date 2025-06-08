import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from '@/components/ui/select'
import { movieEntry, seriesEntry } from '@renderer/types'
import { useEffect, useState, useMemo } from 'react'
import { SearchResults } from '@renderer/hooks/useMovies'
import ContentRow from './ContentRow'

type Movie = movieEntry | seriesEntry

interface MovieListProps {
  movies: Movie[]
  moviesLoading: boolean
  moviesError?: string | null
  onMovieClick: (movie: Movie) => void
  type: 'movie' | 'series'
  search?: string
  catalog: 'IMDB' | 'CINE' | 'PDM'
  onCatalogChange: (catalog: 'IMDB' | 'CINE' | 'PDM') => void
  onTypeChange: (type: 'movie' | 'series') => void
  onLoadMore: () => void
  sortBy?: 'none' | 'released' | 'imdbRating' | 'popularity'
  onSortChange?: (sort: 'none' | 'released' | 'imdbRating' | 'popularity') => void
  searchResults?: SearchResults
}

export default function MovieList({
  movies,
  moviesLoading,
  moviesError,
  onMovieClick,
  type,
  search = '',
  catalog,
  onCatalogChange,
  onTypeChange,
  onLoadMore,
  sortBy = 'none',
  onSortChange,
  searchResults
}: MovieListProps): React.ReactElement {
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)

  const sortMovies = (
    movieList: Movie[],
    sortType: 'none' | 'released' | 'imdbRating' | 'popularity'
  ): Movie[] => {
    if (sortType === 'none') {
      return movieList
    }
    return [...movieList].sort((a, b) => {
      switch (sortType) {
        case 'released': {
          const dateA = new Date(a.releaseInfo || '1900-01-01').getTime()
          const dateB = new Date(b.releaseInfo || '1900-01-01').getTime()
          return dateB - dateA
        }
        case 'imdbRating': {
          const ratingA = parseFloat(a.imdbRating || '0')
          const ratingB = parseFloat(b.imdbRating || '0')
          return ratingB - ratingA
        }
        case 'popularity': {
          const popularityA = parseFloat(a.popularity.trakt || '0')
          const popularityB = parseFloat(b.popularity.trakt || '0')
          return popularityB - popularityA
        }
        default:
          return 0
      }
    })
  }

  useEffect(() => {
    if (!moviesLoading) {
      setIsLoadingMore(false)
    }
  }, [moviesLoading])

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout
    let lastFetchTime = 0
    const minTimeBetweenFetches = 2000

    function handleScroll(): void {
      if (scrollTimeout) clearTimeout(scrollTimeout)

      scrollTimeout = setTimeout(() => {
        if (moviesLoading || isLoadingMore || (search && search.length >= 3)) return

        const now = Date.now()
        if (now - lastFetchTime < minTimeBetweenFetches) return

        const scrollPosition = window.innerHeight + window.scrollY
        const documentHeight = document.body.offsetHeight
        const scrollThreshold = documentHeight - 150

        if (scrollPosition >= scrollThreshold) {
          setIsLoadingMore(true)
          lastFetchTime = now
          onLoadMore()
        }
      }, 200)
    }

    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeout) clearTimeout(scrollTimeout)
    }
  }, [moviesLoading, onLoadMore, isLoadingMore, search])

  const sortedMovies = useMemo(() => {
    return sortMovies(movies, sortBy)
  }, [movies, sortBy])

  if (search && search.length >= 3 && searchResults) {
    return (
      <main className="w-full min-h-screen flex flex-col justify-start pl-2 mt-15 pr-80 pb-12 pt-8 animate-fade-in relative">
        <div className="ml-20 mb-8">
          <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight mb-6">
            Search Results for &quot;{search}&quot;
          </h2>
        </div>

        {moviesError && (
          <div className="mb-4 w-full text-left text-red-400 font-semibold relative z-10 ml-20">
            {moviesError}
          </div>
        )}

        {searchResults.movies && searchResults.movies.length > 0 && (
          <ContentRow
            title="Movies"
            items={searchResults.movies}
            loading={moviesLoading}
            onItemClick={(item) => {
              onMovieClick(item as Movie)
            }}
          />
        )}

        {searchResults.series && searchResults.series.length > 0 && (
          <ContentRow
            title="Series"
            items={searchResults.series}
            loading={moviesLoading}
            onItemClick={(item) => {
              onMovieClick(item as Movie)
            }}
          />
        )}

        {!searchResults.movies?.length && !searchResults.series?.length && !moviesLoading && (
          <div className="text-center text-white/60 py-12 ml-20">
            No results found for &quot;{search}&quot;
          </div>
        )}
      </main>
    )
  }

  return (
    <main className="w-full min-h-screen flex flex-col justify-start pl-2 mt-15 pr-80 pb-12 pt-8 animate-fade-in relative">
      <div className="flex ml-20 flex-row justify-between items-center mb-5">
        <div className="flex flex-row gap-4 items-center">
          <>
            <div className="relative z-10 flex flex-col gap-2">
              <label className="text-sm font-medium text-white/80">Catalog:</label>
              <Select value={catalog} onValueChange={onCatalogChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Catalog" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-10">
                  <SelectItem value="CINE">Cinemeta</SelectItem>
                  <SelectItem value="IMDB">IMDB</SelectItem>
                  <SelectItem value="PDM">Public Domain Movies</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative z-10 flex flex-col gap-2">
              <label className="text-sm font-medium text-white/80">Type:</label>
              <Select value={type} onValueChange={onTypeChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-10">
                  <SelectItem value="movie">Movies</SelectItem>
                  <SelectItem value="series">Series</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        </div>

        {(!search || search.length < 3) && (
          <div className="relative z-10 flex flex-col gap-2 mr-5">
            <label className="text-sm font-medium text-white/80">Sort By:</label>
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-10">
                <SelectItem value="none">Default</SelectItem>
                <SelectItem value="popularity">Popularity</SelectItem>
                <SelectItem value="released">Release Date</SelectItem>
                <SelectItem value="imdbRating">IMDB Rating</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {moviesError && (
        <div className="mb-4 w-full text-left text-red-400 font-semibold relative z-10">
          {moviesError}
        </div>
      )}
      <div
        className="
          grid
          w-full
          grid-cols-[repeat(auto-fit,minmax(180px,1fr))]
          gap-8
          pl-20    /* align with your filters */
          pr-4     /* shrink right padding to reduce unused space */
          relative
          z-8
        "
      >
        {moviesLoading
          ? Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] rounded-2xl animate-pulse shadow-xl w-full max-w-[260px] ring-1 ring-white/10 relative overflow-hidden"
              >
                <div className="absolute inset-0 opacity-70"></div>
                <Skeleton className="absolute inset-0 w-full h-full rounded-2xl" />
              </div>
            ))
          : (Array.isArray(sortedMovies) ? sortedMovies : []).map((m, i) => (
              <button
                key={`${m.imdb_id}${i}`}
                className="
                  group
                  aspect-[2/3]
                  rounded-2xl
                  overflow-hidden
                  cursor-pointer
                  relative
                  w-full
                  transition-all
                  duration-300
                  hover:scale-[1.04]
                  hover:z-20
                  focus:outline-none
                "
                style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
                onClick={() => onMovieClick(m)}
              >
                <img
                  src={m.poster}
                  alt={m.name}
                  className="absolute inset-0 w-full h-full object-cover transition-all duration-300 group-hover:brightness-110"
                  draggable={false}
                />
              </button>
            ))}
      </div>
    </main>
  )
}
