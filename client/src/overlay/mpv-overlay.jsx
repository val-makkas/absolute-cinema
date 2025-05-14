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
    await window.mpvControls.toggleFullscreen();
  };
  
  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  return (
    <div className="mpv-overlay" style={{ width: '100vw', height: '100vh', pointerEvents: 'auto' }}>
      <div className="overlay-container visible" style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0.0) 100%)',
        padding: '0 0 16px 0',
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
              height: 8,
              accentColor: '#ffe082', // Yellow
              background: 'rgba(255,255,255,0.18)',
              borderRadius: 6,
              margin: '0 0 0 0',
              boxShadow: '0 2px 8px #0006',
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
          padding: '0 32px', // Reasonable padding inside the bar
          marginTop: 8,
          height: 56,
          pointerEvents: 'auto',
          position: 'relative',
        }}>
          {/* Left controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handlePlayPause}
              className="control-button"
              style={{ fontSize: 32, width: 48, height: 48, borderRadius: '50%', background: 'none', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title={isPaused ? 'Play' : 'Pause'}
            >
              {isPaused ? <span style={{ fontSize: 36 }}>▶️</span> : <span style={{ fontSize: 36 }}>❚❚</span>}
            </button>
            <button
              onClick={handleMuteToggle}
              className="control-button"
              style={{ fontSize: 26, width: 40, height: 40, borderRadius: '50%', background: 'none', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {getVolumeIcon()}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              className="volume-slider"
              onChange={handleVolumeChange}
              style={{ width: 80, accentColor: '#fff', margin: '0 8px' }}
            />
            <span style={{ color: '#fff', fontSize: 16, minWidth: 80, textAlign: 'right', fontVariantNumeric: 'tabular-nums', opacity: 0.9 }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <button
              onClick={handleFullscreen}
              className="control-button"
              style={{ fontSize: 26, width: 40, height: 40, borderRadius: '50%', background: 'none', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Fullscreen"
            >
              ⛶
            </button>
            {/* Placeholder for extra controls, e.g. subtitles, settings, etc. */}
            {/* <button className="control-button" style={{ fontSize: 24, background: 'none', color: '#fff', border: 'none' }}>⚙️</button> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MpvOverlay;