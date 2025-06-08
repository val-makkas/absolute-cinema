import { useState, useEffect } from 'react'
import { entry } from '@/types'
import { useMovies } from '@/hooks/useMovies'
import MovieList from '@/components/MovieList'

interface DiscoverPageProps {
  token: string
  onMovieClick: (movie: entry) => void
  searchQuery?: string
}

export default function DiscoverPage({
  token,
  onMovieClick,
  searchQuery
}: DiscoverPageProps): React.ReactElement {
  const [search, setSearch] = useState<string>('')
  const [type, setType] = useState<'movie' | 'series'>('movie')
  const [catalog, setCatalog] = useState<'IMDB' | 'CINE' | 'PDM'>('CINE')
  const [sortBy, setSortBy] = useState<'none' | 'released' | 'imdbRating' | 'popularity'>('none')

  const {
    movies,
    loading,
    error: moviesError,
    loadMore,
    searchResults
  } = useMovies(token, search, type, catalog)

  const handleSortChange = (newSort: 'none' | 'released' | 'imdbRating' | 'popularity'): void => {
    setSortBy(newSort)
  }

  useEffect(() => {
    if (searchQuery) {
      setSearch(searchQuery)
      setSortBy('released')
    } else {
      setSearch('')
    }
  }, [searchQuery])

  return (
    <div className="flex-auto font-sans text-white">
      <div className="flex">
        <div className="flex-1 min-w-0">
          <main className="px-4 md:px-8 py-4 bg-black min-h-screen">
            <MovieList
              movies={movies}
              moviesLoading={loading}
              moviesError={moviesError}
              onMovieClick={onMovieClick}
              type={type}
              search={search}
              catalog={catalog}
              onCatalogChange={setCatalog}
              onTypeChange={setType}
              onLoadMore={loadMore}
              sortBy={sortBy}
              onSortChange={handleSortChange}
              searchResults={searchResults}
            />
          </main>
        </div>
      </div>
    </div>
  )
}
