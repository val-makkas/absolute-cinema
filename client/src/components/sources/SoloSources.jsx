import React, { useState, useEffect } from 'react';

function SoloSources({ extensionManifests = {}, details, sidebarMode, onSourceSelect, selectedSource }) {
  const imdbID = details?.imdb_id || details?.id;
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');

  // Use stringified keys as dependency to avoid infinite loop
  const extensionManifestKeys = Object.keys(extensionManifests).sort().join(",");

  useEffect(() => {
    const fetchStreamingSources = async () => {
      if (!imdbID) {
        setError("No movie ID provided");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const allSources = [];
        for (const [manifestUrl, manifest] of Object.entries(extensionManifests)) {
          const baseUrl = manifestUrl.replace(/\/manifest\.json$/, "");
          const streamUrl = `${baseUrl}/stream/movie/${imdbID}.json`;
          try {
            const response = await fetch(streamUrl);
            if (!response.ok) throw new Error('No streams');
            const data = await response.json();
            let streams = [];
            if (Array.isArray(data.streams)) {
              streams = data.streams;
            } else if (Array.isArray(data)) {
              streams = data;
            } else if (data.results && Array.isArray(data.results)) {
              streams = data.results;
            }
            allSources.push(
              ...streams.map((source) => {
                const [displayName, ...rest] = source.name.split('\n');
                const [displayTitle, ...restTitle] = source.title.split('\n');
                return {
                  ...source,
                  extensionName: manifest.name || baseUrl,
                  displayName,
                  displayTitle,
                  restTitle: restTitle.join('\n'),
                  subName: rest.join('\n'),
                };
              })
            );
          } catch (err) {
            // Ignore individual extension errors
          }
        }
        setSources(allSources);
      } catch (err) {
        setError("Failed to load streaming sources");
      } finally {
        setLoading(false);
      }
    };
    fetchStreamingSources();
  }, [imdbID, extensionManifestKeys]);

  if (!sidebarMode) return null;

  // Get unique source types for filter dropdown
  const sourceTypes = Array.from(new Set(sources.map(s => s.extensionName)));
  const filteredSources = filter === 'All' ? sources : sources.filter(s => s.extensionName === filter);

  return (
    <aside style={{
      width: '100%',
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 0,
      fontFamily: 'inherit',
      color: '#fff',
    }}>
      {/* Dropdown filter */}
      <div style={{ width: '100%', marginBottom: 10 }}>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 14px',
            borderRadius: 12,
            background: '#18181b',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            border: '1.5px solid #31343b',
            outline: 'none',
            marginBottom: 8,
            boxShadow: '0 2px 8px #0003',
            appearance: 'none',
            cursor: 'pointer',
            letterSpacing: 0.5,
          }}
        >
          <option value="All">All</option>
          {sourceTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>
      {/* Title */}
      <h2 style={{
        fontWeight: 900,
        fontSize: 23,
        color: '#ffe082',
        marginBottom: 22,
        textAlign: 'center',
        letterSpacing: 1.1,
        textShadow: '0 2px 8px #000a',
        fontFamily: 'inherit',
        borderBottom: '2px solid #23272f',
        paddingBottom: 12,
        marginTop: 0,
        width: '100%',
      }}>
        <span role="img" aria-label="Play">🎬</span> Streaming Sources
      </h2>
      {/* Source List */}
      {loading ? (
        <div style={{ color: '#ffe082', fontSize: 18, textAlign: 'center', fontWeight: 600, marginTop: 40 }}>
          <span className="loader" style={{ marginRight: 10 }}>⏳</span> Loading streaming sources...
        </div>
      ) : error ? (
        <div style={{ color: '#ffb300', fontSize: 18, textAlign: 'center', fontWeight: 600, marginTop: 40 }}>{error}</div>
      ) : filteredSources.length === 0 ? (
        <div style={{ color: '#bcbcbc', fontSize: 17, textAlign: 'center', marginTop: 40 }}>No streaming sources available</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', marginTop: 8 }}>
          {filteredSources.map((source, index) => {
            // Use a unique key for each source for selection
            const sourceKey = source.id || source.url || `${source.extensionName || ''}-${source.displayTitle || ''}-${index}`;
            const selectedKey = selectedSource && (selectedSource.id || selectedSource.url || `${selectedSource.extensionName || ''}-${selectedSource.displayTitle || ''}-${filteredSources.indexOf(selectedSource)}`);
            return (
              <div
                key={sourceKey}
                style={{
                  background: 'linear-gradient(90deg, #222428 0%, #19191c 100%)',
                  borderRadius: 18,
                  boxShadow: selectedKey === sourceKey ? '0 2px 24px #ffe08288' : '0 2px 16px #000a',
                  padding: '12px 14px 12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  border: selectedKey === sourceKey ? '2.5px solid #ffe082' : '1.5px solid #23272f',
                  transition: 'box-shadow 0.2s',
                  position: 'relative',
                  minHeight: 38,
                  cursor: 'pointer',
                  outline: 'none',
                  fontFamily: 'inherit',
                  animation: 'fadeIn 0.5s',
                  marginBottom: 2,
                  color: '#fff',
                }}
                tabIndex={0}
                onClick={() => onSourceSelect && onSourceSelect(source)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {source.displayTitle || 'Untitled Source'}
                  </span>
                  {source.subName && (
                    <span style={{ fontSize: 12, color: '#bcbcbc', whiteSpace: 'normal', overflowWrap: 'break-word' }}>
                      {source.subName}
                    </span>
                  )}
                  {source.extensionName && (
                    <span style={{ fontWeight: 400, fontSize: 12, color: '#ffe082', opacity: 0.9, marginTop: 2, letterSpacing: 0.2 }}>
                      {source.extensionName}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 2, marginBottom: 2 }}>
                  {source.restTitle && (
                    <span style={{ fontSize: 11, color: '#fff', background: '#23272f', borderRadius: 7, padding: '2px 8px', fontWeight: 600 }}>
                      {source.restTitle}
                    </span>
                  )}
                  {/* Add more metadata as needed */}
                </div>
                {source.description && (
                  <div style={{ color: '#bcbcbc', fontSize: 12, marginTop: 2, fontWeight: 400, opacity: 0.9, textShadow: '0 2px 8px #0007' }}>
                    {source.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </aside>
  );
}

export default SoloSources;