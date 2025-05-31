import { useCallback } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import useFriends from '@/hooks/useFriends'
import useWatchHistory from '@/hooks/useWatchHistory'
import useExtensions from '@/hooks/useExtensions'
import useDetailsModal from '@/hooks/useDetailsModal'
import useNotifications from '@/hooks/useNotifications'
import { useWebSocketConnection } from '@/hooks/useWebSocketConnection'
import { usePresence } from '@/hooks/usePresence'
import Sidebar from '@/components/Sidebar'
import FriendsSidebar from '@/components/Friends/FriendsSidebar'
import ExtensionsModal from '@/modals/ExtensionsModal'
import DetailsModal from '@/modals/DetailsModal'
import VideoPlayer from '@/components/VideoPlayer'
import HomePage from '@/pages/HomePage'
import DiscoverPage from '@/pages/DiscoverPage'
import { User } from '@/types'

interface AuthenticatedAppProps {
  token: string
  user: User | null
  extensions: any[]
  logout: () => void
  updateExtensions: (extensions: any[]) => void
}

export default function AuthenticatedApp({
  token,
  user,
  extensions,
  logout,
  updateExtensions
}: AuthenticatedAppProps): React.ReactElement {
  const navigate = useNavigate()

  // Now all these hooks are safe to call because we know token exists
  const { connected: wsConnected, connecting } = useWebSocketConnection(token)

  const {
    friends,
    friendRequests,
    loading: friendsLoading,
    error: friendsError,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    searchUser,
    refreshData
  } = useFriends(token)

  console.log('👤 Friends:', friends)

  const { enhancedFriends, setStatus } = usePresence(friends, token)

  console.log('👤 Enhanced Friends:', enhancedFriends)
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, removeNotification } =
    useNotifications(token, refreshData)

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

  // Event handlers
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
    else if (key === 'discover') navigate('/discover')
    else if (key === 'extensions') setExtensionsOpen(true)
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
                notifications={notifications}
                unreadCount={unreadCount}
                connected={wsConnected}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onClearAll={clearAll}
                onRemoveNotification={removeNotification}
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
                notifications={notifications}
                unreadCount={unreadCount}
                connected={wsConnected}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onClearAll={clearAll}
                onRemoveNotification={removeNotification}
              />
              <FriendsSidebar
                friends={enhancedFriends}
                friendRequests={friendRequests}
                friendsLoading={friendsLoading}
                friendsError={friendsError}
                onFriendAction={onFriendAction}
                searchUser={searchUser}
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
                notifications={notifications}
                unreadCount={unreadCount}
                connected={wsConnected}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onClearAll={clearAll}
                onRemoveNotification={removeNotification}
              />
              <FriendsSidebar
                friends={enhancedFriends}
                friendRequests={friendRequests}
                friendsLoading={friendsLoading}
                friendsError={friendsError}
                onFriendAction={onFriendAction}
                searchUser={searchUser}
              />
              <HomePage watchHistory={watchHistory} onMovieClick={handleMovieClick} />
            </div>
          }
        />
      </Routes>
    </>
  )
}
