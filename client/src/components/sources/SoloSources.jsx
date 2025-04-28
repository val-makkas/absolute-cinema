import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';

function SoloSources({ extensionManifests = {} }) {
  const { imdbID } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const cardRef = useRef(null);

  const movieDetails = location.state?.details || null;

  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [show, setShow] = useState(false);

  // Animate in on mount
  useEffect(() => {
    setTimeout(() => setShow(true), 10);
  }, []);

  // Animate out and go back
  const handleBackgroundClick = (e) => {
    if (cardRef.current && !cardRef.current.contains(e.target)) {
      setShow(false);
      setTimeout(() => navigate(-1), 420);
    }
  };

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
            if (Array.isArray(data)) {
              streams = data;
            } else if (Array.isArray(data.streams)) {
              streams = data.streams;
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
            // No streams for this extension, skip
          }
        }
        setSources(allSources);
      } catch (err) {
        setError("Failed to load streaming sources");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStreamingSources();
  }, [imdbID, extensionManifests]);

  const poster = movieDetails?.poster || movieDetails?.poster_path
    ? (movieDetails?.poster || `https://image.tmdb.org/t/p/w500${movieDetails.poster_path}`)
    : null;

  // Card-style modal (not full poster background)
  return (
    <div
      onMouseDown={handleBackgroundClick}
      style={{
        minHeight: '100vh',
        width: '100vw',
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        overflow: 'hidden',
        fontFamily: "'Inter', 'Montserrat', 'Poppins', Arial, sans-serif",
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.5s cubic-bezier(.4,0,.2,1)',
        backdropFilter: show ? 'blur(16px)' : 'blur(0px)',
      }}
    >
      <div
        ref={cardRef}
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 540,
          width: '100%',
          margin: '0 auto',
          background: 'rgba(24,24,27,0.97)',
          borderRadius: 22,
          boxShadow: '0 8px 40px 0 rgba(31, 38, 40, 0.45)',
          border: '1.5px solid #23272f',
          padding: '2.8rem 2.3rem 2.2rem 2.3rem',
          color: '#e5e5e5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2.2rem',
          transform: show ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(60px)',
          opacity: show ? 1 : 0,
          transition: 'transform 0.42s cubic-bezier(.4,0,.2,1), opacity 0.42s cubic-bezier(.4,0,.2,1)',
          backdropFilter: 'blur(8px)',
          boxSizing: 'border-box',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {movieDetails && (
          <div style={{ textAlign: 'center' }}>
            <img
              src={poster}
              alt={movieDetails.title}
              style={{
                width: 120,
                height: 180,
                objectFit: 'cover',
                borderRadius: 14,
                marginBottom: 18,
                boxShadow: '0 2px 12px #23272f77',
              }}
            />
            <h1 style={{ fontWeight: 900, fontSize: 28, color: '#ffe082', marginBottom: 8 }}>
              {movieDetails.title}
            </h1>
            <div style={{ color: '#bcbcbc', fontSize: 16, marginBottom: 8 }}>
              {movieDetails.release_date}
            </div>
            <div style={{ color: '#e5e5e5', fontSize: 15, fontStyle: 'italic', marginBottom: 8 }}>
              {movieDetails.overview}
            </div>
          </div>
        )}
        <h2 style={{ fontWeight: 700, fontSize: 22, color: '#ffe082', marginBottom: 18 }}>
          Streaming Sources
        </h2>
        {loading ? (
          <div style={{ color: '#ffe082', fontSize: 18 }}>Loading streaming sources...</div>
        ) : error ? (
          <div style={{ color: '#ffb300', fontSize: 18 }}>{error}</div>
        ) : sources.length === 0 ? (
          <div style={{ color: '#bcbcbc', fontSize: 17 }}>No streaming sources available</div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            width: '100%',
          }}>
            {sources.map((source, index) => (
              <a
                key={index}
                href={source.url || source.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  background: 'rgba(32,32,40,0.85)',
                  borderRadius: 12,
                  padding: '1.1rem 1.5rem',
                  color: '#ffe082',
                  fontWeight: 700,
                  fontSize: 18,
                  textDecoration: 'none',
                  boxShadow: '0 1px 6px #0005',
                  border: '1.5px solid #23272f',
                  transition: 'background 0.18s, color 0.18s',
                }}
                onMouseOver={e => e.currentTarget.style.background = '#23272f'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(32,32,40,0.85)'}
              >
                <span style={{ flex: 1 }}>
                  {source.title || source.name || source.provider_name || 'Stream'}
                  {source.extensionName && (
                    <span style={{ fontWeight: 400, fontSize: 14, color: '#bcbcbc', marginLeft: 12 }}>
                      via {source.extensionName}
                    </span>
                  )}
                </span>
                <span style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#fff',
                  background: '#ff7e5f',
                  borderRadius: 8,
                  padding: '4px 12px',
                  marginLeft: 8,
                }}>
                  Watch
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SoloSources;