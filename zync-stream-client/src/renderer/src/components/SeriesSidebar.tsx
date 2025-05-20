import { seriesEntry, episode } from '@/types/catalogs.types'
import React, { useState } from 'react'
import missing from '@/assets/missing.jpg'

export default function SeriesSidebar({
  details,
  onEpisodeSelect,
  selectedEpisodeid
}: {
  details: seriesEntry
  onEpisodeSelect: (ep: episode) => void
  selectedEpisodeid?: string
}): React.JSX.Element | null {
  console.log(details)
  // Group episodes by season
  const episodesBySeason = details.videos.reduce((acc: Record<number, episode[]>, ep) => {
    if (ep.season > 0) {
      acc[ep.season] = acc[ep.season] || []
      acc[ep.season].push(ep)
    }
    return acc
  }, {})

  const seasonNumbers = Object.keys(episodesBySeason)
    .map(String)
    .sort((a, b) => Number(a) - Number(b))
  const [selectedSeason, setSelectedSeason] = useState<string>(seasonNumbers[0] || '1')

  // If no seasons, render nothing
  if (seasonNumbers.length === 0) return null

  return (
    <aside className="w-full bg-black/80 border-r border-white/10 h-full overflow-y-auto p-4">
      <h2 className="text-white/70 font-semibold mt-2 mb-2">Episodes</h2>
      <div className="mb-4">
        <select
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
          className="w-full bg-black text-white border border-white/15 rounded-xl px-4 py-2 shadow focus:border-white/30 focus:outline-none"
        >
          {seasonNumbers.map((season) => (
            <option key={season} value={season}>
              Season {season}
            </option>
          ))}
        </select>
        <div className="flex flex-col mt-3 gap-1">
          {(episodesBySeason[Number(selectedSeason)] ?? []).map((ep) => (
            <button
              key={ep.id}
              className={`flex items-center gap-3 text-left px-2 py-2 rounded hover:bg-white/10 transition ${
                selectedEpisodeid === ep.id ? 'bg-white/10 text-pink-400' : 'text-white/80'
              }`}
              onClick={() => onEpisodeSelect(ep)}
            >
              {ep.thumbnail && (
                <img
                  onError={({ currentTarget }) => {
                    currentTarget.onerror = null
                    currentTarget.src = missing
                  }}
                  src={ep.thumbnail}
                  alt={ep.name}
                  className="w-12 h-16 object-cover rounded"
                />
              )}
              <div>
                <div className="font-mono text-xs opacity-70">
                  E{ep.number}
                  {ep.firstAired && (
                    <span className="ml-2 text-[10px] text-white/50">
                      {new Date(ep.firstAired).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div
                  className="font-semibold break-words"
                  style={{
                    wordBreak: 'break-word',
                    maxWidth: '100%'
                  }}
                >
                  {ep.name}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
