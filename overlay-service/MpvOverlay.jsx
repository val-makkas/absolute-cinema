import React from "react";
import { useState, useEffect } from "react";

export default function MpvOverlay({ onClose }) { // add onClose prop fallback

  const [isPlaying, setIsPlaying] = useState(null);
  const [currentTime, setCurrentTime] = useState(null);
  const [duration, setDuration] = useState(null);
  const [volume, setVolume] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(null);
  const [currentSubtitle, setCurrentSubtitle] = useState(null);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [showOverlay, setShowOverlay] = useState(true);
  const [lastMouseMove, setLastMouseMove] = useState(Date.now());
  const [showSubsModal, setShowSubsModal] = useState(false);
  const [seekHoverTime, setSeekHoverTime] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      window.electron.invoke('mpv-fetch', { command: 'isPlaying' })
        .then(val => setIsPlaying(val === true)) // fix logic: true means playing
        .catch(() => setIsPlaying(null));
      window.electron.invoke('mpv-fetch', { command: 'currentTime' })
        .then(setCurrentTime)
        .catch(() => setCurrentTime(null));
      window.electron.invoke('mpv-fetch', { command: 'duration' })
        .then(setDuration)
        .catch(() => setDuration(null));
      window.electron.invoke('mpv-fetch', { command: 'volume' })
        .then(setVolume)
        .catch(() => setVolume(null));
      window.electron.invoke('mpv-fetch', { command: 'isFullscreen' })
        .then(setIsFullscreen)
        .catch(() => setIsFullscreen(null));
      window.electron.invoke('mpv-fetch', { command: 'currentSubtitle' })
        .then(setCurrentSubtitle)
        .catch(() => setCurrentSubtitle(null));
      window.electron.invoke('mpv-fetch', { command: 'subtitleTracks' })
        .then(setSubtitleTracks)
        .catch(() => setSubtitleTracks([]));
    }, 250);
    return () => clearInterval(interval);
  }, []);

  // Hide overlay after 2.5s of no mouse movement
  useEffect(() => {
    const handleMouseMove = () => {
      setShowOverlay(true);
      setLastMouseMove(Date.now());
    };
    window.addEventListener('mousemove', handleMouseMove);
    const interval = setInterval(() => {
      if (Date.now() - lastMouseMove > 2500) setShowOverlay(false);
    }, 200);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(interval);
    };
  }, [lastMouseMove]);

  // IPC handlers
  const handlePlayPause = () => {
    window.electron.invoke('mpv-command', { command: 'toggle-pause' });
  };

  const handleSeek = (time) => {
    if (typeof time === 'number' && !isNaN(time) && duration != null) {
      const clamped = Math.max(0, Math.min(time, duration));
      window.electron.invoke('mpv-command', { command: 'seek', value: clamped });
    }
  };

  const handleVolumeChange = (newVolume) => {
    if (typeof newVolume === 'number') {
      window.electron.invoke('mpv-command', { command: 'set-volume', value: newVolume * 100 });
    }
  };

  const handleFullscreenToggle = () => {
    window.electron.invoke && window.electron.invoke('toggle-main-fullscreen');
  };

  const handleSubtitleChange = (trackId) => {
    window.electron.invoke('mpv-command', { command: 'set-subtitle', value: trackId });
  };

  const handleClose = () => {
    window.electron.invoke && window.electron.invoke('close-main-window');
  };

  // Subtitle modal open/close
  const openSubsModal = () => setShowSubsModal(true);
  const closeSubsModal = () => setShowSubsModal(false);
  const handleSubsSelect = (trackId) => {
    handleSubtitleChange(trackId);
    closeSubsModal();
  };

  return (
    <div
      className="mpv-overlay active"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'transparent', // transparent background
        zIndex: 1000,
        fontFamily: 'Segoe UI, Inter, Arial, sans-serif',
        color: '#fff',
        opacity: showOverlay ? 1 : 0,
        pointerEvents: showOverlay ? 'auto' : 'none',
        transition: 'opacity 0.3s',
        borderRadius: 18,
        boxShadow: '0 8px 32px 0 rgba(31, 38, 40, 0.25)',
        overflow: 'hidden',
      }}>
      {/* Center Play Button (shown only if paused) */}
      {!isPlaying && (
        <button
          onClick={handlePlayPause}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 90,
            height: 90,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)',
            border: 'none',
            boxShadow: '0 2px 16px #0006',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 1200,
            transition: 'background 0.2s',
          }}
          title="Play"
        >
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="24" fill="rgba(255,255,255,0.18)" />
            <polygon points="19,16 36,24 19,32" fill="#fff" />
          </svg>
        </button>
      )}
      {/* Controls bar at the bottom */}
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        padding: '0 0 18px 0',
        zIndex: 1100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        pointerEvents: 'auto',
      }}>
        {/* Seek bar */}
        <div style={{ width: '98%', position: 'relative', marginBottom: 12 }}>
          <input
            type="range"
            min="0"
            max={duration != null ? Math.floor(duration) : 1}
            step={1}
            value={currentTime != null ? Math.round(currentTime) : 0}
            onChange={e => handleSeek(Number(e.target.value))}
            onMouseMove={e => {
              if (!duration) return;
              // Use the value under the mouse, not the pixel position
              // Get the value from the event target (the slider) based on mouse position
              // This is not natively supported, so we must calculate it using the slider's range and mouse position
              const rect = e.target.getBoundingClientRect();
              let x = e.clientX - rect.left;
              x = Math.max(0, Math.min(rect.width, x));
              const min = 0;
              const max = duration != null ? Math.floor(duration) : 1;
              const percent = x / rect.width;
              let value = min + percent * (max - min);
              value = Math.round(value); // Snap to nearest second
              value = Math.max(min, Math.min(max, value));
              setSeekHoverTime(value);
            }}
            onMouseLeave={() => setSeekHoverTime(null)}
            style={{
              width: '100%',
              maxWidth: '100%',
              height: 8,
              accentColor: '#fff',
              background: 'rgba(255,255,255,0.25)',
              borderRadius: 4,
              outline: 'none',
              cursor: 'pointer',
              boxShadow: '0 1px 6px #0003',
              transition: 'accent-color 0.2s',
            }}
          />
          {seekHoverTime != null && (
            <div style={{
              position: 'absolute',
              left: `${((seekHoverTime - 0) / ((duration != null ? Math.floor(duration) : 1) - 0)) * 100}%`,
              bottom: 18,
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.85)',
              color: '#fff',
              padding: '2px 10px',
              borderRadius: 8,
              fontSize: 15,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 10,
            }}>
              {`${Math.floor(seekHoverTime / 60)}:${('0' + Math.floor(seekHoverTime % 60)).slice(-2)}`}
            </div>
          )}
        </div>
        {/* Controls row - full width, bigger controls */}
        <div style={{
          width: '100%',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32,
          background: 'none',
          padding: '0 32px',
        }}>
          {/* Left controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginLeft: 24 }}>
            <button onClick={handlePlayPause} style={{
              background: 'none', color: '#fff', border: 'none', borderRadius: '50%', width: 54, height: 54, fontSize: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 12,
            }}>{isPlaying ? <span style={{ fontSize: 36 }}>❚❚</span> : <span style={{ fontSize: 36 }}>▶</span>}</button>
            <button onClick={() => handleSeek((currentTime != null ? currentTime : 0) - 10)} style={{
              background: 'none', color: '#fff', border: 'none', borderRadius: 12, fontSize: 28, cursor: 'pointer', padding: 10,
            }} title="Back 10s">⏪</button>
            <button onClick={() => handleSeek((currentTime != null ? currentTime : 0) + 10)} style={{
              background: 'none', color: '#fff', border: 'none', borderRadius: 12, fontSize: 28, cursor: 'pointer', padding: 10,
            }} title="Forward 10s">⏩</button>
            <span style={{ minWidth: 110, textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontSize: 22 }}>
              {duration != null && currentTime != null ? (
                <>{Math.floor(currentTime / 60)}:{('0' + Math.floor(currentTime % 60)).slice(-2)} / {Math.floor(duration / 60)}:{('0' + Math.floor(duration % 60)).slice(-2)}</>
              ) : '--:-- / --:--'}
            </span>
          </div>
          {/* Center controls: Subtitles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={openSubsModal} style={{
              background: 'rgba(0,0,0,0.25)', color: '#fff', border: '1.5px solid #fff', borderRadius: 10, padding: '10px 18px', fontSize: 18, cursor: 'pointer', minWidth: 120, display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span style={{ fontSize: 20 }}>💬</span>
              <span>{subtitleTracks.find(t => t.id === currentSubtitle)?.label || (currentSubtitle === 'none' ? 'No Subtitles' : 'Subtitles')}</span>
            </button>
          </div>
          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ minWidth: 38, textAlign: 'center', fontSize: 22 }}>🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={typeof volume === 'number' ? volume / 100 : 0}
              onChange={e => handleVolumeChange(Number(e.target.value))}
              style={{ width: 110, accentColor: '#fff', margin: '0 8px', height: 8 }}
            />
            <button onClick={handleFullscreenToggle} style={{
              background: 'none', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 18px', fontSize: 28, cursor: 'pointer',
            }} title="Fullscreen">⛶</button>
            <button onClick={handleClose} style={{
              background: 'none', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 18px', fontSize: 28, cursor: 'pointer',
            }} title="Close">✕</button>
          </div>
        </div>
      </div>
      {/* Subtitle selection modal */}
      {showSubsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.45)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }} onClick={closeSubsModal}>
          <div style={{
            background: '#181818',
            borderRadius: 18,
            padding: '32px 40px',
            minWidth: 320,
            boxShadow: '0 8px 32px 0 rgba(31, 38, 40, 0.25)',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Select Subtitles</h2>
            <button onClick={() => handleSubsSelect('none')} style={{
              background: currentSubtitle === 'none' ? '#333' : 'none', color: '#fff', border: '1.5px solid #fff', borderRadius: 10, padding: '10px 18px', fontSize: 18, cursor: 'pointer', textAlign: 'left',
            }}>No Subtitles</button>
            {subtitleTracks.map((track, idx) => (
              <button key={track.id || idx} onClick={() => handleSubsSelect(track.id)} style={{
                background: currentSubtitle === track.id ? '#333' : 'none', color: '#fff', border: '1.5px solid #fff', borderRadius: 10, padding: '10px 18px', fontSize: 18, cursor: 'pointer', textAlign: 'left',
              }}>{track.label || `Subtitle ${idx + 1}`}</button>
            ))}
            <button onClick={closeSubsModal} style={{
              background: 'none', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 18, cursor: 'pointer', marginTop: 12,
            }}>Cancel</button>
          </div>
        </div>
      )}
      {/* Close (X) button, top left */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: 18,
          left: 18,
          zIndex: 2000,
          background: 'rgba(0,0,0,0.32)',
          border: 'none',
          borderRadius: '50%',
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 8px #0004',
          transition: 'background 0.2s',
        }}
        title="Close"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="6" y1="18" x2="18" y2="6" />
        </svg>
      </button>
    </div>
  );
}