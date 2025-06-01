import { Routes, Route, useNavigate } from 'react-router-dom'
import useFriends from '@/hooks/useFriends'
import { useRoom } from './hooks/useRoom'
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
import { useMovies } from './hooks/useMovies'

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

  const { connected: wsConnected } = useWebSocketConnection(token)

  const { searchCatalog } = useMovies(token)

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

  const {
    messages,
    connected,
    isInRoom,
    room,
    roomState,
    sendMessage,
    sendPlaybackUpdate,
    joinRoom,
    leaveRoom,
    createRoom,
    getRoom,
    deleteRoom
  } = useRoom(token, user)

  console.log('Friends:', friends)

  const { enhancedFriends, setStatus } = usePresence(friends, token)

  console.log('Enhanced Friends:', enhancedFriends)

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
    playerSource,
    showDetailsModal,
    details,
    detailsLoading,
    handleMovieClick,
    handleWatchAlone,
    handleCloseDetails,
    handleAddExtension,
    clearPlayerSource
  } = useDetailsModal()

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
                party={room?.members}
                isHost={room?.userRole === 'owner'}
                onCreateParty={createRoom}
                onInviteFriend={() => {}}
                onKickMember={() => {}}
                onStartParty={() => {}}
                onLeaveParty={leaveRoom}
              />
              <VideoPlayer
                source={playerSource}
                details={details}
                onExit={() => {
                  clearPlayerSource()
                  navigate('/')
                }}
              />
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
                party={room?.members}
                isHost={room?.userRole === 'owner'}
                onCreateParty={createRoom}
                onInviteFriend={() => {}}
                onKickMember={() => {}}
                onStartParty={() => {}}
                onLeaveParty={leaveRoom}
              />
              <FriendsSidebar
                friends={enhancedFriends}
                friendRequests={friendRequests}
                friendsLoading={friendsLoading}
                friendsError={friendsError}
                onFriendAction={onFriendAction}
                searchUser={searchUser}
              />
              <DiscoverPage token={token} onMovieClick={handleMovieClick} />
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
                party={room?.members}
                isHost={room?.userRole === 'owner'}
                onCreateParty={createRoom}
                onInviteFriend={() => {}}
                onKickMember={() => {}}
                onStartParty={() => {}}
                onLeaveParty={leaveRoom}
              />
              <FriendsSidebar
                friends={enhancedFriends}
                friendRequests={friendRequests}
                friendsLoading={friendsLoading}
                friendsError={friendsError}
                onFriendAction={onFriendAction}
                searchUser={searchUser}
              />
              <HomePage token={token} onMovieClick={handleMovieClick} />
            </div>
          }
        />
      </Routes>
    </>
  )
}
