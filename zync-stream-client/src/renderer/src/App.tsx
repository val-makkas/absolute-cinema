import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { entry, Source } from '@/types'
import { useMovies } from '@/hooks/useMovies'
import { useMovieDetails } from '@/hooks/useMovieDetails'
//import { useChat } from '@/hooks/useChat'
import { useUsers } from '@/hooks/useUsers'
import MovieList from '@/components/MovieList'
import DetailsModal from '@/modals/DetailsModal'
//import ChatPanel from '@/components/ChatPanel';
import Sidebar from '@/components/Sidebar'
import ExtensionsModal from '@/modals/ExtensionsModal'
import AuthForm from '@/components/AuthForm'
import VideoPlayer from '@/components/VideoPlayer'
//import loadingBg from '../public/loading.png'

export default function App(): React.ReactElement {
  const [search, setSearch] = useState<string>('')
  //const [roomId, setRoomId] = useState<string>('default-room')
  const [selectedMovie, setSelectedMovie] = useState<entry | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false)
  //const [chatInput, setChatInput] = useState('')
  //const [chatOpen, setChatOpen] = useState<boolean>(true)
  const [extensionsOpen, setExtensionsOpen] = useState<boolean>(false)
  const [newManifestUrl, setNewManifestUrl] = useState<string>('')
  const [showExtensionDetails, setShowExtensionDetails] = useState<string | null>(null) // url or null
  const [playerSource, setPlayerSource] = useState<Source | null>(null)
  const [type, setType] = useState<'movie' | 'series'>('movie')
  const [catalog, setCatalog] = useState<'IMDB' | 'CINE' | 'PDM'>('CINE')

  // Extension manifests state
  const [extensionManifests, setExtensionManifests] = useState<Record<string, unknown>>({})

  // Use the custom user hook
  const {
    token,
    username,
    extensions,
    loading: userLoading,
    error: userError,
    register,
    login,
    logout,
    updateExtensions
  } = useUsers()

  const {
    movies,
    loading: moviesLoading,
    error: moviesError,
    loadMore,
    searching
  } = useMovies(search, type, catalog)

  const {
    details,
    loading: detailsLoading,
    fetchDetails,
    isCached,
    setDetailsFromCache
  } = useMovieDetails()

  //const { messages, status, send, joinRoom, disconnect } = useChat({ roomId, username })
  const navigate = useNavigate()

  // Fetch manifests when extensions change
  useEffect(() => {
    async function fetchManifests(): Promise<void> {
      const manifests = {}
      await Promise.all(
        extensions.map(async (ext) => {
          const url = typeof ext === 'string' ? ext : ext.url
          try {
            const res = await fetch(url)
            if (!res.ok) throw new Error('Failed to fetch manifest')
            const manifest = await res.json()
            manifests[url] = manifest
          } catch (e) {
            manifests[url] = undefined
            console.log(e)
          }
        })
      )
      setExtensionManifests(manifests)
    }
    if (extensions && extensions.length > 0) fetchManifests()
    else setExtensionManifests({})
  }, [extensions])

  useEffect(() => {
    if (selectedMovie && !detailsLoading && details && !showDetailsModal) {
      setShowDetailsModal(true)
    }
  }, [detailsLoading, details, selectedMovie, showDetailsModal])

  const handleWatchAlone = (details, selectedSource: Source): void => {
    if (details?.id && selectedSource?.infoHash) {
      setPlayerSource(selectedSource)
      setShowDetailsModal(false) // Close modal
      navigate('/watch-alone/', { state: { selectedSource, details } }) // Pass source and details in the state
    } else {
      alert('No valid streaming source selected.')
    }
  }

  const addExtension = (): void => {
    setShowDetailsModal(false)
    setSelectedMovie(null)
    setExtensionsOpen(true)
  }

  /* function LoginSuccessHandler(): React.ReactElement {
    const navigate = useNavigate()
    const { login } = useUsers() // get login from hook
    const [message, setMessage] = useState('Waiting for authentication...')

    useEffect(() => {
      let handled = false
      if (window.electronAPI && window.electronAPI.onOAuthToken) {
        window.electronAPI.onOAuthToken(async (token) => {
          if (handled) return
          handled = true
          try {
            localStorage.setItem('jwt', token)
            await loginWithToken(token)
            setMessage('Login successful! Redirecting...')
            setTimeout(() => navigate('/'), 1000)
          } catch (_) {
            setMessage('Login failed. Please try again.')
          }
        })
      } else {
        setMessage('Please open the app to complete login.')
      }
    }, [login, navigate])

    return (
      <div style={{ color: '#fff', textAlign: 'center', marginTop: '20vh' }}>
        <h2>Google Login</h2>
        <p>{message}</p>
      </div>
    )
  } */

  // Render if not logged in
  if (!token) {
    return (
      <Routes>
        <Route
          path="/auth"
          element={
            <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
              <div className="w-full max-w-sm">
                <AuthForm
                  onLogin={login}
                  onRegister={register}
                  error={userError}
                  loading={userLoading}
                />
              </div>
            </div>
          }
        />
        <Route
          path="*"
          element={
            <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
              <div className="w-full max-w-sm">
                <AuthForm
                  onLogin={login}
                  onRegister={register}
                  error={userError}
                  loading={userLoading}
                />
              </div>
            </div>
          }
        />
      </Routes>
    )
  }

  const handleMovieClick = (movie: entry): void => {
    setSelectedMovie(movie)
    if (movie.imdb_id && isCached(movie.imdb_id)) {
      setDetailsFromCache(movie.imdb_id)
      setShowDetailsModal(true)
    } else if (movie.id && isCached(movie.id)) {
      setDetailsFromCache(movie.id)
      setShowDetailsModal(true)
    } else if (movie.id) {
      setShowDetailsModal(false) // wait for loading
      fetchDetails(movie.id, movie.type as 'movie' | 'series')
    } else if (movie.imdb_id) {
      setShowDetailsModal(false) // wait for loading
      fetchDetails(movie.imdb_id, movie.type as 'movie' | 'series')
    } else {
      alert('Movie identifiers are missing.')
    }
  }
  const handleCloseDetails = (): void => {
    setShowDetailsModal(false)
    setSelectedMovie(null)
  }
  /* const handleSendChat = () => {
    if (chatInput.trim()) {
      send(chatInput)
      setChatInput('')
    }
  } */
  const handleSidebar = (key: string): void => {
    if (key === 'home') {
      navigate('/')
      setSearch('')
      setShowDetailsModal(false)
    }
    if (key === 'extensions') setExtensionsOpen(true)
  }

  const handleSearch = (value: string): void => {
    value.length > 3 ? setSearch(value) : setSearch('')
  }

  return (
    <Routes>
      <Route
        path="/watch-alone/"
        element={
          <div>
            <Sidebar
              onSelect={handleSidebar}
              onSearchValue={handleSearch}
              onLogout={logout}
              username={username}
              searching={searching}
            />
            <div>
              <VideoPlayer source={playerSource} details={details} />
            </div>
          </div>
        }
      />
      <Route
        path="/"
        element={
          <div className="flex-auto bg-background font-sans text-white">
            {/* Sidebar */}
            <Sidebar
              onSelect={handleSidebar}
              onSearchValue={handleSearch}
              onLogout={logout}
              username={username}
              searching={searching}
            />
            {/* Main Content */}
            <main className="flex-1 px-4 md:px-40 py-18 bg-background min-h-screen">
              <MovieList
                movies={movies}
                moviesLoading={moviesLoading}
                moviesError={moviesError}
                onMovieClick={handleMovieClick}
                type={type}
                catalog={catalog}
                onCatalogChange={setCatalog}
                onTypeChange={setType}
                onLoadMore={loadMore}
              />
              <DetailsModal
                open={showDetailsModal}
                details={details}
                extensionManifests={extensionManifests}
                detailsLoading={detailsLoading}
                onClose={handleCloseDetails}
                onWatchAlone={(src) => handleWatchAlone(details, src)}
                addExtension={addExtension}
              />
              <ExtensionsModal
                open={extensionsOpen}
                onOpenChange={setExtensionsOpen}
                extensions={extensions}
                extensionManifests={extensionManifests}
                newManifestUrl={newManifestUrl}
                setNewManifestUrl={setNewManifestUrl}
                onAdd={async () => {
                  if (!newManifestUrl) return
                  if (!/^https?:\/\//.test(newManifestUrl)) return alert('Please enter a valid URL')

                  // Check for duplicates
                  if (
                    extensions.some(
                      (ext) =>
                        ext.url === newManifestUrl ||
                        (typeof ext === 'object' && ext.url === newManifestUrl)
                    )
                  )
                    return alert('Extension already added')

                  try {
                    // Fetch the manifest data first
                    const manifestResponse = await fetch(newManifestUrl, {
                      headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json'
                      }
                    })

                    if (!manifestResponse.ok) {
                      throw new Error('Failed to fetch manifest data')
                    }

                    const manifestData = await manifestResponse.json()

                    // Validate the manifest has the required fields
                    if (!manifestData.name) {
                      throw new Error('Invalid manifest: missing name property')
                    }

                    // Store the manifest data
                    setExtensionManifests((prevManifests) => ({
                      ...prevManifests,
                      [newManifestUrl]: manifestData
                    }))

                    // Update extensions list
                    await updateExtensions([...extensions, { url: newManifestUrl }])

                    console.log('Extension added successfully:', manifestData.name)
                    setNewManifestUrl('')
                  } catch (error) {
                    console.error('Failed to add extension:', error)
                    alert(`Failed to add extension: ${(error as Error).message}`)
                  }
                }}
                onRemove={async (url) => {
                  try {
                    await updateExtensions(extensions.filter((ext) => ext.url !== url))

                    // Remove the manifest data for this URL
                    setExtensionManifests((prevManifests) => {
                      const newManifests = { ...prevManifests }
                      delete newManifests[url]
                      return newManifests
                    })
                  } catch (error) {
                    console.error('Failed to remove extension:', error)
                    alert('Failed to remove extension.')
                  }
                }}
                showExtensionDetails={showExtensionDetails}
                setShowExtensionDetails={setShowExtensionDetails}
              />
            </main>
          </div>
        }
      />
    </Routes>
  )
}

