import React, { useEffect, useState } from "react";
import { useLocation, useBeforeUnload } from "react-router-dom";
import { LoadingSpinner } from "@/components/icons/LoadingSpinner";

const API_BASE_URL = "http://localhost:8888";

export default function VideoPlayer() {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [isMpvActive, setIsMpvActive] = useState(false);
  const [isOverlayMode, setIsOverlayMode] = useState(false); // Added missing state variable

  const source = location.state?.source;
  const infoHash = source?.infoHash;
  const fileIdx = source?.fileIdx ?? 0;

  let magnetUri = source?.magnetUri;
  if (!magnetUri && infoHash) {
    magnetUri = `magnet:?xt=urn:btih:${infoHash}`;
  }

  const details = location.state?.details || {};
  const movieTitle = source?.title || details.title || "Loading video...";
  const movieYear = details.year || "";

  useEffect(() => {
    if (!magnetUri || magnetUri.includes('undefined')) {
      setError("No valid magnet URI or infoHash provided.");
      return;
    }
    setStreamUrl(null);
    setError(null);
    setIsLoading(true);
    let infoHashResult = null;
    const addTorrent = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            magnet: magnetUri,
            fileIdx: fileIdx
          }),
        });
        let data = null;
        if (response.ok) {
          data = await response.json();
        } else {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            data = await response.json();
          }
          if (response.status === 504) {
            throw new Error('Could not fetch torrent metadata. This torrent may have no seeds or is not available.');
          }
          throw new Error((data && data.error) || `Failed to add torrent: ${response.statusText}`);
        }
        infoHashResult = data.infoHash;
        if (!infoHashResult) throw new Error("No infoHash returned from backend");

        const directStreamUrl = `${API_BASE_URL}/stream/${infoHashResult}/${fileIdx}`;
        setStreamUrl(directStreamUrl);
        setIsLoading(false);
      } catch (err) {
        setError(`Error adding torrent: ${err.message}`);
        setIsLoading(false);
      }
    };

    addTorrent();

    return () => {
      setStreamUrl(null);
      if (infoHashResult) {
        fetch(`${API_BASE_URL}/remove/${infoHashResult}`, { method: 'DELETE' })
          .catch(removeError => console.error("Error removing torrent on unmount:", removeError));
      }
    };
  }, [magnetUri, fileIdx]);

  // Automatically launch MPV when streamUrl becomes available
  useEffect(() => {
    if (streamUrl) {
      window.electronAPI.playInMpv(streamUrl)
        .then((result) => {
          if (result && result.success) {
            setIsMpvActive(true);
          }
          else {
            setIsMpvActive(false);
          }
        })
        .catch(err => {
          setError('Failed to launch MPV: ' + err.message);
          setIsMpvActive(false);
        });
    } else {
      setIsMpvActive(false);
    }
  }, [streamUrl]);

  useBeforeUnload(
    React.useCallback(() => {
      if (streamUrl) {
        window.electron.ipcRenderer.invoke('stop-mpv').then(() => setIsMpvActive(false)).catch(err => {
          console.error('Failed to stop MPV:', err);
        });
      }
    })
  );

  if (error) {
    return (
      <div style={styles.statusContainer}>
        <p style={{ color: "#ff5252" }}>Error: {error}</p>
      </div>
    );
  }

  if (!streamUrl) {
    return (
      <div style={styles.modernLoadingScreen}>
        <div style={styles.modernLoadingContent}>
          <LoadingSpinner size={60} color="#ffe082" />
          <h2 style={styles.modernMovieTitleFallback}>{movieTitle || "Loading Video..."}</h2>
          {isLoading && <p style={{ color: '#ffe082', marginTop: 18, fontSize: 18 }}>Fetching torrent metadata...</p>}
          {movieYear && <p style={styles.modernYearDisplay}>({movieYear})</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.videoContainer}>
      {isMpvActive && !isOverlayMode && (
        <button 
          style={{position:'absolute',top:20,left:20,zIndex:2000}} 
          onClick={() => {
            // First hide MPV
            window.electron.ipcRenderer.invoke('hide-mpv')
              .then((result) => {
                console.log("Hide MPV result:", result);
                // Then switch to overlay mode
                setIsOverlayMode(true);
                // Stop streaming by removing the stream URL
                setStreamUrl(null);
                setIsMpvActive(false);
              })
              .catch(err => {
                console.error("Failed to hide MPV:", err);
                // Still switch to overlay mode even if hiding fails
                setIsOverlayMode(true);
              });
          }}>
          Back to Overlay
        </button>
      )}
    </div>
  );
}

const styles = {
  statusContainer: {
    width: "100%",
    maxWidth: 900,
    margin: "40px auto",
    background: "#18181b",
    borderRadius: 18,
    boxShadow: "0 8px 32px #000c, 0 0 16px #0006",
    padding: 48,
    color: "#ffe082",
    textAlign: "center",
    boxSizing: "border-box"
  },
  modernLoadingScreen: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#e0e0e0',
    zIndex: 1999,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    overflow: 'hidden',
    backgroundColor: '#121214',
  },
  modernLoadingContent: {
    position: "relative",
    zIndex: 2002,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '20px',
  },
  modernMovieTitleFallback: {
    fontSize: '2.2rem',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '10px',
    textShadow: '0 2px 6px rgba(0,0,0,0.5)',
    textAlign: 'center',
    padding: '0 20px',
  },
  modernYearDisplay: {
    fontSize: '1.1rem',
    color: '#b0b0b0',
    textAlign: 'center',
    marginBottom: '20px',
  },
  videoContainer: {
    width: "100vw",
    height: "100vh",
    backgroundColor: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
};