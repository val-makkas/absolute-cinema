import React, { useEffect, useRef, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { LoadingSpinner } from "@/components/icons/LoadingSpinner";
import Hls from "hls.js";

const API_BASE_URL = "http://localhost:5050";

export default function VideoPlayer() {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [progressInfo, setProgressInfo] = useState(null);
  const [error, setError] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [showBuffering, setShowBuffering] = useState(false);
  const [useHls, setUseHls] = useState(false);
  const videoRef = useRef(null);
  const bufferingTimeoutRef = useRef(null);
  const streamUrlSetRef = useRef(false); // Prevents multiple streamUrl sets

  const source = location.state?.source;
  const infoHash = source?.infoHash;
  const fileIdx = source?.fileIdx ?? 0;

  const details = location.state?.details || {};
  const movieTitle = source?.title || details.title || "Loading video...";
  const moviePoster = details.poster || null;
  const movieAvatar = details.avatar || null;
  const movieYear = details.year || "";

  useEffect(() => {
    if (!infoHash) {
      setError("No torrent infoHash provided.");
      return;
    }

    let isMounted = true;
    streamUrlSetRef.current = false; // Reset when infoHash/fileIdx changes
    setStreamUrl(null); // Reset streamUrl on new video
    setUseHls(false);

    const addTorrent = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ infoHash }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Failed to add torrent: ${response.statusText}`);
        }

        // Wait for metadata (duration) before polling progress
        let duration = null;
        for (let i = 0; i < 45; i++) { // up to 30s
          const metaRes = await fetch(`${API_BASE_URL}/progress/${infoHash}/${fileIdx}`);
          if (metaRes.ok) {
            const metaData = await metaRes.json();
            if (metaData.duration && metaData.duration > 0) {
              duration = metaData.duration;
              break;
            }
          }
          await new Promise(r => setTimeout(r, 1000));
        }
        if (!duration) {
          setError('Failed to get video duration metadata.');
          return;
        }
        if (isMounted) {
          pollProgress();
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error adding torrent:", err);
          setError(`Error adding torrent: ${err.message}`);
        }
      }
    };

    const pollProgress = async () => {
      if (!isMounted) return;

      try {
        const response = await fetch(`${API_BASE_URL}/progress/${infoHash}/${fileIdx}`);

        if (response.ok) {
          const data = await response.json();
          setProgressInfo(data);

          // Only start HLS when at least 2%
          if (data.percent_by_bytes_estimated >= 3) {
            const hlsUrl = `${API_BASE_URL}/hls/${infoHash}/${fileIdx}/playlist.m3u8`;
            setTimeout(() => {
              setStreamUrl(hlsUrl);
              setUseHls(true);
              streamUrlSetRef.current = true;
            }, 4000); // Wait 4 seconds before setting streamUrl/useHls
            return;
          }
        }
      } catch (e) {
        console.error("Progress polling error:", e);
      }

      let pollInterval = 1000;

      if (progressInfo?.percent_by_bytes_estimated) {
        const percent = progressInfo.percent_by_bytes_estimated;
        if (percent > 15) pollInterval = 2000;
        if (percent > 50) pollInterval = 3000;
        if (percent > 80) pollInterval = 5000;
      }

      setTimeout(pollProgress, pollInterval);
    };

    addTorrent();

    return () => {
      isMounted = false;
      streamUrlSetRef.current = false;
      setStreamUrl(null);
      if (infoHash) {
        fetch(`${API_BASE_URL}/remove/${infoHash}`, { method: 'DELETE' })
          .catch(removeError => console.error("Error removing torrent on unmount:", removeError));
      }
    };
  }, [infoHash, fileIdx]);

  // Debug: Log Plyr mount/unmount
  useEffect(() => {
    if (!streamUrl) return;
    console.log("[VideoPlayer] mounted with streamUrl:", streamUrl);
    return () => {
      console.log("[VideoPlayer] unmounted");
    };
  }, [streamUrl]);

  // HLS.js setup
  useEffect(() => {
    if (!useHls || !streamUrl || !videoRef.current) return;
    let hls;
    let lastSeekTime = 0;
    let seeking = false;

    // Add cache-busting param to streamUrl
    const hlsUrl = streamUrl.includes('?') ? `${streamUrl}&t=${Date.now()}` : `${streamUrl}?t=${Date.now()}`;

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: false, // Electron/Windows: avoid worker bugs
        debug: true, // Enable debug logs
        lowLatencyMode: true,
        backBufferLength: 60,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
      });
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.MANIFEST_PARSED, () => setIsLoading(false));
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('[HLS.js ERROR]', data);
        if (data.details === 'levelEmptyError') {
          // Gracefully handle empty playlist at end of stream
          setIsLoading(false);
          setShowBuffering(false);
          // Optionally show a toast or message, but do not set fatal error
          return;
        }
        if (data.fatal) setError("HLS playback error: " + data.type + (data.details ? ` (${data.details})` : ''));
      });
      // Custom seeking logic
      videoRef.current.onseeking = async () => {
        if (!progressInfo?.duration) return;
        const seekTime = Math.floor(videoRef.current.currentTime);
        if (seeking || Math.abs(seekTime - lastSeekTime) < 2) return;
        seeking = true;
        lastSeekTime = seekTime;
        setIsLoading(true);
        // Build seek HLS URL with cache-busting
        const seekUrl = `${API_BASE_URL}/hls/${infoHash}/${fileIdx}/seek/${seekTime}/playlist.m3u8?t=${Date.now()}`;
        hls.detachMedia();
        hls.loadSource(seekUrl);
        hls.attachMedia(videoRef.current);
        setTimeout(() => { seeking = false; }, 1000);
      };
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = hlsUrl;
    }
    return () => {
      if (hls) hls.destroy && hls.destroy();
      if (videoRef.current) videoRef.current.onseeking = null;
    };
  }, [useHls, streamUrl, infoHash, fileIdx, progressInfo?.duration]);

  if (error) {
    return (
      <div style={styles.statusContainer}>
        <p style={{ color: "#ff5252" }}>Error: {error}</p>
      </div>
    );
  }

  if (!infoHash) {
    return (
      <div style={styles.statusContainer}>
        <p>No video source selected or infoHash is missing.</p>
      </div>
    );
  }

  const percent = progressInfo?.percent_by_bytes_estimated
    ? Math.round(progressInfo.percent_by_bytes_estimated)
    : 0;

  const downloadedMB = progressInfo?.completed_bytes_estimated
    ? (progressInfo.completed_bytes_estimated / 1024 / 1024).toFixed(1)
    : "0.0";

  const totalMB = progressInfo?.length_bytes
    ? (progressInfo.length_bytes / 1024 / 1024).toFixed(1)
    : "?";
  
  const modernLoadingScreenJsx = (
    <div style={{...styles.modernLoadingScreen, ...(moviePoster ? {} : styles.modernLoadingScreenFallbackBackground)}}
      role="dialog"
      aria-modal="true"
      aria-describedby="video-player-desc"
    >
      {moviePoster && (
        <div style={styles.modernPosterBackground}>
          <img src={moviePoster} alt="Movie Poster Background" style={styles.modernPosterImage} />
        </div>
      )}
      <div style={styles.modernPosterOverlay}></div>
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(0.90); opacity: 0.7; box-shadow: 0 0 0 0 rgba(255, 224, 130, 0.7); }
            50% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 15px rgba(255, 224, 130, 0); }
            100% { transform: scale(0.90); opacity: 0.7; box-shadow: 0 0 0 0 rgba(255, 224, 130, 0); }
          }
        `}
      </style>
      <div style={styles.modernLoadingContent}>
        {movieAvatar ? (
          <img src={movieAvatar} alt={movieTitle || "Video Title"} style={styles.modernAvatarAsTitle} />
        ) : (
          <>
            <div style={styles.loadingAnimationContainer}>
              <div style={styles.pulsingDot}></div>
            </div>
            <h2 style={styles.modernMovieTitleFallback}>{movieTitle || "Loading Video..."}</h2>
          </>
        )}
        {movieYear && <p style={styles.modernYearDisplay}>({movieYear})</p>}
        <div style={styles.modernProgressDetails}>
          <p style={styles.modernLoadingText}>
            {progressInfo?.status && !(progressInfo?.ready || percent > 0) 
              ? progressInfo.status 
              : (percent < 100 ? `Loading: ${percent}%` : "Stream Ready!")}
          </p>
          {(progressInfo?.ready || percent > 0) && (
            <p style={styles.modernStatsText}>
              {downloadedMB} MB of {totalMB} MB downloaded
            </p>
          )}
        </div>
        <div style={styles.modernProgressBarOuter}>
          <div style={{ ...styles.modernProgressBarInner, width: `${percent}%` }}></div>
        </div>
        <p id="video-player-desc" style={{ display: 'none' }}>
          Video player dialog for streaming movies. Shows loading progress and video controls.
        </p>
      </div>
    </div>
  );

  if (!streamUrl) {
    return modernLoadingScreenJsx;
  }

  return (
    <div style={styles.videoContainer}>
      <video
        key={streamUrl}
        ref={videoRef}
        poster={moviePoster}
        controls
        autoPlay={false}
        style={{
          width: '100%',
          height: '100%',
          background: '#000',
          borderRadius: 16,
          boxShadow: '0 0 32px #000a',
          outline: 'none',
          ...styles.video,
        }}
        onCanPlay={() => {
          setIsLoading(false);
          if (streamUrlSetRef.current) {
            videoRef.current.play();
          }
        }}
        onWaiting={() => setShowBuffering(true)}
        onPlaying={() => setShowBuffering(false)}
        onPause={() => setShowBuffering(false)}
      >
        Sorry, your browser does not support embedded videos.
      </video>
      {/* Buffering spinner for when video is playing but temporarily waiting */}
      {!isLoading && showBuffering && (
        <div style={styles.bufferingOverlay}>
          <LoadingSpinner size={60} color="#FFFFFF" />
        </div>
      )}
      {/* Initial full-screen loading experience */}
      {isLoading && modernLoadingScreenJsx}
    </div>
  );
}

