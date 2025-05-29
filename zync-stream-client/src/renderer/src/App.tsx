import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useUsers } from '@/hooks/useUsers'
import useFriends from '@/hooks/useFriends'
import useWatchHistory from '@/hooks/useWatchHistory'
import useExtensions from '@/hooks/useExtensions'
import useDetailsModal from '@/hooks/useDetailsModal'
import Sidebar from '@/components/Sidebar'
import FriendsSidebar from '@/components/Friends/FriendsSidebar'
import ExtensionsModal from '@/modals/ExtensionsModal'
import DetailsModal from '@/modals/DetailsModal'
import VideoPlayer from '@/components/VideoPlayer'
import AuthPage from '@/pages/AuthPage'
import HomePage from '@/pages/HomePage'
import DiscoverPage from '@/pages/DiscoverPage'

export default function App(): React.ReactElement {
  const location = useLocation()
  const navigate = useNavigate()

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Core hooks
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
    extensionManifests,
    extensionsOpen,
    setExtensionsOpen,
    newManifestUrl,
    setNewManifestUrl,
    showExtensionDetails,
    setShowExtensionDetails,
    addExtension,
    removeExtension
  } = useExtensions(extensions)

  const {
    watchHistory,
    watchHistoryItem,
    loading: watchHistoryLoading,
    error: watchHistoryError,
    updateWatchHistory,
    getWatchHistoryItem
  } = useWatchHistory(token)

  // Details modal hook with all business logic
  const {
    playerSource,
    selectedMovie,
    showDetailsModal,
    details,
    detailsLoading,
    handleMovieClick,
    handleWatchAlone,
    handleCloseDetails,
    handleAddExtension
  } = useDetailsModal()

  if (!token) {
    return (
      <AuthPage onLogin={login} onRegister={register} error={userError} loading={userLoading} />
    )
  }

  const onFriendAction = (
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

  const handleSidebar = (key: string): void => {
    if (key === 'home') navigate('/')
    else if (key == 'discover') navigate('/discover')
    else if (key == 'extensions') setExtensionsOpen(true)
  }

  return (
    <>
      <DetailsModal
        open={showDetailsModal}
        details={details}
        extensionManifests={extensionManifests}
        detailsLoading={detailsLoading}
        onClose={handleCloseDetails}
        onWatchAlone={handleWatchAlone}
        addExtension={() => handleAddExtension(setExtensionsOpen)}
      />
      <ExtensionsModal
        open={extensionsOpen}
        onOpenChange={setExtensionsOpen}
        extensions={extensions}
        extensionManifests={extensionManifests}
        newManifestUrl={newManifestUrl}
        setNewManifestUrl={setNewManifestUrl}
        onAdd={() => addExtension(updateExtensions)}
        onRemove={(url) => removeExtension(url, updateExtensions)}
        showExtensionDetails={showExtensionDetails}
        setShowExtensionDetails={setShowExtensionDetails}
      />
      <Routes>
        <Route
          path="/watch-alone"
          element={
            <div>
              <Sidebar
                onSelect={handleSidebar}
                onSearchValue={() => {}}
                onLogout={logout}
                username={user?.display_name || null}
                searching={false}
              />
              <VideoPlayer source={playerSource} details={null} />
            </div>
          }
        />
        <Route
          path="/discover"
          element={
            <div>
              <Sidebar
                onSelect={handleSidebar}
                onSearchValue={() => {}}
                onLogout={logout}
                username={user?.display_name || null}
                searching={false}
              />
              <FriendsSidebar
                friends={friends}
                friendRequests={friendRequests}
                friendsLoading={friendsLoading}
                friendsError={friendsError}
                onFriendAction={onFriendAction}
              />
              <DiscoverPage onMovieClick={handleMovieClick} />
            </div>
          }
        />
        <Route
          path="/"
          element={
            <div>
              <Sidebar
                onSelect={handleSidebar}
                onSearchValue={() => {}}
                onLogout={logout}
                username={user?.display_name || null}
                searching={false}
              />
              <FriendsSidebar
                friends={friends}
                friendRequests={friendRequests}
                friendsLoading={friendsLoading}
                friendsError={friendsError}
                onFriendAction={onFriendAction}
              />
              <HomePage watchHistory={watchHistory} onMovieClick={handleMovieClick} />
            </div>
          }
        />
      </Routes>
    </>
  )
}
