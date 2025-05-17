import { Check, SlidersHorizontal } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Source {
  id?: string
  url?: string
  name: string
  title: string
  extensionName?: string
  displayName?: string
  displayTitle?: string
  restTitle?: string
  subName?: string
  description?: string
}

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
  providers
}: SourcesListProps): React.ReactElement {
  // Filter sources based on active provider
  const filteredSources =
    activeProvider === 'All' ? sources : sources.filter((s) => s.extensionName === activeProvider)

  // Sort sources based on sortBy
  const sortedSources = [...filteredSources].sort((a, b) => {
    if (sortBy === 'quality') {
      const aQuality = a.restTitle?.split(',')[0] || ''
      const bQuality = b.restTitle?.split(',')[0] || ''
      // Sort 4K first, then 1080p, then 720p, etc.
      if (aQuality.toLowerCase().includes('4k') && !bQuality.toLowerCase().includes('4k')) return -1
      if (!aQuality.toLowerCase().includes('4k') && bQuality.toLowerCase().includes('4k')) return 1
      if (aQuality.toLowerCase().includes('1080') && !bQuality.toLowerCase().includes('1080'))
        return -1
      if (!aQuality.toLowerCase().includes('1080') && bQuality.toLowerCase().includes('1080'))
        return 1
      return 0
    }

    if (sortBy === 'size') {
      const aSize = extractSize(a.subName || '')
      const bSize = extractSize(b.subName || '')
      return bSize - aSize // Larger files first
    }

    if (sortBy === 'provider') {
      return (a.extensionName || '').localeCompare(b.extensionName || '')
    }

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
    <div className="flex flex-col" style={{ height: '100%', maxHeight: '100vh' }}>
      {/* Header with sorting and filtering */}
      <div className="border-b border-white/10 px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M5 3l14 9-14 9V3z" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-medium text-white">Sources</h3>
              {!loading && !error && (
                <div className="text-xs text-white/60 mt-0.5">
                  {filteredSources.length} available
                </div>
              )}
            </div>
          </div>

          <div
            className="bg-white/5 hover:bg-white/10 transition-colors px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
            onClick={() => {
              const nextSort =
                sortBy === 'quality' ? 'size' : sortBy === 'size' ? 'provider' : 'quality'
              onSortChange(nextSort)
            }}
          >
            <SlidersHorizontal size={12} />
            <span className="text-xs">{sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}</span>
          </div>
        </div>

        {/* Provider tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 custom-scrollbar">
          {providers.map((provider) => (
            <button
              key={provider}
              onClick={() => onProviderChange(provider)}
              className={`px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                activeProvider === provider
                  ? 'bg-white/20 text-white'
                  : 'bg-transparent text-white/70 hover:bg-white/10'
              }`}
            >
              {provider}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable sources list - enhanced scrollbar visibility */}
      <div
        className="flex-1 px-4 py-3"
        style={{
          height: '75vh',
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'scroll',
          scrollbarWidth: 'auto',
          scrollbarColor: 'rgba(255, 255, 255, 0.3) rgba(0, 0, 0, 0.5)'
        }}
      >
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/5 rounded-lg p-3 animate-pulse">
                <div className="flex">
                  <div className="w-8 h-8 bg-white/10 rounded mr-3"></div>
                  <div className="flex-1">
                    <div className="h-3 bg-white/10 rounded w-2/3 mb-2"></div>
                    <div className="h-2 bg-white/10 rounded w-1/2"></div>
                  </div>
                  <div className="w-12 h-5 bg-white/10 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-4 py-6 px-4 rounded-lg bg-white/5 text-center">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">
              ⚠️
            </div>
            <div>
              <h3 className="font-medium mb-1">Source Unavailable</h3>
              <p className="text-sm text-white/70">{error}</p>
            </div>
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-6 px-4 rounded-lg bg-white/5 text-center">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">
              🔍
            </div>
            <div>
              <h3 className="font-medium mb-1">No Sources Found</h3>
              <p className="text-sm text-white/70">Try selecting a different provider</p>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {sortedSources.map((source, index) => {
                // Create unique identifier for the source
                const sourceKey =
                  source.id ||
                  source.url ||
                  `${source.extensionName}-${source.displayTitle}-${index}`
                const selectedKey =
                  selectedSource &&
                  (selectedSource.id ||
                    selectedSource.url ||
                    `${selectedSource.extensionName}-${selectedSource.displayTitle}-${sortedSources.indexOf(selectedSource)}`)

                const isSelected = sourceKey === selectedKey
                // Extract relevant information
                const qualityTag = source.restTitle?.split(',')[0]?.trim() || ''
                const qualityClass = getQualityBadge(qualityTag)
                const sizeInfo = source.subName?.match(/\d+(\.\d+)?\s*(GB|MB)/i)?.[0] || ''

                return (
                  <motion.div
                    key={sourceKey}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, delay: index * 0.03 }}
                    className={`
                      rounded-lg overflow-hidden cursor-pointer transition-all duration-150
                      ${isSelected ? 'bg-white/10 shadow-lg' : 'bg-white/5 hover:bg-white/8'}
                    `}
                    onClick={() => onSourceSelect(source)}
                  >
                    <div className="px-3 py-2.5">
                      <div className="flex items-center">
                        {/* Provider indicator - now simple text */}
                        <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-medium bg-white/10 mr-3 flex-shrink-0">
                          {source.extensionName?.charAt(0) || 'S'}
                        </div>{' '}
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Title */}
                          <div>
                            <h4 className="font-medium text-sm text-white">
                              {source.displayTitle
                                ? source.displayTitle.substring(0, 50) + '...'
                                : 'Untitled Source'}
                            </h4>

                            {qualityTag && (
                              <div className="mt-1">
                                <span
                                  className={`text-[10px] w-full px-2 py-0.5 rounded inline-block ${qualityClass}`}
                                >
                                  {qualityTag}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Info row */}
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-2 text-xs text-white/70">
                              <span>{source.extensionName}</span>
                              {sizeInfo && (
                                <>
                                  <span className="text-white/40">•</span>
                                  <span>{sizeInfo}</span>
                                </>
                              )}
                            </div>

                            {isSelected && (
                              <div className="flex items-center gap-1 text-xs text-white font-medium">
                                <Check size={12} />
                                <span>Selected</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Additional tags - only shown when expanded */}
                      {/* {source.restTitle && source.restTitle.split(',').length > 1 && (
                        <div className="mt-1">
                          <button
                            className="text-xs text-white/60 hover:text-white/80 flex items-center gap-1 mt-1"
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpanded(isExpanded ? null : sourceKey)
                            }}
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            >
                              <path
                                d="M6 9L12 15L18 9"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                            {isExpanded ? 'Less info' : 'More info'}
                          </button>

                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="mt-2 pt-2 border-t border-white/5"
                            >
                              <div className="flex flex-wrap gap-1.5">
                                {source.restTitle
                                  .split(',')
                                  .slice(1)
                                  .map((tag, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/70"
                                    >
                                      {tag.trim()}
                                    </span>
                                  ))}
                              </div>

                              {source.subName && (
                                <div className="mt-2 text-[10px] text-white/50">
                                  <div className="whitespace-normal">
                                    {source.subName.split('\n').join(' • ')}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </div>
                      )} */}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Selected source indicator */}
      {selectedSource && (
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-xs text-white/70">Ready to stream</span>
          </div>
        </div>
      )}
    </div>
  )
}

/*
  .overflow-scroll {
    -ms-overflow-style: auto;
    scrollbar-width: thin;
  }
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
  }
  ::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.3);
    border-radius: 10px;
  }
*/
