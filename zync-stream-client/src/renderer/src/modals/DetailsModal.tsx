import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Play, PartyPopper, X as XIcon } from 'lucide-react'
import SourcesList from '@/components/SourcesList'
import { episode, Source } from '@renderer/types'
import SeriesSidebar from '@/components/SeriesSidebar'

export default function DetailsModal({
  open,
  details,
  extensionManifests,
  detailsLoading,
  onClose,
  onWatchAlone,
  addExtension
}: {
  open: boolean
  details: any
  extensionManifests: Record<string, any>
  detailsLoading: boolean
  onClose: () => void
  onWatchAlone: (src: Source) => void
  addExtension: () => void
}): React.ReactElement {
  const [selectedSource, setSelectedSource] = useState<Source | null>(null)
  const [sortBy, setSortBy] = useState('quality')
  const [activeProvider, setActiveProvider] = useState('All')
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEpisode, setSelectedEpisode] = useState<episode | null>(null)

  const isSeries = details?.type === 'series'
  console.log(isSeries)
  // Get unique providers from extensions
  const providers = [
    'All',
    ...Array.from(
      new Set(Object.values(extensionManifests).map((manifest: any) => manifest?.name || 'Unknown'))
    )
  ]

  // Fetch sources - using logic from Sources.tsx
  useEffect(() => {
    const fetchStreamingSources = async (): Promise<void> => {
      const imdbID = details.imdb_id
      if (!imdbID) {
        setError('No movie ID provided')
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const allSources: Source[] = []
        for (const [manifestUrl, manifest] of Object.entries(extensionManifests)) {
          const baseUrl = manifestUrl.replace(/\/manifest\.json$/, '')
          let streamUrl: string
          if (selectedEpisode) {
            streamUrl = `${baseUrl}/stream/series/${imdbID}:${selectedEpisode.season}:${selectedEpisode.number}.json`
          } else {
            streamUrl = `${baseUrl}/stream/movie/${imdbID}.json`
          }
          try {
            const response = await fetch(streamUrl)
            if (!response.ok) throw new Error('No streams')
            const data = await response.json()
            let streams: Source[] = []
            if (Array.isArray(data.streams)) {
              streams = data.streams
            }
            allSources.push(
              ...streams.map((source) => {
                const [displayName, ...rest] = source.name!.split('\n')
                const [displayTitle, ...restTitle] = source.title!.split('\n')
                return {
                  ...source,
                  extensionName: manifest.name || baseUrl,
                  displayName,
                  displayTitle,
                  info: restTitle.join('\n'),
                  quality: rest.join('\n')
                }
              })
            )
          } catch {
            // Ignore individual extension errors
          }
        }
        setSources(allSources)
      } catch {
        setError('Failed to load streaming sources')
      } finally {
        setLoading(false)
      }
    }

    if (open && details) {
      fetchStreamingSources()
    }

    // eslint-disable-next-line
  }, [selectedEpisode, open, details, JSON.stringify(Object.keys(extensionManifests))])

  useEffect(() => {
    // Effect for any necessary loading state changes
  }, [detailsLoading, details])

  if (detailsLoading && !details) {
    return (
      <Dialog
        open={open}
        onOpenChange={() => {
          setSelectedEpisode(null)
          onClose()
        }}
      >
        <DialogContent className="flex items-center justify-center min-h-[300px] bg-black/80 backdrop-blur-xl border border-white/15 shadow-2xl">
          <div className="w-16 h-16 rounded-full border-4 border-yellow-300 border-t-transparent animate-spin" />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        setSelectedEpisode(null)
        setSelectedSource(null)
        onClose()
      }}
    >
      <DialogContent
        className="flex flex-row p-0 max-w-7xl h-900 bg-black/80 backdrop-blur-xl border border-white/15 shadow-2xl overflow-hidden animate-in fade-in-50 slide-in-from-bottom-10 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <DialogPrimitive.Close className="absolute top-6 left-6 z-50 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/40">
          <XIcon className="w-6 h-6" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>

        {/* Blurred poster background */}
        {details?.poster && (
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              backgroundImage: `url(${details.poster})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(26px) brightness(1.08) saturate(1.25)',
              opacity: 0.68
            }}
          />
        )}

        {/* Overlay for readability */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/60 via-black/70 to-black/80 pointer-events-none" />

        {/* Main content */}
        <div className="relative z-20 flex flex-col flex-1 p-8">
          {/* Movie info header - reorganized with larger image */}
          <div className="flex flex-col mb-6">
            {details?.logo && (
              <div className="flex justify-center mb-4">
                <img
                  src={details.logo}
                  alt={details.title}
                  className="w-56 h-56 object-contain rounded-xl drop-shadow-xl"
                />
              </div>
            )}

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-white/80 mb-2">
                {details?.release_date && <span>{details.release_date}</span>}
                {details?.rating && (
                  <span className="flex items-center gap-1">
                    • <span className="text-yellow-300 text-base">★</span> {details.imdbRating}
                  </span>
                )}
                {details?.runtime && (
                  <span className="flex items-center gap-1">• {details.runtime}</span>
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-2 mt-1">
                {details?.genre?.map((genre: string, i: number) => (
                  <span
                    key={i}
                    className="text-s px-2 py-0.5 rounded-full bg-white/10 text-white/80"
                  >
                    {genre.trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Overview & details */}
          <div className="overflow-y-auto max-h-600px pr-4 custom-scrollbar">
            <p className="text-s text-white/90 mb-4 leading-relaxed text-center">
              {details?.description}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-2 mb-6 text-center">
              {details?.cast && details.cast.length > 0 && (
                <div className="w-full">
                  <div className="text-white/50 mb-2 text-center">Cast</div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {details.cast.map((cast: string, i: number) => (
                      <span
                        key={i}
                        className="text-s px-2 py-0.5 rounded-full bg-white/10 text-white/80"
                      >
                        {cast}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {details?.director && (
                <div>
                  <div className="text-white/50 mb-1 text-center">Director</div>
                  <div className="text-s px-2 py-0.5 rounded-full bg-white/10 text-white/80 w-full">
                    {details.director}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 mt-auto pt-4">
            {selectedSource ? (
              <>
                <button
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-base bg-gradient-to-r from-orange-400 via-pink-500 to-pink-500 text-white shadow-lg hover:scale-105 transition drop-shadow-xl"
                  onClick={() => onWatchAlone(selectedSource)}
                  disabled={!selectedSource}
                >
                  <Play className="w-5 h-5" /> Watch Alone
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-base bg-gradient-to-r from-cyan-400 via-blue-400 to-pink-400 text-white shadow-lg hover:scale-105 transition drop-shadow-xl"
                  disabled={!selectedSource}
                >
                  <PartyPopper className="w-5 h-5" /> Create Party
                </button>
              </>
            ) : (
              <>
                <button
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl 
                  font-bold text-base bg-gradient-to-r from-orange-400 via-pink-500 to-pink-500 
                text-white shadow-lg hover:scale-105 transition drop-shadow-xl
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  disabled={!selectedSource}
                >
                  <Play className="w-5 h-5" /> Watch Alone
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl 
                  font-bold text-base bg-gradient-to-r from-cyan-400 via-blue-400 to-pink-400 
                text-white shadow-lg hover:scale-105 transition drop-shadow-xl
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  disabled={!selectedSource}
                >
                  <PartyPopper className="w-5 h-5" /> Create Party
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sources sidebar - updated container */}
        <div className="relative z-20 flex flex-col w-[350px] h-full backdrop-blur-sm bg-transparent border-l border-white/10">
          <div className="h-full overflow-visible">
            {isSeries ? (
              selectedEpisode ? (
                // Show sources for the selected episode
                <SourcesList
                  sources={sources}
                  loading={loading}
                  error={error}
                  selectedSource={selectedSource}
                  onSourceSelect={setSelectedSource}
                  activeProvider={activeProvider}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  onProviderChange={setActiveProvider}
                  providers={providers}
                  onEpisodeSelect={setSelectedEpisode}
                  episode={selectedEpisode}
                  addExtension={addExtension}
                />
              ) : (
                // Show the series sidebar to pick an episode
                <SeriesSidebar
                  details={details}
                  onEpisodeSelect={setSelectedEpisode}
                  selectedEpisodeid={selectedEpisode?.['id']}
                />
              )
            ) : (
              // Always show sources for movies
              <SourcesList
                sources={sources}
                loading={loading}
                error={error}
                selectedSource={selectedSource}
                onSourceSelect={setSelectedSource}
                activeProvider={activeProvider}
                sortBy={sortBy}
                onSortChange={setSortBy}
                onProviderChange={setActiveProvider}
                providers={providers}
                onEpisodeSelect={setSelectedEpisode}
                episode={null}
                addExtension={addExtension}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
