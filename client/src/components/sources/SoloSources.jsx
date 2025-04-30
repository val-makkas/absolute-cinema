import React, { useState, useEffect, useRef } from 'react';

function SoloSources({ extensionManifests = {}, details, sidebarMode }) {
  const imdbID = details?.imdb_id || details?.id;
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
              ...streams.map((source) => ({
                ...source,
                extensionName: manifest.name || baseUrl,
              }))
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

  // --- BEAUTIFUL UI STARTS HERE ---
  return (
    <div style={{ width: '100%', padding: 0 }}>
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
      }}>
        <span role="img" aria-label="Play">🎬</span> Streaming Sources
      </h2>
      {loading ? (
        <div style={{ color: '#ffe082', fontSize: 18, textAlign: 'center', fontWeight: 600, marginTop: 40 }}>
          <span className="loader" style={{ marginRight: 10 }}>⏳</span> Loading streaming sources...
        </div>
      ) : error ? (
        <div style={{ color: '#ffb300', fontSize: 18, textAlign: 'center', fontWeight: 600, marginTop: 40 }}>{error}</div>
      ) : sources.length === 0 ? (
        <div style={{ color: '#bcbcbc', fontSize: 17, textAlign: 'center', marginTop: 40 }}>No streaming sources available</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', marginTop: 8 }}>
          {sources.map((source, index) => (
            <div
              key={index}
              style={{
                background: 'linear-gradient(90deg, #23272f 0%, #18181b 100%)',
                borderRadius: 16,
                boxShadow: '0 2px 16px #000a',
                padding: '20px 18px 18px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                border: '1.5px solid #31343b',
                transition: 'box-shadow 0.2s',
                position: 'relative',
                minHeight: 72,
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'inherit',
                animation: 'fadeIn 0.5s',
              }}
              tabIndex={0}
              onClick={() => window.open(source.url || source.externalUrl, '_blank')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontWeight: 800, fontSize: 17, color: '#ffe082', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {source.title || source.name || 'Untitled Source'}
                </span>
                <span style={{ fontSize: 13, color: '#6ee7b7', fontWeight: 700, background: '#23272f', borderRadius: 8, padding: '3px 10px', marginRight: 4 }}>
                  {source.extensionName}
                </span>
                <button
                  style={{
                    background: 'linear-gradient(90deg, #ff7e5f 0%, #feb47b 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    fontWeight: 900,
                    fontSize: 15,
                    padding: '8px 18px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px #ff7e5f44',
                    transition: 'transform 0.1s',
                    fontFamily: 'inherit',
                    marginLeft: 8,
                  }}
                  onClick={e => {
                    e.stopPropagation();
                    window.open(source.url || source.externalUrl, '_blank');
                  }}
                >
                  Watch
                </button>
              </div>
              {source.description && (
                <div style={{ color: '#bcbcbc', fontSize: 14, marginTop: 2, fontWeight: 400, opacity: 0.9, textShadow: '0 2px 8px #0007' }}>
                  {source.description}
                </div>
              )}
              {source.quality && (
                <div style={{ color: '#ffe082', fontSize: 13, fontWeight: 700, marginTop: 2, letterSpacing: 0.5 }}>
                  Quality: {source.quality}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}

export default SoloSources;