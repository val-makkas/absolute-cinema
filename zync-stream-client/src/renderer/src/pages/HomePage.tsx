import { entry } from '@/types'
import { Play, Info, Plus, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import useHomePage from '@/hooks/useHomePage'
import { updatedWatchHistoryEntry } from '@/hooks/useWatchHistory'
import ContentRow from '@/components/ContentRow'

interface HomePageProps {
  token: string
  onMovieClick: (movie: entry) => void
}

const HomePage = ({ token, onMovieClick }: HomePageProps): React.ReactElement => {
  const { featuredMovie, popularMovies, popularSeries, updatedWatchHistory, loading, error } =
    useHomePage(token)

  console.log('HomePage data:', {
    featuredMovie,
    popularMovies: popularMovies?.length,
    popularSeries: popularSeries?.length,
    updatedWatchHistory: updatedWatchHistory?.length,
    loading,
    error
  })

  const handlePlayItem = (item: entry | updatedWatchHistoryEntry): void => {
    if ('imdb_id' in item) {
      onMovieClick(item)
    } else if ('movieDetails' in item && item.movieDetails) {
      onMovieClick(item.movieDetails)
    }
  }

  const HeroSection: React.FC = () => {
    if (loading) {
      return (
        <section className="relative h-[70vh] mb-8 overflow-hidden">
          <Skeleton className="absolute inset-0 bg-white/10" />
          <div className="relative h-full flex items-center ml-15 px-4 md:px-6">
            <div className="max-w-3xl">
              <Skeleton className="h-8 w-64 mb-4 bg-white/10" />
              <Skeleton className="h-16 w-full mb-4 bg-white/10" />
              <Skeleton className="h-24 w-3/4 mb-8 bg-white/10" />
              <div className="flex gap-4">
                <Skeleton className="h-12 w-32 bg-white/10" />
                <Skeleton className="h-12 w-32 bg-white/10" />
              </div>
            </div>
          </div>
        </section>
      )
    }

    if (!featuredMovie) return null

    return (
      <section className="relative h-[70vh] mb-8 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={featuredMovie.poster}
            alt={featuredMovie.name}
            className="w-full h-full object-cover filter blur-sm scale-110"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/assets/missing.jpg'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
        </div>

        <div className="relative h-full flex items-center ml-15 px-4 md:px-6">
          <div className="max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-sm font-semibold uppercase tracking-wide text-yellow-400">
                Featured {featuredMovie.type === 'series' ? 'Series' : 'Movie'}
              </span>
              {featuredMovie.imdbRating && (
                <div className="flex items-center gap-1 bg-yellow-400/20 backdrop-blur-sm rounded-lg px-2 py-1">
                  <Star size={14} className="text-yellow-400" fill="currentColor" />
                  <span className="text-sm font-semibold text-yellow-400">
                    {featuredMovie.imdbRating}
                  </span>
                </div>
              )}
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black drop-shadow-2xl mb-6 bg-gradient-to-r from-white via-white to-gray-300 bg-clip-text text-transparent leading-tight">
              {featuredMovie.name}
            </h1>

            <p className="max-w-2xl text-base md:text-lg text-gray-200 drop-shadow-md mb-8 leading-relaxed line-clamp-3">
              {featuredMovie.description ||
                'Discover this amazing content and immerse yourself in an unforgettable experience.'}
            </p>

            <div className="flex flex-wrap gap-4">
              <Button
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-3 rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
                onClick={() => handlePlayItem(featuredMovie)}
              >
                <Play size={20} fill="currentColor" />
                Play Now
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 bg-black/50 backdrop-blur-sm border-white/30 text-white px-6 py-3 rounded-lg font-semibold hover:bg-black/70 transition-all duration-200"
                onClick={() => onMovieClick(featuredMovie)}
              >
                <Info size={20} />
                More Info
              </Button>
            </div>

            {featuredMovie.genre && featuredMovie.genre.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6">
                {featuredMovie.genre.slice(0, 3).map((genre) => (
                  <span
                    key={genre}
                    className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-3 py-1 rounded-full text-sm"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="ml-10 md:ml-12 mr-64 md:mr-72 min-h-screen relative z-5">
        <div className="relative">
          <HeroSection />

          {updatedWatchHistory.length > 0 && (
            <ContentRow
              onItemClick={handlePlayItem}
              title="Continue Watching"
              items={updatedWatchHistory}
              showProgress={true}
              loading={loading}
            />
          )}

          <ContentRow
            onItemClick={handlePlayItem}
            title="Popular Movies"
            items={popularMovies}
            loading={loading}
          />

          <ContentRow
            onItemClick={handlePlayItem}
            title="Popular Series"
            items={popularSeries}
            loading={loading}
          />

          <section className="px-4 md:px-6 ml-15 py-8">
            <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-6 rounded-xl cursor-pointer hover:scale-105 transition-transform duration-200 group">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Discover More</h3>
                  <Plus
                    size={24}
                    className="group-hover:rotate-90 transition-transform duration-300"
                  />
                </div>
                <p className="text-gray-200">Browse our complete catalog</p>
              </div>

              <div className="bg-gradient-to-br from-green-600 to-teal-600 p-6 rounded-xl cursor-pointer hover:scale-105 transition-transform duration-200 group">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Watch Party</h3>
                  <Plus
                    size={24}
                    className="group-hover:rotate-90 transition-transform duration-300"
                  />
                </div>
                <p className="text-gray-200">Watch with friends in sync</p>
              </div>

              <div className="bg-gradient-to-br from-orange-600 to-red-600 p-6 rounded-xl cursor-pointer hover:scale-105 transition-transform duration-200 group">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">My Library</h3>
                  <Plus
                    size={24}
                    className="group-hover:rotate-90 transition-transform duration-300"
                  />
                </div>
                <p className="text-gray-200">Organize your favorites</p>
              </div>
            </div>
          </section>

          <div className="h-20" />
        </div>
      </main>
    </div>
  )
}

export default HomePage
