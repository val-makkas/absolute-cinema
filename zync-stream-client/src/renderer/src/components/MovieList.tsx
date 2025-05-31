import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from '@/components/ui/select'
import { movieEntry, seriesEntry } from '@renderer/types'
import { useEffect, useState } from 'react'

type Movie = movieEntry | seriesEntry

interface MovieListProps {
  movies: Movie[]
  moviesLoading: boolean
  moviesError?: string | null
  onMovieClick: (movie: Movie) => void
  type: 'movie' | 'series'
  catalog: 'IMDB' | 'CINE' | 'PDM'
  onCatalogChange: (catalog: 'IMDB' | 'CINE' | 'PDM') => void
  onTypeChange: (type: 'movie' | 'series') => void
  onLoadMore: () => void
}

export default function MovieList({
  movies,
  moviesLoading,
  moviesError,
  onMovieClick,
  type,
  catalog,
  onCatalogChange,
  onTypeChange,
  onLoadMore
}: MovieListProps): React.ReactElement {
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout
    let lastFetchTime = 0
    const minTimeBetweenFetches = 2000 // 2 seconds minimum between fetches

    function handleScroll(): void {
      if (scrollTimeout) clearTimeout(scrollTimeout)

      scrollTimeout = setTimeout(() => {
        if (moviesLoading || isLoadingMore) return

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
  }, [moviesLoading, onLoadMore, isLoadingMore])

  return (
    <main className="w-full min-h-screen flex flex-col justify-start pl-2 mt-15 pr-80 pb-12 pt-8 animate-fade-in relative">
      <div className="w-full relative z-10 mb-6">
        <div className="flex ml-20 flex-row gap-4 items-center">
          <div className="relative z-10">
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
          <div className="relative z-15">
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
        </div>
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
                className="aspect-[2/3] rounded-2xl animate-pulse shadow-xl bg-black/80 w-full max-w-[260px] ring-1 ring-white/10 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-transparent to-blue-600/20 opacity-70"></div>
                <Skeleton className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-white/5 to-black/20" />
              </div>
            ))
          : (Array.isArray(movies) ? movies : []).map((m, i) => (
              <button
                key={`${m.imdb_id}${i}`}
                className="
                  group
                  aspect-[2/3]
                  rounded-2xl
                  overflow-hidden
                  bg-black/80
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
