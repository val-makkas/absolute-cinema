import React from 'react';
import { useState, useEffect } from 'react';

export default function MpvOverlay() {

  const [isPlaying, setIsPlaying] = useState(null);
  const [currentTime, setCurrentTime] = useState(null);
  const [duration, setDuration] = useState(null);
  const [volume, setVolume] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(null);
  const [currentSubtitle, setCurrentSubtitle] = useState(null);
  const [subtitleTracks, setSubtitleTracks] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      window.electron.invoke('mpv-fetch', { command: 'isPlaying' })
        .then(val => setIsPlaying(val === false))
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

  // IPC handlers
  const handlePlayPause = () => {
    window.electron.invoke('mpv-command', { command: 'toggle-pause' });
  };

  const handleSeek = (time) => {
    window.electron.invoke('mpv-command', { command: 'seek', value: time });
  };

  const handleVolumeChange = (newVolume) => {
    window.electron.invoke('mpv-command', { command: 'set-volume', value: newVolume * 100 });
  };

  const handleFullscreenToggle = () => {
    window.electron.invoke('mpv-command', { command: 'toggle-fullscreen' });
  };

  const handleSubtitleChange = (trackId) => {
    window.electron.invoke('mpv-command', { command: 'set-subtitle', value: trackId });
  };

  const handleClose = () => {
    window.electron.invoke('stop-mpv');
    if (onClose) onClose();
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
        background: 'transparent', // Ensure true transparency
        pointerEvents: 'auto',
        zIndex: 1000,
      }}>
      <div className="controls" style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 0',
        background: 'linear-gradient(to top, rgba(0,0,0,0.6) 60%, transparent)',
        pointerEvents: 'auto',
      }}>
        <button onClick={handlePlayPause}>{isPlaying ? 'Pause' : 'Play'}</button>
        <button onClick={() => handleSeek(currentTime - 10)}>⏪ 10s</button>
        <input
          type="range"
          min="0"
          max={duration}
          value={currentTime}
          onChange={e => handleSeek(Number(e.target.value))}
        />
        <button onClick={() => handleSeek(currentTime + 10)}>10s ⏩</button>
        <span>{Math.floor(currentTime / 60)}:{('0' + Math.floor(currentTime % 60)).slice(-2)} / {Math.floor(duration / 60)}:{('0' + Math.floor(duration % 60)).slice(-2)}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={typeof volume === 'number' ? volume / 100 : 0}
          onChange={e => handleVolumeChange(Number(e.target.value))}
        />
        <span>🔊 {typeof volume === 'number' ? Math.round(volume) : 0}%</span>
        <button onClick={handleFullscreenToggle}>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</button>
        <select value={currentSubtitle} onChange={e => handleSubtitleChange(e.target.value)}>
          <option value="none">No Subtitles</option>
          {subtitleTracks.map((track, idx) => (
            <option key={track.id || idx} value={track.id}>{track.label || `Subtitle ${idx + 1}`}</option>
          ))}
        </select>
        {/* <button onClick={onMovieOnlyMode} style={{ marginLeft: 16 }}>Movie Only Mode</button> */}
        <button onClick={handleClose}>Close</button>
      </div>
    </div>
  );
}