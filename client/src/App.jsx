import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useMovies } from "./hooks/useMovies";
import { useMovieDetails } from "./hooks/useMovieDetails";
import { useChat } from "./hooks/useChat";
import { useUser } from './hooks/useUsers';
import MovieList from './components/MovieList';
import DetailsModal from './components/DetailsModal';
import ChatPanel from './components/ChatPanel';
import MiniSidebar from './components/MiniSidebar';
import ExtensionsModal from './components/app/ExtensionsModal';
import SearchModal from './components/app/SearchModal';
import AuthScreen from './components/app/AuthScreen';
import VideoPlayer from './components/VideoPlayer';
import loadingBg from "../public/loading.png";


const BG_GRADIENT = "linear-gradient(135deg, #181818 0%, #000 100%)";
const CARD_BG = "rgba(32,32,32,0.95)";
const OVERLAY_BG = "rgba(18,18,18,0.98)";
const SIDEBAR_BG = "rgba(0,0,0,0.99)";
const BORDER_GREY = "rgba(200,200,200,0.14)";
const WHITE = "#FFF";
const LIGHT_GREY = "#E0E0E0";
const FONT_HEADER = "'Inter', 'Montserrat', 'Poppins', Arial, sans-serif";

export default function App() {
  const [search, setSearch] = useState("");
  const [roomId, setRoomId] = useState("default-room");
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [extensionsOpen, setExtensionsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [newManifestUrl, setNewManifestUrl] = useState("");
  const [showExtensionDetails, setShowExtensionDetails] = useState(null); // url or null
  const [playerSource, setPlayerSource] = useState(null);

  // Extension manifests state
  const [extensionManifests, setExtensionManifests] = useState({});

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
    updateExtensions,
  } = useUser();

  // Fetch manifests when extensions change
  useEffect(() => {
    async function fetchManifests() {
      const manifests = {};
      await Promise.all(
        extensions.map(async (url) => {
          try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch manifest');
            const manifest = await res.json();
            manifests[url] = manifest;
          } catch (e) {
            manifests[url] = undefined;
          }
        })
      );
      setExtensionManifests(manifests);
    }
    if (extensions && extensions.length > 0) fetchManifests();
    else setExtensionManifests({});
  }, [extensions]);

  const { movies, loading: moviesLoading, error: moviesError } = useMovies(search);
  const { details, loading: detailsLoading, error: detailsError, fetchDetails, isCached, setDetailsFromCache } = useMovieDetails();
  const { messages, status, send, joinRoom, disconnect } = useChat({ roomId, username });
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedMovie && !detailsLoading && details && !showDetailsModal) {
      setShowDetailsModal(true);
    }
  }, [detailsLoading, details, selectedMovie, showDetailsModal]);

  const handleWatchAlone = (details, selectedSource) => {
    if (details?.id && selectedSource?.infoHash) {
      setPlayerSource({
        infoHash: selectedSource.infoHash || selectedSource.infohash,
        fileIdx: selectedSource.fileIdx,
        name: details.title,
        poster: details.poster
      });
      setShowDetailsModal(false); // Close modal
      navigate(`/watch-alone/${details.id}`); // Navigate to player
    } else {
      alert('No valid streaming source selected.');
    }
  };

  function LoginSuccessHandler() {
    const navigate = useNavigate();
    const { login } = useUser(); // get login from hook
    const [message, setMessage] = useState('Waiting for authentication...');

    useEffect(() => {
      let handled = false;
      if (window.electronAPI && window.electronAPI.onOAuthToken) {
        window.electronAPI.onOAuthToken(async (token) => {
          if (handled) return;
          handled = true;
          try {
            localStorage.setItem('jwt', token);
            await login(token);
            setMessage('Login successful! Redirecting...');
            setTimeout(() => navigate('/'), 1000);
          } catch (e) {
            setMessage('Login failed. Please try again.');
          }
        });
      } else {
        setMessage('Please open the app to complete login.');
      }
    }, [login, navigate]);

    return (
      <div style={{ color: '#fff', textAlign: 'center', marginTop: '20vh' }}>
        <h2>Google Login</h2>
        <p>{message}</p>
      </div>
    );
  }

  // Render AuthScreen if not logged in
  if (!token) {
    return (
      <Routes>
        <Route path="/login-success" element={<LoginSuccessHandler />} />
        <Route path="/auth" element={<AuthScreen onLogin={login} onRegister={register} error={userError} loading={userLoading} />} />
        <Route path="*" element={<AuthScreen onLogin={login} onRegister={register} error={userError} loading={userLoading} />} />
      </Routes>
    );
  }

  const handleMovieClick = m => {
    setSelectedMovie(m);
    if (isCached(m.imdb_id, m.tmdb_id)) {
      setDetailsFromCache(m.imdb_id, m.tmdb_id);
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

  return (
    <Routes>
      <Route path="/stream" element={
        <div>
          <MiniSidebar onSelect={handleMiniSidebar} loadingDetails={detailsLoading} onLogout={logout} />
          <div>
            <StreamWithLoadingBG />
          </div>
        </div>
      } />
      <Route path="/" element={
        <div style={{ minHeight: '100vh', background: BG_GRADIENT, fontFamily: FONT_HEADER, position: 'relative' }}>
          <MiniSidebar onSelect={handleMiniSidebar} loadingDetails={detailsLoading} onLogout={logout} />
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
                  extensionManifests={extensionManifests}
                  detailsLoading={detailsLoading}
                  onClose={handleCloseDetails}
                  CARD_BG={CARD_BG}
                  OVERLAY_BG={OVERLAY_BG}
                  BORDER_GREY={BORDER_GREY}
                  WHITE={WHITE}
                  LIGHT_GREY={LIGHT_GREY}
                  FONT_HEADER={FONT_HEADER}
                  onWatchAlone={src => handleWatchAlone(details, src)}
                />
                {/* <ChatPanel
                  chatOpen={chatOpen}
                  messages={messages}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  handleSendChat={handleSendChat}
                  status={status}
                  username={username}
                  onDisconnect={disconnect}
                /> */}
                <ExtensionsModal
                  open={extensionsOpen}
                  onOpenChange={setExtensionsOpen}
                  extensions={extensions}
                  extensionManifests={extensionManifests}
                  newManifestUrl={newManifestUrl}
                  setNewManifestUrl={setNewManifestUrl}
                  onAdd={async () => {
                    if (!newManifestUrl) return;
                    if (!/^https?:\/\//.test(newManifestUrl)) return alert('Please enter a valid URL');
                    if (extensions.includes(newManifestUrl)) return alert('Extension already added');
                    await updateExtensions([...extensions, newManifestUrl]);
                    setNewManifestUrl('');
                  }}
                  onRemove={async url => {
                    await updateExtensions(extensions.filter(u => u !== url));
                  }}
                  showExtensionDetails={showExtensionDetails}
                  setShowExtensionDetails={setShowExtensionDetails}
                />
                <SearchModal open={searchOpen} onOpenChange={setSearchOpen} setSearch={setSearch} />
              </div>
            </div>
          </div>
        </div>
      } />
    </Routes>
  );
}

function StreamWithLoadingBG() {
  const [showLoading, setShowLoading] = React.useState(true);
  const navigate = useNavigate();
  React.useEffect(() => {
    const timer = setTimeout(() => setShowLoading(false), 15000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div style={{ minHeight: '100vh', background: `url(${loadingBg}) 100% center / cover no-repeat, ${BG_GRADIENT}`, fontFamily: FONT_HEADER, position: 'relative', display: 'flex' }}>
      <div style={{ flexGrow: 1, marginLeft: 64, width: 'calc(100% - 64px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flexGrow: 1, display: 'flex', position: 'relative' }}>
          {showLoading && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(18,18,20,0.82)',
              zIndex: 9999
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <svg width="80" height="80" viewBox="0 0 50 50" style={{ animation: 'spin 1s linear infinite', marginBottom: 24, marginTop: -48 }}>
                  <circle cx="25" cy="25" r="20" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeDasharray="31.4 31.4" />
                  <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                </svg>
                <button
                  onClick={() => navigate("/")}
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
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, calc(-50% + 48px))',
              width: '100%'
            }}>
              <button
                onClick={() => navigate("/")}
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
  );
}