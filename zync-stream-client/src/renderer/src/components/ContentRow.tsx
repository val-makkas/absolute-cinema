import React, { useRef, useMemo, useCallback } from 'react'
import { entry } from '@/types'
import { updatedWatchHistoryEntry } from '@/hooks/useWatchHistory'
import { ChevronLeft, ChevronRight, Star, Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Movie } from '@/types'

interface ContentRowProps {
  title: string
  items: (entry | updatedWatchHistoryEntry)[]
  showProgress?: boolean
  loading?: boolean
  onItemClick: (item?: entry | updatedWatchHistoryEntry) => void
}

const ContentRow: React.FC<ContentRowProps> = ({
  title,
  items,
  showProgress = false,
  loading = false,
  onItemClick
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  const processedItems = useMemo(() => {
    return items.map((item) => {
      const isWatchHistory = 'movieDetails' in item

      if (isWatchHistory) {
        const watchItem = item as updatedWatchHistoryEntry
        return {
          id: watchItem.imdbID,
          name: watchItem.movieDetails?.name || watchItem.imdbID,
          poster: watchItem.movieDetails?.poster || '/assets/missing.jpg',
          description: `${watchItem.PercentageWatched}% watched`,
          rating: watchItem.movieDetails?.imdbRating || 'N/A',
          isWatchHistory: true,
          originalItem: item,
          percentageWatched: watchItem.PercentageWatched
        }
      } else {
        const entryItem = item as entry
        return {
          id: entryItem.id || entryItem.imdb_id,
          name: entryItem.name,
          poster: entryItem.poster || '/assets/missing.jpg',
          description: entryItem.description || '',
          rating: entryItem.imdbRating || 'N/A',
          isWatchHistory: false,
          originalItem: item,
          percentageWatched: 0
        }
      }
    })
  }, [items])

  const scroll = useCallback((direction: 'left' | 'right'): void => {
    if (scrollRef.current) {
      const scrollAmount = 320
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }, [])

  const handleItemClick = useCallback(
    (item: entry | updatedWatchHistoryEntry) => {
      onItemClick(item)
    },
    [onItemClick]
  )

  if (loading) {
    return (
      <section className="mb-8 ml-15">
        <h2 className="text-2xl font-bold text-white mb-4 px-4 md:px-6">{title}</h2>
        <div className="flex gap-4 px-4 md:px-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="w-48 h-72 rounded-2xl bg-white/10" />
          ))}
        </div>
      </section>
    )
  }

  if (!items.length) return null

  return (
    <section className="mb-8 ml-10 mr-15 group">
      <h2 className="text-2xl font-bold text-white mb-4 px-4 md:px-6">{title}</h2>
      <div className="relative">
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/60 hover:bg-white/90 text-black p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
          aria-label="Scroll left"
        >
          <ChevronLeft size={30} />
        </button>

        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/60 hover:bg-white/90 text-black p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
          aria-label="Scroll right"
        >
          <ChevronRight size={30} />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto py-4 scrollbar-hide px-4 md:px-6 pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {processedItems.map((item) => (
            <div
              key={item.id}
              className="flex-shrink-0 w-48 rounded-2xl cursor-pointer group/item"
              onClick={() => handleItemClick(item.originalItem)}
            >
              <div className="relative w-full h-72 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                {item.poster && (
                  <img
                    src={item.poster}
                    alt={item.name}
                    className="w-full h-full rounded-2xl object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/assets/missing.jpg'
                    }}
                  />
                )}

                {showProgress && item.isWatchHistory && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={12} className="text-white/80" />
                      <span className="text-xs text-white/80">
                        {item.percentageWatched}% watched
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-2xl h-1">
                      <div
                        className="bg-red-500 h-1 rounded-2xl transition-all duration-300"
                        style={{ width: `${item.percentageWatched}%` }}
                      />
                    </div>
                  </div>
                )}
                {item.rating !== 'N/A' && item.rating !== 'Unknown' && (
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-2xl px-2 py-1 flex items-center gap-1">
                    <Star size={12} className="text-yellow-400" fill="currentColor" />
                    <span className="text-xs text-white font-semibold">
                      {typeof item.rating === 'number' ? item.rating.toFixed(1) : item.rating}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 px-1">
                <h3 className="text-white text-sm font-medium truncate group-hover/item:text-gray-300 transition-colors">
                  {item.name}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default React.memo(ContentRow)
