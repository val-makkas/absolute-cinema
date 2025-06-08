import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react'
import SubtitleMenu from './SubtitleMenu'

interface MpvOverlayProps {}

const Overlay: React.FC<MpvOverlayProps> = () => {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const [isHovering, setIsHovering] = useState(false)
  const [mediaTitle, setMediaTitle] = useState('Loading...')
  const [showPlayAnimation, setShowPlayAnimation] = useState(false)
  const [isCursorVisible, setIsCursorVisible] = useState(true)
  const [activeHint, setActiveHint] = useState<string | null>(null)
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false)
  const [currentSubtitle, setCurrentSubtitle] = useState<number | null>(null)
  const subtitleMenuRef = useRef<HTMLDivElement>(null)

  const keyframes = `
    @keyframes scaleIn {
      0% { transform: scale(0); opacity: 0; }
      70% { transform: scale(1.1); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes fadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    @keyframes fadeOut {
      0% { opacity: 1; }
      100% { opacity: 0; }
    }
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    @keyframes gradient-border {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  `
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.focus()
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (subtitleMenuRef.current && !subtitleMenuRef.current.contains(event.target as Node)) {
        setShowSubtitleMenu(false)
      }
    }

    if (showSubtitleMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSubtitleMenu])

  const seekBarRef = useRef<HTMLInputElement>(null)
  const updateIntervalRef = useRef<number | null>(null)
  const previousVolumeRef = useRef<number>(100)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const formatTime = (seconds: number): string => {
    seconds = Math.floor(seconds)
    const hours = Math.floor(seconds / 3600)
    seconds %= 3600
    const minutes = Math.floor(seconds / 60)
    seconds %= 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const startProgressUpdates = (): void => {
    updateIntervalRef.current = window.setInterval(async () => {
      try {
        const currentTimeValue = (await window.overlayControls.getCurrentTime()) || 0
        const durationValue = (await window.overlayControls.getDuration()) || 0

        setCurrentTime(currentTimeValue)
        setDuration(durationValue)
      } catch (err) {
        console.error(err)
      }
    }, 1000)
  }

  useEffect(() => {
    const initPlayerState = async (): Promise<void> => {
      try {
        if (!window.overlayControls) return

        const pauseState = await window.overlayControls.getPlaybackState()
        setIsPaused(pauseState)

        const volumeValue = (await window.overlayControls.getVolume()) || 100
        setVolume(volumeValue)

        const torrentInfo = await window.overlayControls.getTorrentInfo()
        if (torrentInfo.season && torrentInfo.episode) {
          setMediaTitle(`${torrentInfo.title} (S${torrentInfo.season}, EP${torrentInfo.episode})`)
        } else {
          setMediaTitle(`${torrentInfo.title} (${torrentInfo.year})`)
        }

        try {
          const currentSub = await window.overlayControls.getCurrentSubtitle()
          setCurrentSubtitle(currentSub)
        } catch (err) {
          console.log('Error getting current subtitle:', err)
        }

        startProgressUpdates()
      } catch (err) {
        console.error(err)
      }
    }

    initPlayerState()

    return () => {
      const currentInterval = updateIntervalRef.current
      if (currentInterval !== null) {
        window.clearInterval(currentInterval)
      }
    }
  }, [])

  useEffect(() => {
    setIsHovering(true)
    const timer = setTimeout(() => {
      setIsHovering(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleMouseMove = useCallback((): void => {
    setIsHovering(true)
    setIsCursorVisible(true)

    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
    }

    if (cursorTimerRef.current) {
      clearTimeout(cursorTimerRef.current)
    }

    hoverTimerRef.current = setTimeout(() => {
      if (!isPaused) {
        setIsHovering(false)
      }
    }, 3000)

    cursorTimerRef.current = setTimeout(() => {
      if (!isPaused && !isHovering) {
        setIsCursorVisible(false)
      }
    }, 3500)
  }, [isPaused, isHovering])

  const showPlayPauseAnimation = useCallback((): void => {
    setShowPlayAnimation(true)

    if (animateTimeoutRef.current) {
      clearTimeout(animateTimeoutRef.current)
    }

    animateTimeoutRef.current = setTimeout(() => {
      setShowPlayAnimation(false)
    }, 800)
  }, [])

  const handlePlayPause = useCallback(async (): Promise<void> => {
    try {
      await window.overlayControls.togglePlay()
      const newPauseState = await window.overlayControls.getPlaybackState()
      setIsPaused(newPauseState)
      showPlayPauseAnimation()
    } catch (err) {
      console.error(err)
    }
  }, [showPlayPauseAnimation])

  const handleSeek = useCallback(async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const seekTime = parseFloat(e.target.value)
    try {
      await window.overlayControls.seek(seekTime)
      setCurrentTime(seekTime)
    } catch (err) {
      console.error(err)
    }
  }, [])

  const handleVolumeChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const volumeValue = parseInt(e.target.value, 10)
      try {
        await window.overlayControls.setVolume(volumeValue)
        setVolume(volumeValue)
        if (volumeValue > 0) {
          previousVolumeRef.current = volumeValue
        }
      } catch (err) {
        console.error(err)
      }
    },
    []
  )

  const handleMuteToggle = useCallback(async (): Promise<void> => {
    try {
      if (volume > 0) {
        previousVolumeRef.current = volume
        await window.overlayControls.setVolume(0)
        setVolume(0)
      } else {
        await window.overlayControls.setVolume(previousVolumeRef.current)
        setVolume(previousVolumeRef.current)
      }
    } catch (err) {
      console.error(err)
    }
  }, [volume])

  const handleFullscreen = useCallback(async (): Promise<void> => {
    try {
      await window.overlayControls.toggleFullscreenMainWindow()
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent): Promise<void> => {
      if (
        ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyF', 'KeyM'].includes(
          e.code
        )
      ) {
        e.preventDefault()
        e.stopPropagation()
      }

      try {
        switch (e.code) {
          case 'Space':
            setActiveHint('space')
            await handlePlayPause()
            break
          case 'ArrowLeft':
            setActiveHint('left')
            try {
              await window.overlayControls.seek(Math.max(0, currentTime - 10))
              setCurrentTime((prev) => Math.max(0, prev - 10))
            } catch (err) {
              console.error('Seek error:', err)
            }
            break
          case 'ArrowRight':
            setActiveHint('right')
            try {
              await window.overlayControls.seek(Math.min(duration, currentTime + 10))
              setCurrentTime((prev) => Math.min(duration, prev + 10))
            } catch (err) {
              console.error('Seek error:', err)
            }
            break
          case 'ArrowUp': {
            setActiveHint('up')
            const newVolumeUp = Math.min(100, volume + 5)
            try {
              await window.overlayControls.setVolume(newVolumeUp)
              setVolume(newVolumeUp)
            } catch (err) {
              console.error('Volume error:', err)
            }
            break
          }
          case 'ArrowDown': {
            setActiveHint('down')
            const newVolumeDown = Math.max(0, volume - 5)
            try {
              await window.overlayControls.setVolume(newVolumeDown)
              setVolume(newVolumeDown)
            } catch (err) {
              console.error('Volume error:', err)
            }
            break
          }
          case 'KeyF':
            setActiveHint('f')
            await handleFullscreen()
            break
          case 'KeyM':
            setActiveHint('m')
            await handleMuteToggle()
            break
        }

        setTimeout(() => setActiveHint(null), 800)
      } catch (error) {
        console.error('Keyboard shortcut error:', error)
      }
    }

    if (overlayRef.current) {
      overlayRef.current.focus()
    }

    document.addEventListener('keydown', handleKeyDown, { capture: true })
    window.addEventListener('keydown', handleKeyDown, { capture: true })

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true })
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [handlePlayPause, handleFullscreen, handleMuteToggle, currentTime, duration, volume])

  return (
    <div
      className={`fixed inset-0 w-full h-full z-50 ${isCursorVisible ? 'cursor-default' : 'cursor-none'} pointer-events-auto`}
      onMouseMove={handleMouseMove}
      ref={overlayRef}
      tabIndex={0}
      style={{ pointerEvents: 'auto' }}
    >
      <style>{keyframes}</style>
      {showPlayAnimation && (
        <div className="fixed inset-0 flex items-center justify-center z-[1000] pointer-events-none">
          <div className="opacity-0 animate-[fadeIn_0.2s_ease-in-out_forwards]">
            {isPaused ? (
              <div
                className="rounded-full p-10 backdrop-blur-md border border-white/20 shadow-2xl transform scale-0 animate-[scaleIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)_forwards]"
                style={{
                  backgroundImage: 'linear-gradient(-45deg, #a855f7, #3b82f6, #8b5cf6, #ec4899)',
                  backgroundSize: '300% 300%',
                  backgroundPosition: '0% 50%',
                  animation: 'gradient-border 8s ease infinite'
                }}
              >
                <svg
                  className="w-20 h-20 text-white/90 animate-[pulse_1.5s_ease-in-out_infinite]"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M8 5.14v14l11-7-11-7z" fill="currentColor" />
                </svg>
              </div>
            ) : (
              <div
                className="rounded-full p-10 backdrop-blur-md border border-white/20 shadow-2xl transform scale-0 animate-[scaleIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)_forwards]"
                style={{
                  backgroundImage: 'linear-gradient(-45deg, #a855f7, #3b82f6, #8b5cf6, #ec4899)',
                  backgroundSize: '300% 300%',
                  backgroundPosition: '0% 50%',
                  animation: 'gradient-border 8s ease infinite'
                }}
              >
                <svg
                  className="w-20 h-20 text-white/90"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor" />
                </svg>
              </div>
            )}
          </div>
        </div>
      )}
      <div
        className={`fixed inset-0 flex flex-col justify-between z-[100] pointer-events-none ${
          isHovering
            ? 'opacity-100 transform translate-y-0 backdrop-blur-[2px]'
            : 'opacity-0 transform translate-y-2 backdrop-blur-0'
        } transition-[opacity,transform,backdrop-filter] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)]`}
      >
        <div
          className={`absolute top-4 right-4 z-[1000] pointer-events-auto ${
            isHovering
              ? 'opacity-100 transform scale-100 translate-y-0'
              : 'opacity-0 transform scale-95 translate-y-1'
          } transition-all duration-200 delay-75 ease-out`}
        >
          <button
            onClick={async () => {
              try {
                await window.overlayControls.hideMpv()
              } catch (err) {
                console.error(err)
              }
            }}
            className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 text-white shadow-lg shadow-purple-900/20 transform hover:scale-105"
            style={{
              backgroundImage: 'linear-gradient(-45deg, #a855f7, #3b82f6, #8b5cf6, #ec4899)',
              backgroundSize: '300% 300%',
              backgroundPosition: '0% 50%',
              animation: 'gradient-border 8s ease infinite'
            }}
            title="Close player"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
        <div
          className={`w-full py-8 px-10 pointer-events-auto bg-gradient-to-b from-black/80 via-black/40 to-transparent ${
            isHovering
              ? 'opacity-100 transform translate-y-0'
              : 'opacity-0 transform -translate-y-2'
          } transition-all duration-250 delay-50 ease-out`}
        >
          {' '}
          <h1 className="text-2xl font-medium text-white drop-shadow-md">{mediaTitle}</h1>
        </div>
        <div
          className="flex-grow w-full pointer-events-auto"
          onClick={handlePlayPause}
          style={{ pointerEvents: 'auto' }}
        >
          <button className="w-full h-full cursor-default opacity-0"></button>
        </div>

        <div
          className={`relative px-8 pb-3 pt-8 backdrop-blur-sm bg-transparent border-l border-white/10 to-transparent ${
            isHovering ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'
          } transition-all duration-350 delay-100 ease-out`}
        >
          <div className="w-full mb-3 px-1 pointer-events-auto relative h-2">
            <div
              className="absolute left-0 top-0 bottom-0 rounded-full overflow-hidden"
              style={{
                width: `${(currentTime / (duration || 1)) * 100}%`,
                backgroundImage: 'linear-gradient(-45deg, #a855f7, #3b82f6, #8b5cf6, #ec4899)',
                backgroundSize: '300% 300%',
                backgroundPosition: '0% 50%',
                animation: 'gradient-border 8s ease infinite'
              }}
            ></div>
            <input
              ref={seekBarRef}
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full rounded-full appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:opacity-0 hover:[&::-webkit-slider-thumb]:opacity-100 transition-all z-10"
              style={{
                background: 'rgba(255, 255, 255, 0.2)'
              }}
            />
          </div>
          <div
            className="w-[100%] mx-auto flex items-center justify-between px-8 py-2 rounded-2xl backdrop-blur-md bg-gradient-to-r from-black/80 via-black/40 to-black/80 shadow-xl shadow-black/30 pointer-events-auto hover:border-[#785aeb]/20 transition-all duration-300"
            style={{
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div className="flex items-center gap-7">
              <button
                onClick={handlePlayPause}
                className="flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 text-white shadow-lg shadow-purple-900/20 transform hover:scale-105"
                style={{
                  backgroundImage: 'linear-gradient(-45deg, #a855f7, #3b82f6, #8b5cf6, #ec4899)',
                  backgroundSize: '300% 300%',
                  backgroundPosition: '0% 50%',
                  animation: 'gradient-border 8s ease infinite'
                }}
                title={isPaused ? 'Play' : 'Pause'}
              >
                {isPaused ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5.14v14l11-7-11-7z" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                )}
              </button>
              <div className="relative group">
                <button
                  onClick={handleMuteToggle}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 transition-all duration-200 text-white hover:shadow-md hover:shadow-[#785aeb]/10 hover:scale-105 transform"
                  title={volume === 0 ? 'Unmute' : 'Mute'}
                >
                  {volume === 0 ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4.34 2.93L2.93 4.34 7.29 8.7 7 9H3v6h4l5 5v-6.59l4.18 4.18c-.65.49-1.38.88-2.18 1.11v2.06c1.34-.3 2.57-.92 3.61-1.75l2.05 2.05 1.41-1.41L4.34 2.93zM10 15.17L7.83 13H5v-2h2.83l.88-.88L10 11.41v3.76zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zm-7-8l-1.88 1.88L12 7.76zm4.5 8c0-1.77-1.02-3.29-2.5-4.03v1.79l2.48 2.48c.01-.08.02-.16.02-.24z" />
                    </svg>
                  ) : volume < 50 ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm7-.17v6.34L7.83 13H5v-2h2.83L10 8.83zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z" />
                    </svg>
                  )}
                </button>
                <div className="invisible opacity-0 scale-95 group-hover:visible group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 ease-in-out absolute left-10 -bottom-1 p-3 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 shadow-lg z-[1000] pointer-events-auto">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-28 h-2 rounded-full appearance-none cursor-pointer bg-white/20 focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer pointer-events-auto"
                    style={{
                      backgroundImage: `linear-gradient(90deg, rgb(120, 90, 235) ${volume}%, rgba(255, 255, 255, 0.2) 0%)`
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex justify-between text-white/90 text-xs px-1">
                <div
                  className="flex items-center gap-2 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/5"
                  style={{
                    backgroundImage: 'linear-gradient(-45deg, #a855f7, #3b82f6, #8b5cf6, #ec4899)',
                    backgroundSize: '300% 300%',
                    backgroundPosition: '0% 50%',
                    animation: 'gradient-border 8s ease infinite'
                  }}
                >
                  <span className="font-mono text-white/90 tracking-wider">
                    {formatTime(currentTime)}
                  </span>
                  <span className="text-white/40 px-0.5">/</span>
                  <span className="font-mono text-white/50 tracking-wider">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>
              <div className="relative" ref={subtitleMenuRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    setShowSubtitleMenu(!showSubtitleMenu)
                  }}
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 text-white hover:shadow-md hover:shadow-[#785aeb]/10 hover:scale-105 transform ${
                    currentSubtitle
                      ? 'bg-gradient-to-br from-purple-700 to-blue-500'
                      : 'bg-black/30 hover:bg-black/50'
                  }`}
                  title="Subtitles"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6v-2zm0 4h8v2H6v-2zm10 0h2v2h-2v-2zm-6-4h8v2h-8v-2z" />
                  </svg>
                </button>
                <SubtitleMenu
                  showSubtitleMenu={showSubtitleMenu}
                  setShowSubtitleMenu={setShowSubtitleMenu}
                  currentSubtitle={currentSubtitle}
                  setCurrentSubtitle={setCurrentSubtitle}
                />
              </div>
              <button
                onClick={handleFullscreen}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 transition-all duration-200 text-white hover:shadow-md hover:shadow-[#785aeb]/10 hover:scale-105 transform"
                title="Fullscreen"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div
        className={`fixed top-1/2 left-16 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border border-white/30 transition-all duration-300 ${activeHint === 'left' ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}
        style={{
          transform: 'translate3d(0, -50%, 0)',
          backfaceVisibility: 'hidden',
          perspective: '1000px',
          willChange: 'transform, opacity',
          backgroundImage:
            activeHint === 'left'
              ? 'linear-gradient(-45deg, rgba(168, 85, 247, 0.9), rgba(59, 130, 246, 0.9), rgba(139, 92, 246, 0.9), rgba(236, 72, 153, 0.9))'
              : 'none',
          backgroundColor: activeHint === 'left' ? 'transparent' : 'rgba(0, 0, 0, 0.9)',
          backgroundSize: '300% 300%',
          animation: activeHint === 'left' ? 'gradient-border 8s ease infinite' : 'none'
        }}
      >
        <span className="inline-block bg-white/90 text-black font-semibold rounded px-2 py-1 text-sm">
          ←
        </span>
        <span className="text-white/90 text-sm font-medium">-10s</span>
      </div>
      <div
        className={`fixed top-1/2 right-16 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border border-white/30 transition-all duration-300 ${activeHint === 'right' ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}
        style={{
          transform: 'translate3d(0, -50%, 0)',
          backfaceVisibility: 'hidden',
          perspective: '1000px',
          willChange: 'transform, opacity',
          backgroundImage:
            activeHint === 'right'
              ? 'linear-gradient(-45deg, rgba(168, 85, 247, 0.9), rgba(59, 130, 246, 0.9), rgba(139, 92, 246, 0.9), rgba(236, 72, 153, 0.9))'
              : 'none',
          backgroundColor: activeHint === 'right' ? 'transparent' : 'rgba(0, 0, 0, 0.9)',
          backgroundSize: '300% 300%',
          animation: activeHint === 'right' ? 'gradient-border 8s ease infinite' : 'none'
        }}
      >
        <span className="text-white/90 text-sm font-medium">+10s</span>
        <span className="inline-block bg-white/90 text-black font-semibold rounded px-2 py-1 text-sm">
          →
        </span>
      </div>
      <div
        className={`fixed top-1/3 left-1/2 flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg border border-white/30 transition-all duration-300 ${activeHint === 'space' ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}
        style={{
          transform: 'translate3d(-50%, -50%, 0)',
          backfaceVisibility: 'hidden',
          perspective: '1000px',
          willChange: 'transform, opacity',
          backgroundImage:
            activeHint === 'space'
              ? 'linear-gradient(-45deg, rgba(168, 85, 247, 0.9), rgba(59, 130, 246, 0.9), rgba(139, 92, 246, 0.9), rgba(236, 72, 153, 0.9))'
              : 'none',
          backgroundColor: activeHint === 'space' ? 'transparent' : 'rgba(0, 0, 0, 0.9)',
          backgroundSize: '300% 300%',
          animation: activeHint === 'space' ? 'gradient-border 8s ease infinite' : 'none'
        }}
      >
        <span className="inline-block bg-white/90 text-black font-semibold rounded px-2 py-1 text-sm min-w-16 text-center">
          Space
        </span>
        <span className="text-white/90 text-sm font-medium">{isPaused ? 'Play' : 'Pause'}</span>
      </div>
      <div
        className={`fixed top-1/4 right-1/4 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border border-white/30 transition-all duration-300 ${activeHint === 'up' ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}
        style={{
          transform: 'translate3d(0, 0, 0)',
          backfaceVisibility: 'hidden',
          perspective: '1000px',
          willChange: 'transform, opacity',
          backgroundImage:
            activeHint === 'up'
              ? 'linear-gradient(-45deg, rgba(168, 85, 247, 0.9), rgba(59, 130, 246, 0.9), rgba(139, 92, 246, 0.9), rgba(236, 72, 153, 0.9))'
              : 'none',
          backgroundColor: activeHint === 'up' ? 'transparent' : 'rgba(0, 0, 0, 0.9)',
          backgroundSize: '300% 300%',
          animation: activeHint === 'up' ? 'gradient-border 8s ease infinite' : 'none'
        }}
      >
        <span className="text-white/90 text-sm font-medium">Volume +</span>
        <span className="inline-block bg-white/90 text-black font-semibold rounded px-2 py-1 text-sm">
          ↑
        </span>
      </div>
      <div
        className={`fixed bottom-1/4 right-1/4 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border border-white/30 transition-all duration-300 ${activeHint === 'down' ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}
        style={{
          transform: 'translate3d(0, 0, 0)',
          backfaceVisibility: 'hidden',
          perspective: '1000px',
          willChange: 'transform, opacity',
          backgroundImage:
            activeHint === 'down'
              ? 'linear-gradient(-45deg, rgba(168, 85, 247, 0.9), rgba(59, 130, 246, 0.9), rgba(139, 92, 246, 0.9), rgba(236, 72, 153, 0.9))'
              : 'none',
          backgroundColor: activeHint === 'down' ? 'transparent' : 'rgba(0, 0, 0, 0.9)',
          backgroundSize: '300% 300%',
          animation: activeHint === 'down' ? 'gradient-border 8s ease infinite' : 'none'
        }}
      >
        <span className="text-white/90 text-sm font-medium">Volume -</span>
        <span className="inline-block bg-white/90 text-black font-semibold rounded px-2 py-1 text-sm">
          ↓
        </span>
      </div>
      <div
        className={`fixed top-1/3 right-1/3 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border border-white/30 transition-all duration-300 ${activeHint === 'f' ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}
        style={{
          transform: 'translate3d(0, 0, 0)',
          backfaceVisibility: 'hidden',
          perspective: '1000px',
          willChange: 'transform, opacity',
          backgroundImage:
            activeHint === 'f'
              ? 'linear-gradient(-45deg, rgba(168, 85, 247, 0.9), rgba(59, 130, 246, 0.9), rgba(139, 92, 246, 0.9), rgba(236, 72, 153, 0.9))'
              : 'none',
          backgroundColor: activeHint === 'f' ? 'transparent' : 'rgba(0, 0, 0, 0.9)',
          backgroundSize: '300% 300%',
          animation: activeHint === 'f' ? 'gradient-border 8s ease infinite' : 'none'
        }}
      >
        <span className="text-white/90 text-sm font-medium">Fullscreen</span>
        <span className="inline-block bg-white/90 text-black font-semibold rounded px-2 py-1 text-sm">
          F
        </span>
      </div>
      <div
        className={`fixed bottom-1/3 left-1/3 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border border-white/30 transition-all duration-300 ${activeHint === 'm' ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}
        style={{
          transform: 'translate3d(0, 0, 0)',
          backfaceVisibility: 'hidden',
          perspective: '1000px',
          willChange: 'transform, opacity',
          backgroundImage:
            activeHint === 'm'
              ? 'linear-gradient(-45deg, rgba(168, 85, 247, 0.9), rgba(59, 130, 246, 0.9), rgba(139, 92, 246, 0.9), rgba(236, 72, 153, 0.9))'
              : 'none',
          backgroundColor: activeHint === 'm' ? 'transparent' : 'rgba(0, 0, 0, 0.9)',
          backgroundSize: '300% 300%',
          animation: activeHint === 'm' ? 'gradient-border 8s ease infinite' : 'none'
        }}
      >
        <span className="text-white/90 text-sm font-medium">Mute</span>
        <span className="inline-block bg-white/90 text-black font-semibold rounded px-2 py-1 text-sm">
          M
        </span>
      </div>
    </div>
  )
}

export default Overlay
