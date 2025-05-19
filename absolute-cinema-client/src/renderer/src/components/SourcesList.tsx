import { Check, SlidersHorizontal } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { episode, Source } from '@renderer/types'
import { Button } from './ui/button'

interface SourcesListProps {
  sources: Source[]
  loading: boolean
  error: string | null
  selectedSource: Source | null
  onSourceSelect: (source: Source) => void
  activeProvider: string
  sortBy: string
  onSortChange: (sort: string) => void
  onProviderChange: (provider: string) => void
  providers: string[]
  onEpisodeSelect: (ep: episode | null) => void
  episode: episode | null
}

export default function SourcesList({
  sources,
  loading,
  error,
  selectedSource,
  onSourceSelect,
  activeProvider,
  sortBy,
  onSortChange,
  onProviderChange,
  providers,
  onEpisodeSelect,
  episode
}: SourcesListProps): React.ReactElement {
  // Filter sources based on active provider
  const filteredSources =
    activeProvider === 'All' ? sources : sources.filter((s) => s.extensionName === activeProvider)

  console.log('Sources received:', sources)
  console.log('Filtered sources:', filteredSources)
  // Sort sources based on sortBy
  const sortedSources = [...filteredSources].sort((a, b) => {
    return 0
  })

  // Helper to extract file size in MB
  function extractSize(text: string): number {
    const match = text.match(/(\d+(\.\d+)?)\s*(GB|MB)/i)
    if (!match) return 0
    const size = parseFloat(match[1])
    const unit = match[3].toUpperCase()
    return unit === 'GB' ? size * 1024 : size
  }

  // Get quality badge style based on quality text
  const getQualityBadge = (quality: string): string => {
    const lowerQuality = quality.toLowerCase()
    if (lowerQuality.includes('4k') || lowerQuality.includes('2160p')) {
      return 'bg-white/20 text-white font-medium border border-white/30'
    }
    if (lowerQuality.includes('1080p') || lowerQuality.includes('fhd')) {
      return 'bg-white/15 text-white font-medium border border-white/20'
    }
    if (lowerQuality.includes('720p') || lowerQuality.includes('hd')) {
      return 'bg-white/10 text-white font-medium border border-white/15'
    }
    return 'bg-white/10 text-white/90'
  }

  return (
    <aside className="w-full bg-black/80 border-r border-white/10 h-full overflow-y-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-white/70 font-semibold mt-2 mb-2 mr-18">Sources</h2>
        {episode && (
          <Button
            onClick={() => onEpisodeSelect(null)}
            variant="ghost"
            className="flex items-center gap-2 text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 px-3 py-2 rounded-xl"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-undo2-icon lucide-undo-2"
            >
              <path d="M9 14 4 9l5-5" />
              <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
            </svg>
            <span>Back to episodes</span>
          </Button>
        )}
      </div>
      <div className="mb-4">
        <select
          value={activeProvider}
          onChange={(e) => onProviderChange(e.target.value)}
          className="w-full bg-black text-white border border-white/15 rounded-xl px-4 py-2 shadow focus:border-white/30 focus:outline-none"
        >
          {providers.map((provider) => (
            <option key={provider} value={provider}>
              {provider}
            </option>
          ))}
        </select>
        <div className="flex flex-col mt-3 gap-1">
          {sources.map((source) => {
            const uniq = `${source.extensionName}-${source.displayTitle}-${source.quality || ''}-${source.info || ''}`

            const isSelected =
              selectedSource &&
              selectedSource.displayTitle === source.displayTitle &&
              selectedSource.extensionName === source.extensionName &&
              selectedSource.info === source.info

            return (
              <button
                key={uniq}
                className={`flex items-center gap-3 text-left px-2 py-2 rounded hover:bg-white/10 transition
                h-[70px] min-h-[70px] ${
                  isSelected ? 'bg-white/10 text-pink-400' : 'text-white/80'
                }`}
                onClick={() => onSourceSelect(source)}
              >
                <div className="flex flex-col justify-center h-full overflow-hidden">
                  <div className="font-mono text-xs opacity-90 line-clamp-1">
                    {source.displayName} {source.quality}
                  </div>
                  <div className="font-semibold text-xs w-full truncate max-w-[250px] leading-tight">
                    {source.displayTitle}
                  </div>
                  <div className="font-mono text-xs opacity-90 line-clamp-1">{source.info}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
