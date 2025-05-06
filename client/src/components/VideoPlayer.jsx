import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { LoadingSpinner } from "@/components/icons/LoadingSpinner"; // Assuming you have this component

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
  const [currentSeekTime, setCurrentSeekTime] = useState(0); // Track current seek position

  const source = location.state?.source;
  const infoHash = source?.infoHash;
  const fileIdx = source?.fileIdx ?? 0;

  // Effect to add the torrent and clean up by removing it
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
          console.log("Torrent add request sent successfully.");
          
          // Start polling immediately
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
          
          // FIXED: Set stream URL as soon as ANY data is available
          // 11% is definitely enough to start playback!
          if (data.ready) {
            const percent = data.percent_by_bytes_estimated || 0;
            console.log(`Progress: ${percent.toFixed(2)}% downloaded`);
            
            // If we have any data at all, we can start streaming
            if (!streamUrl && percent > 0) {
              console.log(`🎬 Starting video playback at ${percent.toFixed(2)}% downloaded!`);
              setStreamUrl(`${API_BASE_URL}/stream/${infoHash}/${fileIdx}`);
            }
          }
        }
      } catch (e) {
        console.error("Progress polling error:", e);
      }
      
      // Continue polling every 2 seconds
      setTimeout(pollProgress, 2000);
    };

    addTorrent();

    return () => {
      isMounted = false;
      
      // Cleanup: Remove the torrent when the component unmounts
      if (infoHash) {
        console.log(`Removing torrent ${infoHash} on unmount.`);
        fetch(`${API_BASE_URL}/remove/${infoHash}`, { method: 'DELETE' })
          .catch(removeError => console.error("Error removing torrent on unmount:", removeError));
      }
    };
  }, [infoHash, fileIdx]);

  // Video event handlers
  const handleCanPlay = () => {
    console.log("Video can play now");
    setIsLoading(false);
    setShowBuffering(false);
    
    if (bufferingTimeoutRef.current) {
      clearTimeout(bufferingTimeoutRef.current);
      bufferingTimeoutRef.current = null;
    }
  };
  
  const handleWaiting = () => {
    console.log("Video waiting for data");
    setIsLoading(true);
    
    if (bufferingTimeoutRef.current) {
      clearTimeout(bufferingTimeoutRef.current);
    }
    
    setShowBuffering(true);
    
    bufferingTimeoutRef.current = setTimeout(() => {
      setShowBuffering(false);
    }, 3000);
  };
  
  const handleError = (e) => {
    console.error("Video playback error:", e);
    setIsLoading(true);
  };

  // New handler for seeking - tell the server to prioritize pieces at the seek position
  const handleSeek = async () => {
    if (!videoRef.current || !infoHash) return;
    
    const seekTime = videoRef.current.currentTime;
    
    // Only react to significant changes in position
    if (Math.abs(seekTime - currentSeekTime) < 5) return;
    
    setCurrentSeekTime(seekTime);
    console.log(`Seeking to ${seekTime.toFixed(2)} seconds`);
    
    try {
      // Calculate approximate percentage through the file based on duration
      const duration = videoRef.current.duration || 0;
      if (duration > 0) {
        const percentage = (seekTime / duration) * 100;
        console.log(`Seek position: ${percentage.toFixed(2)}% through the video`);
        
        // Tell the server to prioritize pieces at this position
        const response = await fetch(`${API_BASE_URL}/prioritize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            infoHash, 
            fileIdx, 
            percentage 
          }),
        });
        
        if (response.ok) {
          console.log("Successfully prioritized pieces at seek position");
        }
      }
    } catch (error) {
      console.error("Failed to prioritize pieces:", error);
    }
  };

  // Error state
  if (error) {
    return (
      <div style={styles.statusContainer}>
        <p style={{ color: "#ff5252" }}>Error: {error}</p>
      </div>
    );
  }

  // No info hash
  if (!infoHash) {
    return (
      <div style={styles.statusContainer}>
        <p>No video source selected or infoHash is missing.</p>
      </div>
    );
  }

  // Calculate progress display
  const percent = progressInfo?.percent_by_bytes_estimated 
    ? Math.round(progressInfo.percent_by_bytes_estimated) 
    : 0;
    
  const downloadedMB = progressInfo?.completed_bytes_estimated
    ? (progressInfo.completed_bytes_estimated / 1024 / 1024).toFixed(1)
    : "0.0";
    
  const totalMB = progressInfo?.length_bytes
    ? (progressInfo.length_bytes / 1024 / 1024).toFixed(1)
    : "?";

  // Show loading UI if stream URL isn't set yet
  if (!streamUrl) {
    return (
      <div style={styles.statusContainer}>
        <LoadingSpinner size={48} color="#ffe082" />
        <div style={{ marginTop: 24 }}>
          Preparing stream, please wait...<br />
          {progressInfo?.ready && (
            <span>
              {percent}% downloaded ({downloadedMB} MB of {totalMB} MB)
            </span>
          )}
          {!progressInfo?.ready && progressInfo?.status && (
            <span>Status: {progressInfo.status}</span>
          )}
        </div>
      </div>
    );
  }

  // Main video player with progress overlay
  return (
    <div style={styles.videoContainer}>
      <video
        ref={videoRef}
        controls
        autoPlay
        playsInline
        preload="auto"
        style={styles.video}
        src={streamUrl}
        onCanPlay={handleCanPlay}
        onWaiting={handleWaiting}
        onError={handleError}
        onSeeking={handleSeek}
        onSeeked={handleSeek}
      >
        Your browser does not support the video tag.
      </video>
      
      {isLoading && (
        <div style={styles.overlay}>
          <LoadingSpinner size={36} color="#ffe082" />
          <div style={{ marginTop: 10 }}>
            Buffering... {percent}% downloaded
            <div style={{ fontSize: '12px', marginTop: '5px' }}>
              {downloadedMB} MB of {totalMB} MB
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Improved styles
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
    boxSizing: "border-box",
  },
  videoContainer: {
    width: '100%', 
    backgroundColor: '#000',
    position: 'relative'
  },
  video: {
    width: '100%', 
    maxHeight: 'calc(100vh - 100px)', 
    display: 'block'
  },
  overlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: '20px',
    borderRadius: '10px',
    color: '#ffe082',
    textAlign: 'center',
    zIndex: 10
  }
};