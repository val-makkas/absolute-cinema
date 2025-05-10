import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { LoadingSpinner } from "@/components/icons/LoadingSpinner";

const API_BASE_URL = "http://localhost:5050";

export default function VideoPlayer() {
  const videoRef = useRef(null);
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [progressInfo, setProgressInfo] = useState(null);
  const [error, setError] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [showBuffering, setShowBuffering] = useState(false);
  const bufferingTimeoutRef = useRef(null);
  const [currentSeekTime, setCurrentSeekTime] = useState(0);

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

          if (data.ready || data.percent_by_bytes_estimated > 0) {
            const percent = data.percent_by_bytes_estimated || 0;

            if (!streamUrl) {
              setStreamUrl(`${API_BASE_URL}/stream/${infoHash}/${fileIdx}`);
            }
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

      if (infoHash) {
        fetch(`${API_BASE_URL}/remove/${infoHash}`, { method: 'DELETE' })
          .catch(removeError => console.error("Error removing torrent on unmount:", removeError));
      }
    };
  }, [infoHash, fileIdx]);

  const handleCanPlay = () => {
    setShowBuffering(false);
    if (bufferingTimeoutRef.current) {
      clearTimeout(bufferingTimeoutRef.current);
      bufferingTimeoutRef.current = null;
    }
    // Autoplay if paused after canplay
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play().catch(e => {
        console.log("Autoplay attempt after canPlay was blocked or failed:", e);
      });
    }
  };

  const handlePlaying = () => {
    setIsLoading(false); // Hide full screen loader
    setShowBuffering(false); // Hide buffering spinner
  };

  const handleWaiting = () => {
    if (bufferingTimeoutRef.current) {
      clearTimeout(bufferingTimeoutRef.current);
    }

    bufferingTimeoutRef.current = setTimeout(() => {
      // setIsLoading(true); // This line is removed to prevent full loader on subsequent buffers
      // setShowBuffering(true);
    }, 500);
  };

  const handleError = (e) => {
    console.error("Video playback error:", e);
    setIsLoading(true);
  };

  const handleSeek = async () => {
    if (!videoRef.current || !infoHash) return;

    const seekTime = videoRef.current.currentTime;
    if (Math.abs(seekTime - currentSeekTime) < 5) return;

    setCurrentSeekTime(seekTime);

    try {
      const duration = videoRef.current.duration || 0;
      if (duration > 0) {
        const percentage = (seekTime / duration) * 100;

        await fetch(`${API_BASE_URL}/prioritize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ infoHash, fileIdx, percentage }),
        });
      }
    } catch (error) {
      console.error("Failed to prioritize pieces:", error);
    }
  };

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
  
  // NEW Modern Loading Screen JSX
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
      <div style={styles.modernPosterOverlay}></div> {/* Overlay to ensure content is readable */}
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(0.90); opacity: 0.7; box-shadow: 0 0 0 0 rgba(255, 224, 130, 0.7); }
            50% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 15px rgba(255, 224, 130, 0); }
            100% { transform: scale(0.90); opacity: 0.7; box-shadow: 0 0 0 0 rgba(255, 224, 130, 0); }
          }
        `}
      </style>
      <div style={styles.modernLoadingContent}> {/* Added a content wrapper for z-indexing */} 
        {movieAvatar ? (
          <img src={movieAvatar} alt={movieTitle || "Video Title"} style={styles.modernAvatarAsTitle} />
        ) : (
          <>
            <div style={styles.loadingAnimationContainer}> {/* Contains pulsing dot */}
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
        ref={videoRef}
        controls
        autoPlay
        playsInline
        preload="auto"
        style={{
          ...styles.video,
          visibility: isLoading ? 'hidden' : 'visible'
        }}
        src={streamUrl}
        onCanPlay={handleCanPlay}
        onPlaying={handlePlaying} // Changed to handlePlaying
        onWaiting={handleWaiting}
        onError={handleError}
        onSeeking={handleSeek}
        onSeeked={handleSeek}
      >
        Your browser does not support the video tag.
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
  // End of new styles

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
  // Removed old styles: fullscreenLoading, posterBackground, posterImage, posterOverlay, 
  // loadingContent, avatarContainer, avatarWrapper, /* avatarImage (removed) */, progressCircle, 
  // progressBg, /* avatarTitleContainer, avatarTitle (removed) , avatarYear (removed) */, loadingStatus, 
  // progressDisplay, progressBar
};
