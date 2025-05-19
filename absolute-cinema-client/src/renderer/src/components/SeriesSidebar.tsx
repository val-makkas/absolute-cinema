import { seriesEntry, episode } from '@/types/catalogs.types'
import { useState } from 'react'
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from './ui/select'

export default function SeriesSidebar({
    details,
    onEpisodeSelect,
    selectedEpisodeId,
}: {
    details: seriesEntry
    onEpisodeSelect: (ep: episode) => void
    selectedEpisodeId?: string
}) {
    // Group episodes by season
    const episodesBySeason = details.videos.reduce((acc: Record<number, episode[]>, ep) => {
        acc[ep.season] = acc[ep.season] || []
        acc[ep.season].push(ep)
        return acc
    }, {})

    const seasonNumbers = Object.keys(episodesBySeason).map(String).sort((a, b) => Number(a) - Number(b))
    const [selectedSeason, setSelectedSeason] = useState<string>(seasonNumbers[0] || '')

    // If no seasons, render nothing
    if (seasonNumbers.length === 0) return null

    return (
        <aside className="w-72 bg-black/80 border-r border-white/10 h-full overflow-y-auto p-4">
            <h2 className="text-white text-lg font-bold mb-4">Episodes</h2>
            <div className="mb-4">
                <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select season" />
                    </SelectTrigger>
                    <SelectContent>
                        {seasonNumbers.map(season => (
                            <SelectItem key={season} value={season}>
                                Season {season}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <div className="text-white/70 font-semibold mb-2">Season {selectedSeason}</div>
                <div className="flex flex-col gap-1">
                    {(episodesBySeason[Number(selectedSeason)] ?? []).map((ep) => (
                        <button
                            key={ep.id}
                            className={`flex items-center gap-3 text-left px-2 py-2 rounded hover:bg-white/10 transition ${
                                selectedEpisodeId === ep.id ? 'bg-white/10 text-pink-400' : 'text-white/80'
                            }`}
                            onClick={() => onEpisodeSelect(ep)}
                        >
                            {ep.thumbnail && (
                                <img
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
                                <div className="font-semibold truncate">{ep.name}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </aside>
    )
}