/* function StreamWithLoadingBG() {
  const [showLoading, setShowLoading] = React.useState(true)
  const navigate = useNavigate()
  React.useEffect(() => {
    const timer = setTimeout(() => setShowLoading(false), 15000)
    return () => clearTimeout(timer)
  }, [])
  return (
    <div
      style={{
        minHeight: '100vh',
        background: `url(${loadingBg}) 100% center / cover no-repeat, ${BG_GRADIENT}`,
        fontFamily: FONT_HEADER,
        position: 'relative',
        display: 'flex'
      }}
    >
      <div
        style={{
          flexGrow: 1,
          marginLeft: 64,
          width: 'calc(100% - 64px)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ flexGrow: 1, display: 'flex', position: 'relative' }}>
          {showLoading && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(18,18,20,0.82)',
                zIndex: 9999
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <svg
                  width="80"
                  height="80"
                  viewBox="0 0 50 50"
                  style={{ animation: 'spin 1s linear infinite', marginBottom: 24, marginTop: -48 }}
                >
                  <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="31.4 31.4"
                  />
                  <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                </svg>
                <button
                  onClick={() => navigate('/')}
                  style={{
                    marginTop: 0,
                    padding: '12px 36px',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: '#181818',
                    background: '#fff',
                    border: 'none',
                    borderRadius: 14,
                    boxShadow: '0 2px 8px #0006',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    outline: 'none',
                    zIndex: 9999
                  }}
                >
                  Back to Home
                </button>
              </div>
            </div>
          )}
          <VideoPlayer />
          {!showLoading && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, calc(-50% + 48px))',
                width: '100%'
              }}
            >
              <button
                onClick={() => navigate('/')}
                style={{
                  marginTop: 24,
                  padding: '12px 36px',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: '#181818',
                  background: '#fff',
                  border: 'none',
                  borderRadius: 14,
                  boxShadow: '0 2px 8px #0006',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  outline: 'none',
                  zIndex: 9999
                }}
              >
                Back to Home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} */
