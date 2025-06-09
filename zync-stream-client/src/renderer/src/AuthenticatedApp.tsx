import { useState, useEffect } from 'react'
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
import PartyPage from './pages/PartyPage'
import HomePage from '@/pages/HomePage'
import DiscoverPage from '@/pages/DiscoverPage'
import { User } from '@/types'
import { Extension } from '@/types'
import StartSoloPage from './pages/StartSoloPage'

interface AuthenticatedAppProps {
  token: string
  user: User | null
  extensions: Extension[]
  logout: () => void
  updateExtensions: (extensions: Extension[]) => Promise<void>
}

export default function AuthenticatedApp({
  token,
  user,
  extensions,
  logout,
  updateExtensions
}: AuthenticatedAppProps): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searching, setSearching] = useState<boolean>(false)

  const navigate = useNavigate()

  const { connected: wsConnected } = useWebSocketConnection(token)

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
    messages,
    connected,
    isInRoom,
    room,
    sendMessage,
    sendPlaybackUpdate,
    selectMovieForParty,
    leaveRoom,
    createRoom,
    inviteToRoom,
    roomInvitations,
    respondToInvitation,

    roomMovie,
    roomSource,
    memberStatuses,
    allMembersReady,
    canStartParty,
    myCompatibleSource,
    checkExtensionsForParty,
    startWatchParty,
    clearPartyMovie,
    requestManualSync
  } = useRoom(token, user, extensionManifests)

  const { enhancedFriends, setStatus } = usePresence(friends, token)

  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, removeNotification } =
    useNotifications(token, refreshData)

  const {
    playerSource,
    showDetailsModal,
    details,
    detailsLoading,
    handleMovieClick,
    handleWatchAlone,
    handleWatchParty,
    handleCloseDetails,
    handleAddExtension,
    clearPlayerSource,
    selectedEpisode,
    setSelectedEpisode,
    restorePreviousModal
  } = useDetailsModal(selectMovieForParty)

  useEffect(() => {
    const handleNavigateToDiscover = (): void => {
      navigate('/discover')
      setTimeout(() => {
        restorePreviousModal()
      }, 100)
    }

    if (window.electronAPI) {
      window.electronAPI.on('navigate-to-discover', handleNavigateToDiscover)
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeListener('navigate-to-discover', handleNavigateToDiscover)
      }
    }
  }, [navigate, restorePreviousModal])

  const onFriendAction = (
    action: 'send' | 'accept' | 'reject' | 'remove' | 'invite',
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
    else if (key === 'discover') {
      navigate('/discover')
      setSearchQuery('')
    } else if (key === 'extensions') setExtensionsOpen(true)
  }

  const handleSearch = (query: string): void => {
    setSearchQuery(query)
    setSearching(query.length > 3)
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
        onWatchParty={(details, source, episode) => handleWatchParty(details, source, episode)}
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
                onSearchValue={handleSearch}
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
                onKickMember={() => {}}
                onStartParty={() => {}}
                onLeaveParty={leaveRoom}
              />
              <StartSoloPage
                onExit={() => {
                  clearPlayerSource()
                  navigate('/')
                }}
              />
            </div>
          }
        />
        <Route
          path="/watch-party"
          element={
            <div>
              <Sidebar
                onSelect={handleSidebar}
                onSearchValue={handleSearch}
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
                onKickMember={() => {}}
                onStartParty={() => {}}
                onLeaveParty={leaveRoom}
              />
              <PartyPage
                source={myCompatibleSource}
                details={roomMovie}
                onExit={() => navigate('/')}
                user={user}
                room={room}
                memberStatuses={memberStatuses}
                startWatchParty={startWatchParty}
                leaveRoom={leaveRoom}
                sendMessage={sendMessage}
                messages={messages}
                sendPlaybackUpdate={sendPlaybackUpdate}
                requestManualSync={requestManualSync}
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
                onSearchValue={handleSearch}
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
                room={room}
                isInRoom={isInRoom}
                sendInvite={inviteToRoom}
                roomInvitations={roomInvitations}
                respondToInvitation={respondToInvitation}
                roomMovie={roomMovie}
                roomSource={roomSource}
                memberStatuses={memberStatuses}
                canStartParty={canStartParty}
                onStartParty={startWatchParty}
                onRecheckExtensions={checkExtensionsForParty}
                onClearPartyMovie={clearPartyMovie}
              />
              <DiscoverPage
                token={token}
                onMovieClick={handleMovieClick}
                searchQuery={searchQuery}
              />
            </div>
          }
        />
        <Route
          path="/"
          element={
            <div>
              <Sidebar
                onSelect={handleSidebar}
                onSearchValue={handleSearch}
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
                room={room}
                isInRoom={isInRoom}
                sendInvite={inviteToRoom}
                roomInvitations={roomInvitations}
                respondToInvitation={respondToInvitation}
                roomMovie={roomMovie}
                roomSource={roomSource}
                memberStatuses={memberStatuses}
                canStartParty={canStartParty}
                onStartParty={startWatchParty}
                onRecheckExtensions={checkExtensionsForParty}
                onClearPartyMovie={clearPartyMovie}
              />
              <HomePage token={token} onMovieClick={handleMovieClick} />
            </div>
          }
        />
      </Routes>
    </>
  )
}
