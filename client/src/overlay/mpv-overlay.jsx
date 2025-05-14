import React, { useState, useEffect, useRef } from 'react';
import './mpv-overlay.css';

const MpvOverlay = () => {
  // State for player controls
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isHovering, setIsHovering] = useState(false);
  const seekBarRef = useRef(null);
  
  // Refs
  const updateIntervalRef = useRef(null);
  const previousVolumeRef = useRef(100);
  
  // Format time in MM:SS format
  const formatTime = (seconds) => {
    seconds = Math.floor(seconds);
    const minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Get volume icon based on level
  const getVolumeIcon = () => {
    if (volume === 0) return '🔇';
    if (volume < 50) return '🔉';
    return '🔊';
  };
  
  // Initialize player state
  useEffect(() => {
    const initPlayerState = async () => {
      try {
        // Get initial state from MPV
        const pauseState = await window.mpvControls.getPlaybackState();
        setIsPaused(pauseState);
        
        const volumeValue = await window.mpvControls.getVolume() || 100;
        setVolume(volumeValue);
        
        // Start updating progress
        startProgressUpdates();
      } catch (err) {
        console.error('Error initializing player state:', err);
      }
    };
    
    initPlayerState();
    
    // Clean up on unmount
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);
  
  // Start interval to update progress
  const startProgressUpdates = () => {
    updateIntervalRef.current = setInterval(async () => {
      try {
        const currentTimeValue = await window.mpvControls.getCurrentTime() || 0;
        const durationValue = await window.mpvControls.getDuration() || 0;
        
        setCurrentTime(currentTimeValue);
        setDuration(durationValue);
      } catch (err) {
        console.error('Error updating progress:', err);
      }
    }, 1000);
  };
  
  // Handle play/pause toggle
  const handlePlayPause = async () => {
    await window.mpvControls.togglePlay();
    setIsPaused(!isPaused);
  };
  
  // Handle volume change
  const handleVolumeChange = async (e) => {
    const value = parseInt(e.target.value);
    await window.mpvControls.setVolume(value);
    setVolume(value);
  };
  
  // Handle mute toggle
  const handleMuteToggle = async () => {
    if (volume > 0) {
      // Store current volume and mute
      previousVolumeRef.current = volume;
      await window.mpvControls.setVolume(0);
      setVolume(0);
    } else {
      // Restore previous volume
      const prevVolume = previousVolumeRef.current;
      await window.mpvControls.setVolume(prevVolume);
      setVolume(prevVolume);
    }
  };
  
  // Handle fullscreen toggle
  const handleFullscreen = async () => {
  try {
    // Then toggle MPV fullscreen
    console.log("Toggling MPV fullscreen...");
    await window.mpvControls.toggleFullscreen();
  } catch (err) {
    console.error("Fullscreen error:", err);
  }
};

  return (
    <div className="mpv-overlay" style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100vh',
      pointerEvents: 'auto',
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      {/* Close button absolutely positioned at top right of overlay, with modern SVG */}
      <button
        onClick={async () => {
          if (window.mpvControls && window.mpvControls.hideMpv) {
            window.mpvControls.hideMpv();
          }
        }}
        style={{
          position: 'absolute',
          top: 32,
          right: 40,
          background: 'rgba(30,30,30,0.55)',
          border: 'none',
          borderRadius: '50%',
          width: 56,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 300,
          transition: 'background 0.2s, box-shadow 0.2s',
          boxShadow: '0 4px 24px #0008',
          backdropFilter: 'blur(6px)',
        }}
        title="Close"
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{opacity: 0.85}}>
          <circle cx="16" cy="16" r="15" fill="rgba(255,255,255,0.08)"/>
          <line x1="10" y1="10" x2="22" y2="22" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="22" y1="10" x2="10" y2="22" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </button>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginLeft: 24,
      }}>
        {/* Title and time overlay */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}>
          <div style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#fff',
            textShadow: '0 2px 12px #000b',
            marginBottom: 2,
            letterSpacing: 0.2,
            lineHeight: 1.1,
          }}>
            Avengers: Infinity War
          </div>
        </div>
      </div>
      <div className="overlay-container visible" style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0.0) 100%)',
        padding: '0 0 24px 0',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        pointerEvents: 'auto',
      }}>
        {/* Seek bar */}
        <div style={{
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 0,
        }}>
          <input
            ref={seekBarRef}
            type="range"
            min={0}
            max={duration}
            step={1}
            value={currentTime}
            onChange={async (e) => {
              const newTime = Number(e.target.value);
              await window.mpvControls.seek(newTime);
              setCurrentTime(newTime);
            }}
            className="progress-bar"
            style={{
              width: '92vw',
              height: 12,
              accentColor: '#ffe082', // Use the current yellow
              background: 'rgba(255,255,255,0.18)',
              borderRadius: 8,
              margin: '0 0 0 0',
              boxShadow: '0 2px 12px #0008',
              outline: 'none',
              border: 'none',
              transition: 'box-shadow 0.2s',
            }}
          />
        </div>
        {/* Controls bar */}
        <div style={{
          width: '100vw',
          maxWidth: 900,
          minWidth: 320,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          marginTop: 16,
          height: 64,
          pointerEvents: 'auto',
          position: 'relative',
          borderRadius: 18,
          background: '#131313',
          boxShadow: '0 4px 24px #0008',
          backdropFilter: 'blur(8px)',
        }}>
          {/* Left controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={handlePlayPause}
              className="control-button"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#232323',
                color: '#ffe082',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                transition: 'background 0.2s',
                cursor: 'pointer',
                boxShadow: '0 2px 8px #0004',
              }}
              title={isPaused ? 'Play' : 'Pause'}
            >
              {isPaused ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="12" fill="#232323"/>
                  <polygon points="9,7 19,12 9,17" fill="#ffe082"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="12" fill="#232323"/>
                  <rect x="7" y="7" width="3" height="10" rx="1.5" fill="#ffe082"/>
                  <rect x="14" y="7" width="3" height="10" rx="1.5" fill="#ffe082"/>
                </svg>
              )}
            </button>
            {/* Volume control (mute icon + slider) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#181818',
              borderRadius: 8,
              padding: '4px 12px 4px 8px',
              boxShadow: '0 2px 8px #0007',
              gap: 8,
              minWidth: 110,
              height: 36,
            }}>
              <button
                onClick={handleMuteToggle}
                className="control-button"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'transparent',
                  color: '#ffe082',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  transition: 'background 0.2s',
                  cursor: 'pointer',
                  marginRight: 2,
                  padding: 0,
                }}
                title={volume === 0 ? 'Unmute' : 'Mute'}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 8a1 1 0 0 1 1-1h3.5a1 1 0 0 0 .6-.2l4.2-3.1A1 1 0 0 1 14 4.7v10.6a1 1 0 0 1-1.7.8l-4.2-3.1a1 1 0 0 0-.6-.2H4a1 1 0 0 1-1-1V8z" fill="#ffe082" fillOpacity="0.85"/>
                </svg>
              </button>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={volume}
                onChange={handleVolumeChange}
                style={{
                  width: 70,
                  height: 4,
                  accentColor: '#ffe082',
                  background: '#232323',
                  borderRadius: 2,
                  outline: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  margin: 0,
                  padding: 0,
                }}
              />
            </div>
          </div>
          {/* Center time display */}
          <div style={{
            fontSize: 20,
            color: '#ffe082',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            opacity: 1,
            fontWeight: 700,
            letterSpacing: 0.5,
            textShadow: '0 2px 8px #000b',
            minWidth: 120,
            justifyContent: 'center',
            background: '#181818',
            borderRadius: 8,
            padding: '6px 24px',
            boxShadow: '0 2px 8px #0007',
          }}>
            <span style={{fontVariantNumeric: 'tabular-nums'}}>{formatTime(currentTime)}</span>
            <span style={{color: '#fff', opacity: 0.7, fontWeight: 400}}>/</span>
            <span style={{fontVariantNumeric: 'tabular-nums'}}>{formatTime(duration)}</span>
          </div>
          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Fullscreen button */}
            <button
              onClick={handleFullscreen}
              className="control-button"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#232323',
                color: '#ffe082',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                transition: 'background 0.2s',
                cursor: 'pointer',
                boxShadow: '0 2px 8px #0004',
              }}
              title="Fullscreen"
            >
              {/* Fullscreen SVG from screenshot, yellow */}
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <g stroke="#ffe082" strokeWidth="2" strokeLinecap="round">
                  <polyline points="5,9 5,5 9,5"/>
                  <polyline points="13,5 17,5 17,9"/>
                  <polyline points="17,13 17,17 13,17"/>
                  <polyline points="9,17 5,17 5,13"/>
                </g>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MpvOverlay;