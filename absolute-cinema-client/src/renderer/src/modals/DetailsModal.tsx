import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Play, PartyPopper, X as XIcon } from 'lucide-react'
import SourcesList from '@/components/SourcesList'

export default function DetailsModal({
  open,
  details,
  extensionManifests,
  detailsLoading,
  onClose,
  onWatchAlone
}: {
  open: boolean
  details: any
  extensionManifests: Record<string, any>
  detailsLoading: boolean
  onClose: () => void
  onWatchAlone: (src: any) => void
}): React.ReactElement {
  const [selectedSource, setSelectedSource] = useState<any>(null)
  const [sortBy, setSortBy] = useState('quality')
  const [activeProvider, setActiveProvider] = useState('All')
  const [sources, setSources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get unique providers from extensions
  const providers = [
    'All',
    ...new Set(
      Object.values(extensionManifests).map((manifest: any) => manifest?.name || 'Unknown')
    )
  ]

  // Fetch sources - using logic from Sources.tsx
  useEffect(() => {
    const fetchStreamingSources = async (): Promise<void> => {
      const imdbID = details?.imdb_id || details?.id
      if (!imdbID) {
        setError('No movie ID provided')
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const allSources: any[] = []
        for (const [manifestUrl, manifest] of Object.entries(extensionManifests)) {
          const baseUrl = manifestUrl.replace(/\/manifest\.json$/, '')
          const streamUrl = `${baseUrl}/stream/movie/${imdbID}.json`
          try {
            const response = await fetch(streamUrl)
            if (!response.ok) throw new Error('No streams')
            const data = await response.json()
            let streams: any[] = []
            if (Array.isArray(data.streams)) {
              streams = data.streams
            } else if (Array.isArray(data)) {
              streams = data
            } else if (data.results && Array.isArray(data.results)) {
              streams = data.results
            }
            allSources.push(
              ...streams.map((source) => {
                const [displayName, ...rest] = source.name.split('\n')
                const [displayTitle, ...restTitle] = source.title.split('\n')
                return {
                  ...source,
                  extensionName: manifest.name || baseUrl,
                  displayName,
                  displayTitle,
                  restTitle: restTitle.join('\n'),
                  subName: rest.join('\n')
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
  }, [open, details, JSON.stringify(Object.keys(extensionManifests))])

  useEffect(() => {
    // Effect for any necessary loading state changes
  }, [detailsLoading, details])

  if (detailsLoading && !details) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="flex items-center justify-center min-h-[300px] bg-black/80 backdrop-blur-xl border border-white/15 shadow-2xl">
          <div className="w-16 h-16 rounded-full border-4 border-yellow-300 border-t-transparent animate-spin" />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
            className="absolute inset-0 z-0"
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
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/60 via-black/70 to-black/80" />

        {/* Main content */}
        <div className="relative z-20 flex flex-col flex-1 p-8">
          {/* Movie info header - reorganized with larger image */}
          <div className="flex flex-col mb-6">
            {details?.avatar && (
              <div className="flex justify-center mb-4">
                <img
                  src={details.avatar}
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
                    • <span className="text-yellow-300 text-base">★</span> {details.rating}
                  </span>
                )}
                {details?.runtime && (
                  <span className="flex items-center gap-1">• {details.runtime}</span>
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-2 mt-1">
                {details?.genre?.split(',').map((genre: string, i: number) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80"
                  >
                    {genre.trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Overview & details */}
          <div className="overflow-y-auto max-h-[calc(100vh-450px)] pr-4 custom-scrollbar">
            <p className="text-sm text-white/90 mb-4 leading-relaxed">{details?.overview}</p>

            <div className="grid grid-cols-2 gap-4 text-sm mt-2 mb-6">
              {details?.actors && (
                <div>
                  <div className="text-white/50 mb-1">Cast</div>
                  <div className="text-white">{details.actors}</div>
                </div>
              )}
              {details?.director && (
                <div>
                  <div className="text-white/50 mb-1">Director</div>
                  <div className="text-white">{details.director}</div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 mt-auto pt-4">
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
          </div>
        </div>

        {/* Sources sidebar - updated container */}
        <div className="relative z-20 flex flex-col w-[350px] h-full backdrop-blur-sm bg-transparent border-l border-white/10">
          <div className="h-full overflow-hidden">
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
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
