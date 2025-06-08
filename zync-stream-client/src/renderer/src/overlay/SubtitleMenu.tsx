import React, { useState, useRef, useCallback, useEffect } from 'react'

interface SubtitleTrack {
  id: number
  type: string
  lang?: string
  title?: string
  selected?: boolean
  external?: boolean
  filePath?: string
}

interface ExternalSubtitle {
  id: string
  url: string
  lang: string
  SubEncoding: string
  g?: string
}

interface SubtitleMenuProps {
  showSubtitleMenu: boolean
  setShowSubtitleMenu: (show: boolean) => void
  currentSubtitle: number | null
  setCurrentSubtitle: (id: number | null) => void
}

interface ActiveExternalSubtitle {
  id: number
  language: string
  filePath: string | undefined
  isActive: boolean
}

const SubtitleMenu: React.FC<SubtitleMenuProps> = ({
  showSubtitleMenu,
  setShowSubtitleMenu,
  currentSubtitle,
  setCurrentSubtitle
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null)
  const [subtitleSize, setSubtitleSize] = useState(100)
  const [subtitleDelay, setSubtitleDelay] = useState(0)
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([])
  const [availableSubtitles, setAvailableSubtitles] = useState<ExternalSubtitle[]>([])
  const [isLoadingSubtitles, setIsLoadingSubtitles] = useState(false)
  const [activeExternalSubtitles, setActiveExternalSubtitles] = useState<ActiveExternalSubtitle[]>(
    []
  )
  const [allSubtitleTracks, setAllSubtitleTracks] = useState<SubtitleTrack[]>([])
  const subtitleMenuRef = useRef<HTMLDivElement>(null)

  const normalizeLanguage = useCallback((lang: string | undefined): string => {
    if (!lang) return 'Unknown'
    const normalized = lang.toLowerCase().trim()

    const languageMap: { [key: string]: string } = {
      en: 'English',
      eng: 'English',
      english: 'English',
      es: 'Spanish',
      spa: 'Spanish',
      spanish: 'Spanish',
      fr: 'French',
      fra: 'French',
      fre: 'French',
      french: 'French',
      de: 'German',
      ger: 'German',
      german: 'German',
      it: 'Italian',
      ita: 'Italian',
      italian: 'Italian',
      pt: 'Portuguese',
      por: 'Portuguese',
      portuguese: 'Portuguese',
      pob: 'Portuguese (Brazil)',
      ja: 'Japanese',
      jpn: 'Japanese',
      japanese: 'Japanese',
      ko: 'Korean',
      kor: 'Korean',
      korean: 'Korean',
      zh: 'Chinese',
      chi: 'Chinese',
      chinese: 'Chinese',
      ru: 'Russian',
      rus: 'Russian',
      russian: 'Russian',
      ar: 'Arabic',
      ara: 'Arabic',
      arabic: 'Arabic',
      ell: 'Greek',
      greek: 'Greek',
      el: 'Greek',
      pol: 'Polish',
      polish: 'Polish',
      pl: 'Polish',
      nld: 'Dutch',
      dutch: 'Dutch',
      nl: 'Dutch',
      tur: 'Turkish',
      turkish: 'Turkish',
      tr: 'Turkish',
      ron: 'Romanian',
      romanian: 'Romanian',
      ro: 'Romanian',
      heb: 'Hebrew',
      hebrew: 'Hebrew',
      he: 'Hebrew',
      swe: 'Swedish',
      swedish: 'Swedish',
      sv: 'Swedish',
      cze: 'Czech',
      czech: 'Czech',
      cs: 'Czech',
      est: 'Estonian',
      estonian: 'Estonian',
      et: 'Estonian',
      bul: 'Bulgarian',
      bulgarian: 'Bulgarian',
      bg: 'Bulgarian',
      per: 'Persian',
      persian: 'Persian',
      farsi: 'Persian',
      fa: 'Persian',
      hun: 'Hungarian',
      hungarian: 'Hungarian',
      hu: 'Hungarian',
      slv: 'Slovenian',
      slovenian: 'Slovenian',
      sl: 'Slovenian',
      hrv: 'Croatian',
      croatian: 'Croatian',
      hr: 'Croatian',
      mac: 'Macedonian',
      macedonian: 'Macedonian',
      mk: 'Macedonian',
      no: 'Norwegian',
      nor: 'Norwegian',
      norwegian: 'Norwegian',
      da: 'Danish',
      dan: 'Danish',
      danish: 'Danish',
      fi: 'Finnish',
      fin: 'Finnish',
      finnish: 'Finnish',
      lt: 'Lithuanian',
      lit: 'Lithuanian',
      lithuanian: 'Lithuanian',
      lv: 'Latvian',
      lav: 'Latvian',
      latvian: 'Latvian',
      sk: 'Slovak',
      slo: 'Slovak',
      slovak: 'Slovak',
      sr: 'Serbian',
      srp: 'Serbian',
      serbian: 'Serbian',
      bs: 'Bosnian',
      bos: 'Bosnian',
      bosnian: 'Bosnian',
      sq: 'Albanian',
      alb: 'Albanian',
      albanian: 'Albanian',
      uk: 'Ukrainian',
      ukr: 'Ukrainian',
      ukrainian: 'Ukrainian',
      ca: 'Catalan',
      cat: 'Catalan',
      catalan: 'Catalan',
      eu: 'Basque',
      eus: 'Basque',
      basque: 'Basque',
      gl: 'Galician',
      glg: 'Galician',
      galician: 'Galician',
      zht: 'Chinese (Traditional)',
      zhs: 'Chinese (Simplified)',
      'zh-tw': 'Chinese (Traditional)',
      'zh-cn': 'Chinese (Simplified)',
      'zh-hk': 'Chinese (Traditional)'
    }

    return languageMap[normalized] || lang.charAt(0).toUpperCase() + lang.slice(1)
  }, [])

  const isExternalSubtitle = useCallback((track: SubtitleTrack): boolean => {
    if (track.external === true) return true

    const title = (track.title || '').toLowerCase()
    const filePath = (track.filePath || '').toLowerCase()

    const externalIndicators = [
      '.srt',
      '.ass',
      '.ssa',
      '.vtt',
      '.sub',
      '.idx',
      'external',
      'downloaded',
      'subtitle'
    ]

    const hasExternalIndicator = externalIndicators.some(
      (indicator) => title.includes(indicator) || filePath.includes(indicator)
    )

    return hasExternalIndicator
  }, [])

  useEffect(() => {
    if (!showSubtitleMenu) {
      setSelectedLanguage(null)
    }
  }, [showSubtitleMenu])

  const loadSubtitleTracks = useCallback(async () => {
    try {
      const tracks = await window.overlayControls.getSubtitleTracks()
      console.log('Raw tracks:', tracks)

      if (tracks && Array.isArray(tracks)) {
        const subsTracks = tracks.filter((track) => track.type === 'sub')
        setAllSubtitleTracks(subsTracks)

        const builtInTracks: SubtitleTrack[] = []
        const externalTracks: ActiveExternalSubtitle[] = []

        subsTracks.forEach((track) => {
          if (isExternalSubtitle(track)) {
            const existingExternal = activeExternalSubtitles.find((ext) => ext.id === track.id)

            if (!existingExternal) {
              const language = normalizeLanguage(track.lang || track.title)
              externalTracks.push({
                id: track.id,
                language,
                filePath: track.filePath || track.title || '',
                isActive: currentSubtitle === track.id
              })
            }
          } else {
            const title = (track.title || '').toLowerCase()
            const isDefinitelyBuiltIn =
              !title.includes('.srt') &&
              !title.includes('.ass') &&
              !title.includes('.vtt') &&
              !title.includes('external') &&
              !title.includes('downloaded')

            if (isDefinitelyBuiltIn) {
              builtInTracks.push(track)
            }
          }
        })

        console.log('Built-in tracks:', builtInTracks)
        console.log('New external tracks:', externalTracks)

        setSubtitleTracks(builtInTracks)

        setActiveExternalSubtitles((prev) => {
          const merged = [...prev]
          externalTracks.forEach((newExt) => {
            if (!merged.find((ext) => ext.id === newExt.id)) {
              merged.push(newExt)
            }
          })
          return merged.map((ext) => ({
            ...ext,
            isActive: ext.id === currentSubtitle
          }))
        })
      }

      const currentSub = await window.overlayControls.getCurrentSubtitle()
      console.log('Current subtitle:', currentSub)
      setCurrentSubtitle(currentSub)
    } catch (err) {
      console.log(err as Error)
    }
  }, [
    setCurrentSubtitle,
    isExternalSubtitle,
    normalizeLanguage,
    currentSubtitle,
    activeExternalSubtitles
  ])

  const handleSearchSubtitles = useCallback(async () => {
    setIsLoadingSubtitles(true)
    try {
      const res = await window.overlayControls.searchSubtitles()
      if (res.success && res.subtitles.length > 0) {
        const normalizedSubtitles = res.subtitles.map((sub) => ({
          ...sub,
          lang: normalizeLanguage(sub.lang)
        }))
        setAvailableSubtitles(normalizedSubtitles)
      } else {
        setAvailableSubtitles([])
      }
    } catch (err) {
      console.log(err as Error)
    } finally {
      setIsLoadingSubtitles(false)
    }
  }, [normalizeLanguage])

  const handleSubtitleSelect = useCallback(
    async (trackId: number | null) => {
      try {
        await window.overlayControls.setSubtitle(trackId)
        setCurrentSubtitle(trackId)

        setActiveExternalSubtitles((prev) =>
          prev.map((ext) => ({ ...ext, isActive: ext.id === trackId }))
        )
      } catch (err) {
        console.log(err as Error)
      }
    },
    [setCurrentSubtitle]
  )

  const applySubtitleSize = useCallback(async (size: number) => {
    try {
      await window.overlayControls.setSubtitleSize(size)
    } catch (err) {
      console.error('Error setting subtitle size:', err)
    }
  }, [])

  const applySubtitleDelay = useCallback(async (delay: number) => {
    try {
      await window.overlayControls.setSubtitleDelay(delay)
    } catch (err) {
      console.error('Error setting subtitle delay:', err)
    }
  }, [])

  const handleDownloadSubtitle = useCallback(
    async (subtitle: ExternalSubtitle) => {
      try {
        const res = await window.overlayControls.downloadSubtitle(subtitle)
        if (res.success) {
          await window.overlayControls.addExternalSubtitle(res.filepath)

          setAvailableSubtitles((prev) => prev.filter((sub) => sub.id !== subtitle.id))

          setTimeout(async () => {
            const tracks = await window.overlayControls.getSubtitleTracks()
            if (tracks && Array.isArray(tracks)) {
              const subTracks = tracks.filter((track) => track.type === 'sub')

              const newSubTrack = subTracks.find(
                (track) =>
                  isExternalSubtitle(track) &&
                  !activeExternalSubtitles.some((ext) => ext.id === track.id) &&
                  !subtitleTracks.some((builtin) => builtin.id === track.id)
              )

              if (newSubTrack) {
                const newActiveExternal: ActiveExternalSubtitle = {
                  id: newSubTrack.id,
                  language: normalizeLanguage(subtitle.lang),
                  filePath: res.filepath,
                  isActive: true
                }

                setActiveExternalSubtitles((prev) => [
                  ...prev.map((ext) => ({ ...ext, isActive: false })),
                  newActiveExternal
                ])

                await window.overlayControls.setSubtitle(newSubTrack.id)
                setCurrentSubtitle(newSubTrack.id)
              }
            }
          }, 500)
        }
      } catch (err) {
        console.error(err as Error)
      }
    },
    [
      activeExternalSubtitles,
      subtitleTracks,
      isExternalSubtitle,
      normalizeLanguage,
      setCurrentSubtitle
    ]
  )

  const getLanguageStatus = useCallback(
    (language: string) => {
      const builtInActive = subtitleTracks.find(
        (track) =>
          normalizeLanguage(track.lang || track.title) === language && currentSubtitle === track.id
      )

      const externalActive = activeExternalSubtitles.find(
        (ext) => ext.language === language && ext.isActive
      )

      return {
        isActive: Boolean(builtInActive || externalActive),
        isExternal: Boolean(externalActive),
        activeTrack: builtInActive || externalActive
      }
    },
    [subtitleTracks, activeExternalSubtitles, currentSubtitle, normalizeLanguage]
  )

  useEffect(() => {
    if (showSubtitleMenu) {
      loadSubtitleTracks()
      if (availableSubtitles.length === 0 && !isLoadingSubtitles) {
        handleSearchSubtitles()
      }
    }
  }, [
    availableSubtitles.length,
    handleSearchSubtitles,
    isLoadingSubtitles,
    loadSubtitleTracks,
    showSubtitleMenu
  ])

  useEffect(() => {
    let mounted = true

    if (showSubtitleMenu && availableSubtitles.length === 0 && !isLoadingSubtitles) {
      const searchTimer = setTimeout(() => {
        if (mounted) {
          handleSearchSubtitles()
        }
      }, 100)

      return () => {
        mounted = false
        clearTimeout(searchTimer)
      }
    }
  }, [showSubtitleMenu, availableSubtitles.length, isLoadingSubtitles, handleSearchSubtitles])

  useEffect(() => {
    setActiveExternalSubtitles((prev) =>
      prev.map((ext) => ({ ...ext, isActive: ext.id === currentSubtitle }))
    )
  }, [currentSubtitle])

  const adjustSubtitleSize = useCallback(
    (delta: number) => {
      const newSize = Math.max(50, Math.min(200, subtitleSize + delta))
      setSubtitleSize(newSize)
      applySubtitleSize(newSize)
    },
    [subtitleSize, applySubtitleSize]
  )

  const adjustSubtitleDelay = useCallback(
    (delta: number) => {
      const newDelay = Math.max(-10, Math.min(10, subtitleDelay + delta))
      setSubtitleDelay(newDelay)
      applySubtitleDelay(newDelay)
    },
    [subtitleDelay, applySubtitleDelay]
  )

  if (!showSubtitleMenu) return null

  return (
    <div
      ref={subtitleMenuRef}
      className="absolute -right-22 bottom-full mb-10 w-[600px] h-[500px] backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-[1000] pointer-events-auto bg-black/90"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex h-full">
        <div className="w-60 border-r border-white/10">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-white font-medium text-sm">Subtitles</h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <div
              className={`flex items-center justify-between px-4 py-3 hover:bg-white/10 cursor-pointer transition-colors ${
                currentSubtitle === 0 || currentSubtitle === null
                  ? 'bg-purple-600/20 border-r-2 border-purple-500'
                  : ''
              }`}
              onClick={(e) => {
                e.stopPropagation()
                handleSubtitleSelect(0)
                setSelectedLanguage(null)
              }}
            >
              <span className="text-white text-sm">Off</span>
              {(currentSubtitle === 0 || currentSubtitle === null) && (
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              )}
            </div>

            {(() => {
              const builtInLanguages = new Set(
                subtitleTracks
                  .filter((track) => !isExternalSubtitle(track))
                  .map((track) => normalizeLanguage(track.lang || track.title))
              )
              const activeExternalLanguages = new Set(
                activeExternalSubtitles
                  .filter((ext) => {
                    const lang = ext.language.toLowerCase()
                    return (
                      !lang.includes('.srt') &&
                      !lang.includes('.ass') &&
                      !lang.includes('.vtt') &&
                      !lang.includes('subtitle') &&
                      !lang.includes('downloaded') &&
                      !lang.includes('external') &&
                      !lang.match(/\d+/) &&
                      lang.length > 2
                    )
                  })
                  .map((ext) => ext.language)
              )

              const availableLanguages = new Set(
                availableSubtitles.map((sub) => normalizeLanguage(sub.lang))
              )

              const allLanguages = new Set([
                ...builtInLanguages,
                ...activeExternalLanguages,
                ...availableLanguages
              ])

              return Array.from(allLanguages)
                .filter((lang) => lang !== 'Unknown')
                .map((language) => {
                  const status = getLanguageStatus(language)

                  const builtInCount = subtitleTracks.filter(
                    (track) =>
                      normalizeLanguage(track.lang || track.title) === language &&
                      !isExternalSubtitle(track)
                  ).length

                  const externalCount = availableSubtitles.filter(
                    (sub) => normalizeLanguage(sub.lang) === language
                  ).length

                  const activeExternalCount = activeExternalSubtitles.filter(
                    (ext) => ext.language === language
                  ).length

                  const totalCount = builtInCount + externalCount + activeExternalCount

                  if (totalCount === 0) return null

                  const primaryBuiltIn = subtitleTracks.find(
                    (track) =>
                      normalizeLanguage(track.lang || track.title) === language &&
                      !isExternalSubtitle(track)
                  )

                  return (
                    <div key={language}>
                      <div
                        className={`flex items-center justify-between px-4 py-3 hover:bg-white/10 cursor-pointer transition-colors ${
                          status.isActive
                            ? status.isExternal
                              ? 'bg-purple-600/20 border-r-2 border-purple-500'
                              : 'bg-blue-600/20 border-r-2 border-blue-500'
                            : ''
                        } ${selectedLanguage === language ? 'bg-white/5' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (primaryBuiltIn) {
                            handleSubtitleSelect(primaryBuiltIn.id)
                          }
                          setSelectedLanguage(language)
                        }}
                      >
                        <span className="text-white text-sm">{language}</span>
                        <div className="flex items-center gap-2">
                          {totalCount > 0 && (
                            <span className="text-white/60 text-xs font-mono">{totalCount}</span>
                          )}
                          {status.isActive && (
                            <div
                              className={`w-2 h-2 rounded-full ${
                                status.isExternal ? 'bg-purple-500' : 'bg-purple-500'
                              }`}
                            ></div>
                          )}
                          {totalCount > 0 && (
                            <svg
                              className="w-3 h-3 text-white/40"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
                .filter(Boolean)
            })()}

            <div className="border-t border-white/10 p-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSearchSubtitles()
                }}
                disabled={isLoadingSubtitles}
                className="w-full text-center text-blue-400 hover:text-blue-300 text-sm py-2 transition-colors disabled:opacity-50"
              >
                {isLoadingSubtitles ? 'Searching...' : 'Search more'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1">
          {selectedLanguage ? (
            <div className="p-4">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/80 text-sm">Size</span>
                  <span className="text-white text-sm font-medium">{subtitleSize}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => adjustSubtitleSize(-10)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-lg font-bold"
                  >
                    −
                  </button>
                  <div className="flex-1 h-2 bg-white/20 rounded-full relative">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all duration-200"
                      style={{ width: `${((subtitleSize - 50) / 150) * 100}%` }}
                    ></div>
                    <div
                      className="absolute top-3 w-4 h-4 bg-white rounded-full transform -translate-y-1/2 shadow-md transition-all duration-200"
                      style={{
                        left: `${((subtitleSize - 50) / 150) * 100}%`,
                        transform: 'translateX(-50%) translateY(-50%)'
                      }}
                    ></div>
                  </div>
                  <button
                    onClick={() => adjustSubtitleSize(10)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/80 text-sm">Delay</span>
                  <span className="text-white text-sm font-medium">
                    {subtitleDelay.toFixed(1)}s
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => adjustSubtitleDelay(-0.5)}
                    className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
                  >
                    -0.5s
                  </button>
                  <button
                    onClick={() => adjustSubtitleDelay(-0.1)}
                    className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
                  >
                    -0.1s
                  </button>
                  <button
                    onClick={() => {
                      setSubtitleDelay(0)
                      applySubtitleDelay(0)
                    }}
                    className={`px-3 py-1 rounded text-white text-xs transition-colors ${
                      subtitleDelay === 0 ? 'bg-purple-800' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    0.0s
                  </button>
                  <button
                    onClick={() => adjustSubtitleDelay(0.1)}
                    className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
                  >
                    +0.1s
                  </button>
                  <button
                    onClick={() => adjustSubtitleDelay(0.5)}
                    className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
                  >
                    +0.5s
                  </button>
                </div>
              </div>
              <div>
                <span className="text-white/80 text-sm block mb-3">Available Tracks</span>
                <div className="space-y-2 max-h-50 overflow-y-auto">
                  {(() => {
                    const builtInTracks = subtitleTracks
                      .filter((track) => {
                        const trackLang = normalizeLanguage(track.lang || track.title)
                        return trackLang === selectedLanguage
                      })
                      .map((track) => ({
                        ...track,
                        type: 'builtin',
                        language: normalizeLanguage(track.lang || track.title)
                      }))

                    const activeExternalTracks = activeExternalSubtitles
                      .filter((ext) => ext.language === selectedLanguage)
                      .map((ext) => ({
                        id: ext.id,
                        type: 'external-active',
                        language: ext.language,
                        filePath: ext.filePath,
                        isActive: ext.isActive
                      }))

                    const availableExternalTracks = availableSubtitles
                      .filter((sub) => normalizeLanguage(sub.lang) === selectedLanguage)
                      .slice(0, 10)
                      .map((sub, index) => ({
                        id: `external-${sub.id}`,
                        language: normalizeLanguage(sub.lang),
                        type: 'external',
                        subtitle: sub,
                        number: index + 1
                      }))

                    const builtInAndActiveExternal = [...builtInTracks, ...activeExternalTracks]

                    return (
                      <div className="space-y-3">
                        {availableExternalTracks.length > 0 && (
                          <div className="pt-3 border-t border-white/20">
                            <div className="text-white/70 text-xs mb-3 font-medium">
                              External Options ({availableExternalTracks.length})
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {availableExternalTracks.map((item) => (
                                <button
                                  key={item.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDownloadSubtitle(item.subtitle)
                                  }}
                                  className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors flex items-center justify-center border border-white/10 hover:border-white/30"
                                  title={`Download subtitle ${item.number}`}
                                >
                                  {item.number}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {builtInAndActiveExternal.length > 0 && (
                          <div className="space-y-2">
                            {builtInAndActiveExternal.map((item, index) => (
                              <div key={`${item.id}-${index}`}>
                                {item.type === 'builtin' ? (
                                  <div
                                    className={`flex items-center justify-between p-2 rounded hover:bg-white/10 cursor-pointer transition-colors ${
                                      currentSubtitle === item.id
                                        ? 'bg-purple-600/20'
                                        : 'bg-white/5'
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleSubtitleSelect(item.id)
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                      <span className="text-white text-sm">
                                        Built-in {item.title && `(${item.id})`}
                                      </span>
                                    </div>
                                    {currentSubtitle === item.id && (
                                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                    )}
                                  </div>
                                ) : (
                                  <div
                                    className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                                      item.isActive
                                        ? 'bg-purple-600/20'
                                        : 'bg-white/5 hover:bg-white/10'
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleSubtitleSelect(item.id)
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-white/30"></div>
                                      <span className="text-white text-sm">
                                        {item.filePath && ` ${item.language} ${item.id}`}
                                      </span>
                                    </div>
                                    {item.isActive && (
                                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {builtInAndActiveExternal.length === 0 &&
                          availableExternalTracks.length === 0 && (
                            <div className="text-white/60 text-sm p-2 text-center">
                              No tracks available for {selectedLanguage}
                            </div>
                          )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white/60">
                <svg
                  className="w-12 h-12 mx-auto mb-3 opacity-40"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6v-2zm0 4h8v2H6v-2zm10 0h2v2h-2v-2zm-6-4h8v2h-8v-2z" />
                </svg>
                <p className="text-sm">Select a language to see options</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SubtitleMenu
