import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { entry } from '@/types'
import { useMovies } from '@/hooks/useMovies'
import MovieList from '@/components/MovieList'

interface DiscoverPageProps {
  onMovieClick: (movie: entry) => void
}

export default function DiscoverPage({ onMovieClick }: DiscoverPageProps): React.ReactElement {
  const location = useLocation()

  const [search, setSearch] = useState<string>('')
  const [type, setType] = useState<'movie' | 'series'>('movie')
  const [catalog, setCatalog] = useState<'IMDB' | 'CINE' | 'PDM'>('CINE')

  const {
    movies,
    loading: moviesLoading,
    error: moviesError,
    loadMore
  } = useMovies(search, type, catalog)

  useEffect(() => {
    if (location.state?.searchQuery) {
      setSearch(location.state.searchQuery)
    }
  }, [location.state])

  return (
    <div className="flex-auto bg-black font-sans text-white">
      <div className="flex">
        <div className="flex-1 min-w-0">
          <main className="px-4 md:px-8 py-4 bg-black min-h-screen">
            <MovieList
              movies={movies}
              moviesLoading={moviesLoading}
              moviesError={moviesError}
              onMovieClick={onMovieClick}
              type={type}
              catalog={catalog}
              onCatalogChange={setCatalog}
              onTypeChange={setType}
              onLoadMore={loadMore}
            />
          </main>
        </div>
      </div>
    </div>
  )
}
