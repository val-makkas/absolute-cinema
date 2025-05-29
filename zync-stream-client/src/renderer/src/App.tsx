import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { entry, Source } from '@/types'
import { useMovies } from '@/hooks/useMovies'
import { useMovieDetails } from '@/hooks/useMovieDetails'
//import { useChat } from '@/hooks/useChat'
import { useUsers } from '@/hooks/useUsers'
import MovieList from '@/components/MovieList'
import DetailsModal from '@/modals/DetailsModal'
//import ChatPanel from '@/components/ChatPanel';
import FriendsSidebar from '@/components/Friends/FriendsSidebar'
import Sidebar from '@/components/Sidebar'
import ExtensionsModal from '@/modals/ExtensionsModal'
import AuthForm from '@/components/AuthForm'
import VideoPlayer from '@/components/VideoPlayer'
import useFriends from '@/hooks/useFriends'
import useWatchHistory from './hooks/useWatchHistory'
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
    user,
    extensions,
    loading: userLoading,
    error: userError,
    register,
    login,
    logout,
    updateExtensions
  } = useUsers()

  const {
    friends,
    friendRequests,
    loading: friendsLoading,
    error: friendsError,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend
  } = useFriends(token)

  const {
    watchHistory,
    watchHistoryItem,
    loading,
    error,
    updateWatchHistory,
    getWatchHistoryItem
  } = useWatchHistory(token)

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

  const handleFriendAction = (
    action: 'send' | 'accept' | 'reject' | 'remove',
    payload: string
  ): void => {
    switch (action) {
      case 'send':
        if (!payload) return
        sendFriendRequest(payload)
        break
      case 'accept':
        acceptFriendRequest(payload)
        break
      case 'reject':
        rejectFriendRequest(payload)
        break
      case 'remove':
        removeFriend(payload)
        break
    }
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
              username={user?.display_name || null}
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
            <Sidebar
              onSelect={handleSidebar}
              onSearchValue={handleSearch}
              onLogout={logout}
              username={user?.display_name || null}
              searching={searching}
            />
            <div className="flex">
              <div className="flex-1 mix-w-0">
                <main className="px-4 md:px-8 py-4 bg-background min-h-screen">
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
                      if (!/^https?:\/\//.test(newManifestUrl))
                        return alert('Please enter a valid URL')

                      if (
                        extensions.some(
                          (ext) =>
                            ext.url === newManifestUrl ||
                            (typeof ext === 'object' && ext.url === newManifestUrl)
                        )
                      )
                        return alert('Extension already added')

                      try {
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

                        if (!manifestData.name) {
                          throw new Error('Invalid manifest: missing name property')
                        }

                        setExtensionManifests((prevManifests) => ({
                          ...prevManifests,
                          [newManifestUrl]: manifestData
                        }))

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
              <div className="fixed right-0 top-0 h-full">
                <FriendsSidebar
                  friends={friends}
                  friendRequests={friendRequests}
                  friendsLoading={friendsLoading}
                  friendsError={friendsError}
                  onFriendAction={handleFriendAction}
                />
              </div>
            </div>
          </div>
        }
      />
    </Routes>
  )
}