const styles = {
  statusContainer: {
    width: "100%",
    maxWidth: 900,
    margin: "40px auto",
    background: "#18181b", // Kept for error messages
    borderRadius: 18,
    boxShadow: "0 8px 32px #000c, 0 0 16px #0006",
    padding: 48,
    color: "#ffe082",
    textAlign: "center",
    boxSizing: "border-box"
  },
  // Styles for the new modern loading screen
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
    // background: 'linear-gradient(-45deg, #0d0d1e, #1a1a30, #0f0f24, #2c2c4d)', // Removed gradient
    // backgroundSize: '400% 400%', // Removed gradient
    // animation: 'subtleGradient 15s ease infinite', // Removed gradient
    color: '#e0e0e0',
    zIndex: 1999, // Adjusted zIndex to be below potential overlays but above page content
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    overflow: 'hidden',
  },
  modernLoadingScreenFallbackBackground: { // Added for when no poster is available
    backgroundColor: '#121214', // A dark fallback
  },
  modernPosterBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 2000, // Above loading screen base, below content
    overflow: "hidden",
  },
  modernPosterImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    filter: "blur(18px) brightness(0.5)", // Adjusted brightness
    transform: "scale(1.1)"
  },
  modernPosterOverlay: { // Ensures content on top of poster is readable
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Dark overlay
    zIndex: 2001, // Above poster, below content
  },
  modernLoadingContent: { // Wrapper for all content to sit above poster/overlay
    position: "relative",
    zIndex: 2002,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '20px', // Add some padding
  },
  modernAvatarAsTitle: { // New style for avatar used as title
    maxWidth: 'clamp(200px, 50vw, 320px)',
    maxHeight: '120px',
    objectFit: 'contain',
    display: 'block', // Ensures proper block-level behavior for margins
    marginLeft: 'auto',
    marginRight: 'auto',
    marginBottom: '10px', // Space before year or progress details
  },
  modernMovieTitleFallback: { // Used when no avatar, similar to old modernMovieTitle
    fontSize: '2.2rem',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '10px', // Space before year or progress details
    textShadow: '0 2px 6px rgba(0,0,0,0.5)',
    textAlign: 'center',
    padding: '0 20px',
  },
  modernYearDisplay: { // New consolidated style for year
    fontSize: '1.1rem',
    color: '#b0b0b0',
    textAlign: 'center',
    marginBottom: '20px', // Space before progress details
  },
  loadingAnimationContainer: {
    marginBottom: '10px', // Adjusted from 30px, space between dot and fallback title
  },
  pulsingDot: { 
    width: '70px',
    height: '70px',
    backgroundColor: '#ffe082', 
    borderRadius: '50%',
    animation: 'pulse 2s infinite ease-in-out',
    boxShadow: '0 0 25px #ffe082, 0 0 35px #ffe082aa, 0 0 50px #ffe08255', 
  },
  modernProgressDetails: {
    textAlign: 'center',
    marginBottom: '15px', // Reduced margin
    width: '90%', // Wider for better text flow
    maxWidth: '450px', // Slightly reduced max width
  },
  modernLoadingText: {
    fontSize: '1.0rem', // Slightly adjusted
    color: '#d0d0d0', // Lighter grey
    marginBottom: '6px',
    minHeight: '1.4em', 
  },
  modernStatsText: {
    fontSize: '0.85rem', // Slightly adjusted
    color: '#a0a0a0',
  },
  modernProgressBarOuter: {
    width: '70%', // Reduced width
    maxWidth: '400px', // Reduced max width
    height: '6px', // Thinner bar
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    borderRadius: '3px',
    overflow: 'hidden',
    marginTop: '15px', 
  },
  modernProgressBarInner: {
    height: '100%',
    backgroundColor: '#ffe082', 
    borderRadius: '3px',
    transition: 'width 0.4s ease-out', 
    boxShadow: '0 0 8px #ffe082, 0 0 4px #ffe082aa', 
  },

  videoContainer: {
    width: "100vw",
    height: "100vh",
    backgroundColor: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative", // Added for potential future overlays if needed
  },
  video: {
    maxWidth: "100%",
    maxHeight: "100%",
    outline: "none",
    boxShadow: "0 0 20px rgba(0,0,0,0.5)",
  },
  bufferingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)', // Slight dark overlay
    zIndex: 2003, // Ensure it's above the video
  },
};