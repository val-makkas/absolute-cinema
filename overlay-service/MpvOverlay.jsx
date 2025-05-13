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
    window.electron.invoke('stop-mpv');
    if (typeof onClose === 'function') onClose();
  };

  return (
    <div
      className="mpv-overlay active"
      style={{
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        background: 'transparent',
        zIndex: 1000,
        fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
        color: '#fff',
        opacity: showOverlay ? 1 : 0,
        pointerEvents: showOverlay ? 'auto' : 'none',
        transition: 'opacity 0.3s',
      }}>
      {/* Seek bar full width at the bottom */}
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        padding: '0 0 12px 0',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
      }}>
        <input
          type="range"
          min="0"
          max={duration != null ? duration : 1}
          value={currentTime != null ? currentTime : 0}
          onChange={e => handleSeek(Number(e.target.value))}
          style={{
            width: '96vw',
            maxWidth: 1200,
            height: 8,
            accentColor: '#1976d2',
            background: 'rgba(255,255,255,0.12)',
            borderRadius: 6,
            boxShadow: '0 2px 12px 0 rgba(0,0,0,0.18)',
            outline: 'none',
            cursor: 'pointer',
            transition: 'accent-color 0.2s',
          }}
        />
      </div>
      {/* Controls above the seek bar */}
      <div className="controls" style={{
        position: 'absolute',
        left: '50%',
        bottom: '56px',
        transform: 'translateX(-50%)',
        width: 'min(700px, 90vw)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 32px',
        borderRadius: '18px',
        background: 'rgba(24, 24, 28, 0.85)',
        boxShadow: '0 8px 32px 0 rgba(0,0,0,0.25)',
        gap: '18px',
        backdropFilter: 'blur(8px)',
      }}>
        <button onClick={handlePlayPause} style={{
          background: isPlaying ? '#222' : '#1976d2',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: 44,
          height: 44,
          fontSize: 22,
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}>{isPlaying ? '❚❚' : '▶'}</button>
        <button onClick={() => handleSeek((currentTime != null ? currentTime : 0) - 10)} style={{
          background: 'none', color: '#fff', border: 'none', fontSize: 20, cursor: 'pointer', borderRadius: 8, padding: 8, transition: 'background 0.2s',
        }} title="Back 10s">⏪</button>
        <span style={{ minWidth: 90, textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontSize: 15 }}>
          {duration != null && currentTime != null ? (
            <>{Math.floor(currentTime / 60)}:{('0' + Math.floor(currentTime % 60)).slice(-2)} / {Math.floor(duration / 60)}:{('0' + Math.floor(duration % 60)).slice(-2)}</>
          ) : '--:-- / --:--'}
        </span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={typeof volume === 'number' ? volume / 100 : 0}
          onChange={e => handleVolumeChange(Number(e.target.value))}
          style={{ width: 80, accentColor: '#1976d2', margin: '0 8px' }}
        />
        <span style={{ minWidth: 40, textAlign: 'center', fontSize: 15 }}>🔊 {typeof volume === 'number' ? Math.round(volume) : 0}%</span>
        <button onClick={handleFullscreenToggle} style={{
          background: isFullscreen ? '#1976d2' : 'none', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 15, cursor: 'pointer', transition: 'background 0.2s',
        }}>{isFullscreen ? '🡼' : '⛶'}</button>
        <select value={currentSubtitle || 'none'} onChange={e => handleSubtitleChange(e.target.value)} style={{
          background: 'none', color: '#fff', border: '1px solid #444', borderRadius: 8, padding: '6px 10px', fontSize: 15, marginLeft: 8, cursor: 'pointer',
        }}>
          <option value="none">No Subtitles</option>
          {subtitleTracks.map((track, idx) => (
            <option key={track.id || idx} value={track.id}>{track.label || `Subtitle ${idx + 1}`}</option>
          ))}
        </select>
        <button onClick={handleClose} style={{
          background: '#b71c1c', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 15, marginLeft: 8, cursor: 'pointer', transition: 'background 0.2s',
        }}>✕</button>
      </div>
    </div>
  );
}