import React, { useState, useEffect } from "react";
import { useMovies } from "./hooks/useMovies";
import { useMovieDetails } from "./hooks/useMovieDetails";
import { useChat } from "./hooks/useChat";
import MovieList from './components/MovieList';
import DetailsModal from './components/DetailsModal';
import ChatPanel from './components/ChatPanel';
import MiniSidebar from './components/MiniSidebar';
import ExtensionsModal from './components/modernApp/ExtensionsModal';
import SearchModal from './components/modernApp/SearchModal';
import AuthScreen from './components/modernApp/AuthScreen';

// BLACK & WHITE MODERN THEME
const BG_GRADIENT = "linear-gradient(135deg, #181818 0%, #000 100%)";
const CARD_BG = "rgba(32,32,32,0.95)";
const OVERLAY_BG = "rgba(18,18,18,0.98)";
const SIDEBAR_BG = "rgba(0,0,0,0.99)";
const BORDER_GREY = "rgba(200,200,200,0.14)";
const WHITE = "#FFF";
const LIGHT_GREY = "#E0E0E0";
const FONT_HEADER = "'Inter', 'Montserrat', 'Poppins', Arial, sans-serif";

export default function ModernApp() {
  const [search, setSearch] = useState("");
  const [roomId, setRoomId] = useState("default-room");
  const [username, setUsername] = useState("User" + Math.floor(Math.random() * 1000));
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [extensionsOpen, setExtensionsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [extensions, setExtensions] = useState([]);
  const [newManifestUrl, setNewManifestUrl] = useState("");
  const [extensionManifests, setExtensionManifests] = useState({}); // { url: manifestObj }
  const [showExtensionDetails, setShowExtensionDetails] = useState(null); // url or null
  const [user, setUser] = useState(() => {
    // Try to get user from localStorage
    const stored = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
  });
  // All hooks must be called unconditionally!
  const { movies, loading: moviesLoading, error: moviesError } = useMovies(search);
  const { details, loading: detailsLoading, error: detailsError, fetchDetails, isCached } = useMovieDetails();
  const { messages, status, send, joinRoom, disconnect } = useChat({ roomId, username });
  useEffect(() => {
    if (selectedMovie && !detailsLoading && details && !showDetailsModal) {
      setShowDetailsModal(true);
    }
  }, [detailsLoading, details, selectedMovie, showDetailsModal]);

  // All hooks are above this line!
  const handleLogin = (userObj) => {
    setUser(userObj);
    localStorage.setItem('currentUser', JSON.stringify(userObj));
  };
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };
  const handleMovieClick = m => {
    setSelectedMovie(m);
    if (isCached(m.imdb_id, m.tmdb_id)) {
      setShowDetailsModal(true);
    } else {
      setShowDetailsModal(false); // wait for loading
      fetchDetails(m.imdb_id, m.tmdb_id);
    }
  };
  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedMovie(null);
  };
  const handleSendChat = () => {
    if (chatInput.trim()) {
      send(chatInput);
      setChatInput("");
    }
  };
  const handleMiniSidebar = (key) => {
    if (key === 'search') setSearchOpen(true);
    if (key === 'extensions') setExtensionsOpen(true);
  };
  
  const handleAddExtension = async () => {
    const url = newManifestUrl.trim();
    if (!url) return;
    if (extensions.includes(url)) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Could not fetch manifest');
      const manifest = await res.json();
      setExtensions(prev => [...prev, url]);
      setExtensionManifests(prev => ({ ...prev, [url]: manifest }));
      setNewManifestUrl("");
    } catch (err) {
      alert('Failed to fetch manifest.json: ' + err.message);
    }
  };
  const handleRemoveExtension = (url) => {
    setExtensions(prev => prev.filter(ext => ext !== url));
  };

  if (!user) {
    console.log('Rendering AuthScreen!');
    return <AuthScreen onLogin={handleLogin} />;
  }

  console.log("Current user state on load:", user);

  return (
    <div style={{ minHeight: '100vh', background: BG_GRADIENT, fontFamily: FONT_HEADER, position: 'relative' }}>
      <MiniSidebar onSelect={handleMiniSidebar} loadingDetails={detailsLoading} onLogout={handleLogout} />
      <div style={{ marginLeft: 64, width: 'calc(100% - 64px)' }}>
        <div style={{ position: 'relative', width: '100%', minHeight: '100vh' }}>
          <div
            style={{
              width: '100%',
              maxWidth: 1440,
              margin: '0 auto',
              boxSizing: 'border-box',
              zIndex: 1,
              position: 'relative',
              padding: '2.5rem clamp(1.5rem, 5vw, 3.5rem)',
            }}
          >
            <MovieList
              movies={movies}
              moviesLoading={moviesLoading}
              moviesError={moviesError}
              onMovieClick={handleMovieClick}
              CARD_BG={CARD_BG}
              BORDER_GREY={BORDER_GREY}
              OVERLAY_BG={OVERLAY_BG}
              WHITE={WHITE}
              FONT_HEADER={FONT_HEADER}
            />
            <DetailsModal
              open={showDetailsModal}
              details={details}
              detailsLoading={detailsLoading}
              onClose={handleCloseDetails}
              CARD_BG={CARD_BG}
              OVERLAY_BG={OVERLAY_BG}
              BORDER_GREY={BORDER_GREY}
              WHITE={WHITE}
              LIGHT_GREY={LIGHT_GREY}
              FONT_HEADER={FONT_HEADER}
            />
            <ChatPanel
              chatOpen={chatOpen}
              messages={messages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              handleSendChat={handleSendChat}
              status={status}
              username={username}
              onDisconnect={disconnect}
            />
          </div>
        </div>
      </div>
      <ExtensionsModal
        open={extensionsOpen}
        onOpenChange={setExtensionsOpen}
        extensions={extensions}
        extensionManifests={extensionManifests}
        newManifestUrl={newManifestUrl}
        setNewManifestUrl={setNewManifestUrl}
        onAdd={handleAddExtension}
        onRemove={handleRemoveExtension}
        showExtensionDetails={showExtensionDetails}
        setShowExtensionDetails={setShowExtensionDetails}
      />
      <SearchModal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        search={search}
        setSearch={setSearch}
      />
      {/* Google Fonts for modern look */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />
    </div>
  );
}
