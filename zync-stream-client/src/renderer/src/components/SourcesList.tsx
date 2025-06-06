import { episode, Source } from '@renderer/types'
import { Blocks } from 'lucide-react'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { useState } from 'react'

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
  addExtension: () => void
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
  episode,
  addExtension
}: SourcesListProps): React.ReactElement {
  const [qualityFilter, setQualityFilter] = useState('All')

  const getQualityFromText = (text: string): string => {
    const lower = text.toLowerCase()
    if (lower.includes('2160p') || lower.includes('4k')) return '4K'
    if (lower.includes('1080p')) return '1080p'
    if (lower.includes('720p')) return '720p'
    return 'Other'
  }

  const filteredSources = sources.filter((source) => {
    if (activeProvider !== 'All' && source.extensionName !== activeProvider) {
      return false
    }
    if (qualityFilter !== 'All') {
      const sourceQuality = getQualityFromText((source.quality || '') + ' ' + (source.info || ''))
      if (sourceQuality !== qualityFilter) return false
    }
    return true
  })
  return (
    <aside className="w-full bg-black/80 border-r border-white/10 h-full overflow-y-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-white/70 font-semibold mt-2 ml-2 mb-2 mr-18">Sources</h2>
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
        {episode && (
          <div className="flex items-center justify-center mt-3">
            <h2 className="inline-block scroll-m-20 pb-2 text-2xl font-semibold tracking-tight first:mt-0">
              Episode {episode.number}
            </h2>
          </div>
        )}
        <Separator className="mb-3" />
        <select
          value={qualityFilter}
          onChange={(e) => setQualityFilter(e.target.value)}
          className="w-full bg-black text-white border border-white/15 rounded-xl px-4 py-2 shadow focus:border-white/30 focus:outline-none"
        >
          <option value="All">All Qualities</option>
          <option value="4K">4K / 2160p</option>
          <option value="1080p">1080p</option>
          <option value="720p">720p</option>
          <option value="Other">Other</option>
        </select>
        <Separator className="mt-3" />
        <div className="flex flex-col mt-3 gap-1">
          {filteredSources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-white/70">
              <Blocks className="w-12 h-12 mb-5" />
              <span className="mb-3 text-center">
                No sources found! Spice things up by adding a new extension.
              </span>
              <button
                onClick={() => addExtension()}
                className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-xl transition-all duration-200"
              >
                Add Extension
              </button>
            </div>
          ) : (
            filteredSources.map((source) => {
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
                      {source.displayName}
                    </div>
                    <div className="font-semibold text-xs w-full truncate max-w-[250px] leading-tight">
                      {source.displayTitle}
                    </div>
                    <div className="font-mono text-xs opacity-90 line-clamp-1">
                      {source.info} {source.quality}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </aside>
  )
}
