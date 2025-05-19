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
  onTypeChange: (type: 'movie' | 'series') => void
  onLoadMore: () => void
}

export default function MovieList({
  movies,
  moviesLoading,
  moviesError,
  onMovieClick,
  type,
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
        const scrollThreshold = documentHeight - 300 // 300px from bottom

        if (scrollPosition >= scrollThreshold) {
          setIsLoadingMore(true)
          lastFetchTime = now
          onLoadMore()

          // Force scroll up slightly to prevent immediate re-trigger
          setTimeout(() => {
            window.scrollTo({
              top: window.scrollY - 10,
              behavior: 'auto'
            })
            setIsLoadingMore(false)
          }, 100)
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
    <main className="w-full min-h-screen flex flex-col items-center justify-start px-4 pb-12 pt-8 animate-fade-in relative">
      <div className="mb-6 w-full max-w-[300px]">
        <Select value={type} onValueChange={onTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent position="popper" portalContainer={document.body}>
            <SelectItem value="movie">Movies</SelectItem>
            <SelectItem value="series">Series</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {moviesError && (
        <div className="mb-4 w-full text-center text-red-400 font-semibold z-8">{moviesError}</div>
      )}
      <div
        className="grid w-full max-w-[1200px] mx-auto relative z-8"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '2rem',
          justifyItems: 'center',
          alignItems: 'start'
        }}
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
                key={m.imdb_id || i}
                className="group aspect-[2/3] rounded-2xl overflow-hidden bg-black/80 cursor-pointer relative w-full max-w-[260px] transition-all duration-300 hover:scale-[1.04] hover:z-8 focus:outline-none"
                style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
                onClick={() => onMovieClick(m)}
              >
                {/* Movie poster */}
                <img
                  src={m.poster}
                  alt={m.name}
                  className="absolute inset-0 w-full h-full object-cover transition-all duration-300 group-hover:brightness-110"
                  draggable={false}
                />
                {/* Top gradient border on hover */}
                <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-purple-600 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>

                {/* Subtle inner border */}
                <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] rounded-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                {/* Subtle outer glow on hover */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-purple-600/0 to-blue-600/0 group-hover:from-purple-600/20 group-hover:to-blue-600/20 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-300 -z-8 group-hover:shadow-[0_0_20px_rgba(120,87,255,0.3)]"></div>

                {/* Play indicator on hover */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 border border-white/20">
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[16px] border-l-white/90 border-b-[8px] border-b-transparent ml-1"></div>
                </div>
                {/* Bottom gradient for text */}
                <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black via-black/30 to-transparent transform transition-all duration-300 group-hover:opacity-50" />
              </button>
            ))}
      </div>
    </main>
  )
}
