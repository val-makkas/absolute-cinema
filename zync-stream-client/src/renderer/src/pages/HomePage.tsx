import { useRef } from 'react'
import { entry, WatchHistoryEntry, movieEntry } from '@/types'
import { Play, Info, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

const isEntry = (item: entry | WatchHistoryEntry): item is entry => {
  return 'name' in item && 'poster' in item && 'description' in item
}

const isWatchHistoryEntry = (item: entry | WatchHistoryEntry): item is WatchHistoryEntry => {
  return 'imdbID' in item && 'PercentageWatched' in item
}

const isMovieEntry = (item: entry): item is movieEntry => {
  return 'year' in item
}

const placeholderLibrary: movieEntry[] = [
  {
    imdb_id: 'tt1375666',
    id: 'lib1',
    moviedb_id: '27205',
    imdbRating: 8.8,
    name: 'Inception',
    type: 'movie',
    cast: ['Leonardo DiCaprio', 'Marion Cotillard', 'Tom Hardy'],
    director: ['Christopher Nolan'],
    description:
      'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
    country: 'USA',
    genre: ['Action', 'Sci-Fi', 'Thriller'],
    poster:
      'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg',
    background: '',
    logo: '',
    runtime: '148 min',
    trailerStreams: [],
    awards: 'Won 4 Oscars',
    year: '2010'
  },
  {
    imdb_id: 'tt0111161',
    id: 'lib2',
    moviedb_id: '278',
    imdbRating: 9.3,
    name: 'The Shawshank Redemption',
    type: 'movie',
    cast: ['Tim Robbins', 'Morgan Freeman'],
    director: ['Frank Darabont'],
    description:
      'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
    country: 'USA',
    genre: ['Drama'],
    poster:
      'https://m.media-amazon.com/images/M/MV5BNDE3ODcxYzMtY2YzZC00NmNlLWJiNDMtZDViZWM2MzIxZDYwXkEyXkFqcGdeQXVyNjAwNDUxODI@._V1_SX300.jpg',
    background: '',
    logo: '',
    runtime: '142 min',
    trailerStreams: [],
    awards: 'Nominated for 7 Oscars',
    year: '1994'
  },
  {
    imdb_id: 'tt0468569',
    id: 'lib3',
    moviedb_id: '155',
    imdbRating: 9.0,
    name: 'The Dark Knight',
    type: 'movie',
    cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart'],
    director: ['Christopher Nolan'],
    description:
      'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.',
    country: 'USA',
    genre: ['Action', 'Crime', 'Drama'],
    poster:
      'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_SX300.jpg',
    background: '',
    logo: '',
    runtime: '152 min',
    trailerStreams: [],
    awards: 'Won 2 Oscars',
    year: '2008'
  },
  {
    imdb_id: 'tt0109830',
    id: 'lib4',
    moviedb_id: '13',
    imdbRating: 8.9,
    name: 'Forrest Gump',
    type: 'movie',
    cast: ['Tom Hanks', 'Robin Wright', 'Gary Sinise'],
    director: ['Robert Zemeckis'],
    description:
      'The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold from the perspective of an Alabama man.',
    country: 'USA',
    genre: ['Drama', 'Romance'],
    poster:
      'https://m.media-amazon.com/images/M/MV5BNWIwODRlZTUtY2U3ZS00Yzg1LWJhNzYtMmZiYmEyNmU1NjMzXkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_SX300.jpg',
    background: '',
    logo: '',
    runtime: '142 min',
    trailerStreams: [],
    awards: 'Won 6 Oscars',
    year: '1994'
  },
  {
    imdb_id: 'tt0816692',
    id: 'lib5',
    moviedb_id: '157336',
    imdbRating: 8.4,
    name: 'Interstellar',
    type: 'movie',
    cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain'],
    director: ['Christopher Nolan'],
    description:
      "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    country: 'USA',
    genre: ['Adventure', 'Drama', 'Sci-Fi'],
    poster:
      'https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFmMjktY2FiMmZkNWIyODZiXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg',
    background: '',
    logo: '',
    runtime: '169 min',
    trailerStreams: [],
    awards: 'Won 1 Oscar',
    year: '2014'
  }
]

const placeholderMyLists: movieEntry[] = [
  {
    imdb_id: 'tt0137523',
    id: 'list1',
    moviedb_id: '550',
    imdbRating: 8.8,
    name: 'Fight Club',
    type: 'movie',
    cast: ['Brad Pitt', 'Edward Norton', 'Helena Bonham Carter'],
    director: ['David Fincher'],
    description:
      'An insomniac office worker and a devil-may-care soapmaker form an underground fight club that evolves into something much more.',
    country: 'USA',
    genre: ['Drama'],
    poster:
      'https://m.media-amazon.com/images/M/MV5BMmEzNTkxYjQtZTc0MC00YTVjLTg5ZTEtZWMwOWVlYzY0NWIwXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_SX300.jpg',
    background: '',
    logo: '',
    runtime: '139 min',
    trailerStreams: [],
    awards: 'Nominated for 1 Oscar',
    year: '1999'
  },
  {
    imdb_id: 'tt0317248',
    id: 'list2',
    moviedb_id: '603',
    imdbRating: 8.2,
    name: 'The Matrix',
    type: 'movie',
    cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss'],
    director: ['Lana Wachowski', 'Lilly Wachowski'],
    description:
      'When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception.',
    country: 'USA',
    genre: ['Action', 'Sci-Fi'],
    poster:
      'https://m.media-amazon.com/images/M/MV5BNzQzOTk3OTAtNDQ0Zi00ZTVkLWI0MTEtMDllZjNkYzNjNTc4L2ltYWdlXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_SX300.jpg',
    background: '',
    logo: '',
    runtime: '136 min',
    trailerStreams: [],
    awards: 'Won 4 Oscars',
    year: '1999'
  },
  {
    imdb_id: 'tt0110912',
    id: 'list3',
    moviedb_id: '680',
    imdbRating: 8.5,
    name: 'Pulp Fiction',
    type: 'movie',
    cast: ['John Travolta', 'Uma Thurman', 'Samuel L. Jackson'],
    director: ['Quentin Tarantino'],
    description:
      'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.',
    country: 'USA',
    genre: ['Crime', 'Drama'],
    poster:
      'https://m.media-amazon.com/images/M/MV5BNGNhMDIzZTUtNTBlZi00MTRlLWFjM2ItYzViMjE3YzI5MjljXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_SX300.jpg',
    background: '',
    logo: '',
    runtime: '154 min',
    trailerStreams: [],
    awards: 'Won 1 Oscar',
    year: '1994'
  }
]

const HomePage = (watchHistory): React.ReactElement => {
  const getDisplayData = (
    item: entry | WatchHistoryEntry
  ): {
    id: string
    name: string
    poster: string
    description: string
    type: string
    year: string
  } => {
    if (isEntry(item)) {
      return {
        id: item.id || item.imdb_id,
        name: item.name,
        poster: item.poster,
        description: item.description,
        type: item.type,
        year: isMovieEntry(item) ? item.year : 'Unknown'
      }
    }
    return {
      id: item.imdbID,
      name: item.imdbID,
      poster: '/assets/missing.jpg',
      description: `Watch progress: ${item.PercentageWatched}%`,
      type: item.MediaType.toLowerCase(),
      year: 'Unknown'
    }
  }

  const handlePlayItem = (item: entry | WatchHistoryEntry): void => {
    const displayData = getDisplayData(item)
    // Navigate to appropriate page based on type
    if (displayData.type === 'series') {
      console.log('Playing series:', displayData.name)
    } else {
      console.log('Playing movie:', displayData.name)
    }
  }

  const handleMoreInfo = (item: entry | WatchHistoryEntry): void => {
    const displayData = getDisplayData(item)
  }

  const ContentRow: React.FC<{
    title: string
    items: (entry | WatchHistoryEntry)[]
    showProgress?: boolean
  }> = ({ title, items, showProgress = false }) => {
    const scrollRef = useRef<HTMLDivElement>(null)

    const scroll = (direction: 'left' | 'right'): void => {
      if (scrollRef.current) {
        const scrollAmount = 300
        scrollRef.current.scrollBy({
          left: direction === 'left' ? -scrollAmount : scrollAmount,
          behavior: 'smooth'
        })
      }
    }

    return (
      <section className="mb-8 ml-15">
        <h2 className="text-2xl font-bold text-white mb-4 px-4 md:px-6">{title}</h2>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
            <button
              onClick={() => scroll('left')}
              className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 ml-2 pointer-events-auto"
              aria-label="Scroll left"
              tabIndex={0}
            >
              <ChevronLeft size={20} />
            </button>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none">
            <button
              onClick={() => scroll('right')}
              className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-2 pointer-events-auto"
              aria-label="Scroll right"
              tabIndex={0}
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-6 pb-4 group"
          >
            {items.map((item) => {
              const displayData = getDisplayData(item)
              const isWatchHistory = isWatchHistoryEntry(item)

              return (
                <div
                  key={displayData.id}
                  className="flex-shrink-0 w-40 md:w-48 cursor-pointer group/item relative"
                  onClick={() => handlePlayItem(item)}
                >
                  <div className="relative w-full h-60 md:h-72 rounded-lg overflow-hidden shadow-lg transform hover:scale-105 transition-transform duration-200">
                    <img
                      src={displayData.poster}
                      alt={displayData.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = '/assets/missing.jpg'
                        console.log('Image failed to load:', displayData.poster)
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully:', displayData.poster)
                      }}
                    />

                    {showProgress &&
                      isWatchHistory &&
                      item.PercentageWatched &&
                      item.PercentageWatched > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <div className="w-full bg-gray-700 rounded-full h-1">
                            <div
                              className="bg-red-500 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${item.PercentageWatched}%` }}
                            />
                          </div>
                        </div>
                      )}

                    <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/40 transition-all duration-300 flex items-center justify-center pointer-events-none">
                      <div className="opacity-0 group-hover/item:opacity-100 transform scale-75 group-hover/item:scale-100 transition-all duration-300 pointer-events-auto">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                          <Play size={32} className="text-white" fill="currentColor" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 px-1">
                    <h3 className="text-white text-sm font-medium truncate group-hover:item:text-gray-300 transition-colors">
                      {displayData.name}
                    </h3>
                    {displayData.year !== 'Unknown' && (
                      <p className="text-gray-400 text-xs mt-1">{displayData.year}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  // Hero Section Component
  const HeroSection: React.FC = () => {
    // Use first item from watch history or library as hero
    const heroItem = watchHistory.length > 0 ? watchHistory[0] : placeholderLibrary[0]
    const displayData = getDisplayData(heroItem)

    return (
      <section className="relative h-[60vh] md:h-[70vh] mb-8 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={displayData.poster}
            alt={displayData.name}
            className="w-full h-full object-cover filter blur-sm opacity-70"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/assets/missing.jpg'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
        </div>

        <div className="relative h-full flex items-center ml-15 px-4 md:px-6">
          <div className="max-w-3xl">
            <div className="mb-4">
              <span className="text-sm md:text-base font-semibold uppercase tracking-wide">
                {displayData.type === 'series' ? 'TV Series' : 'Movie'} • Featured
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black drop-shadow-2xl mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent leading-tight">
              {displayData.name}
            </h1>
            <p className="max-w-2xl text-base md:text-lg text-gray-200 drop-shadow-md mb-8 leading-relaxed line-clamp-3">
              {displayData.description ||
                'Experience this incredible story in stunning detail. Immerse yourself in a world of entertainment that will captivate and inspire.'}
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                className="bg-gradient-to-r from-orange-400 via-pink-500 to-pink-500 text-white shadow-lg transition drop-shadow-xl flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors duration-200 shadow-lg"
                onClick={() => handlePlayItem(heroItem)}
              >
                <Play size={20} fill="currentColor" />
                Play
              </Button>
              <Button
                className="flex items-center gap-2 bg-gray-800 bg-opacity-70 text-white px-6 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-all duration-200 backdrop-blur-sm border border-gray-600"
                onClick={() => handleMoreInfo(heroItem)}
              >
                <Info size={20} />
                More Info
              </Button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="ml-10 md:ml-12 mr-64 md:mr-72 min-h-screen relative z-5">
        <div className="relative">
          <HeroSection />

          {watchHistory.length > 0 && (
            <ContentRow
              title="Continue Watching"
              items={watchHistory.slice(0, 10)}
              showProgress={true}
            />
          )}

          <ContentRow title="My Library" items={placeholderLibrary} />

          <ContentRow title="My Lists" items={placeholderMyLists} />

          <section className="px-4 md:px-6 ml-15 py-8">
            <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div
                className="bg-gradient-to-br from-purple-600 to-blue-600 p-6 rounded-xl cursor-pointer hover:scale-105 transition-transform duration-200 group"
                onClick={() => onSelect('discover')}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Discover New Content</h3>
                  <Plus
                    size={24}
                    className="group-hover:rotate-90 transition-transform duration-300"
                  />
                </div>
                <p className="text-gray-200">Browse trending movies and series</p>
              </div>

              <div className="bg-gradient-to-br from-green-600 to-teal-600 p-6 rounded-xl cursor-pointer hover:scale-105 transition-transform duration-200 group">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Create Watch Party</h3>
                  <Plus
                    size={24}
                    className="group-hover:rotate-90 transition-transform duration-300"
                  />
                </div>
                <p className="text-gray-200">Watch with friends in sync</p>
              </div>

              <div className="bg-gradient-to-br from-orange-600 to-red-600 p-6 rounded-xl cursor-pointer hover:scale-105 transition-transform duration-200 group">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Manage Collections</h3>
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
