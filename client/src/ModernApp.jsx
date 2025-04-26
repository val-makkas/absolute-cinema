import React, { useState, useEffect } from "react";
import logo from "../public/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMovies } from "./hooks/useMovies";
import { useMovieDetails } from "./hooks/useMovieDetails";
import { useChat } from "./hooks/useChat";
import MovieList from './components/MovieList';
import DetailsModal from './components/DetailsModal';
import ChatPanel from './components/ChatPanel';
import MiniSidebar from './components/MiniSidebar';

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

  const { movies, loading: moviesLoading, error: moviesError } = useMovies(search);
  const { details, loading: detailsLoading, error: detailsError, fetchDetails, isCached } = useMovieDetails();
  const { messages, status, send, joinRoom, disconnect } = useChat({ roomId, username });

  const handleMovieClick = m => {
    setSelectedMovie(m);
    if (isCached(m.imdb_id, m.tmdb_id)) {
      setShowDetailsModal(true); // open instantly if cached
      fetchDetails(m.imdb_id, m.tmdb_id); // will just set details from cache
    } else {
      setShowDetailsModal(false); // wait for loading
      fetchDetails(m.imdb_id, m.tmdb_id);
    }
  };

  useEffect(() => {
    if (selectedMovie && !detailsLoading && details && !showDetailsModal) {
      setShowDetailsModal(true);
    }
  }, [detailsLoading, details, selectedMovie, showDetailsModal]);

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
    if (!url || extensions.includes(url)) return;
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

  return (
    <div style={{ minHeight: '100vh', background: BG_GRADIENT, fontFamily: FONT_HEADER, position: 'relative' }}>
      <MiniSidebar onSelect={handleMiniSidebar} loadingDetails={detailsLoading} />
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
          </div>
        </div>
      </div>
      {/* Extensions Modal */}
      <Dialog open={extensionsOpen} onOpenChange={setExtensionsOpen}>
        <DialogContent style={{
          background: 'rgba(0, 0, 0, 0.80)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 40, 0.37)',
          borderRadius: 22,
          border: '1.5px solid #23272f',
          padding: '2.5rem 2rem',
          minWidth: 420,
          maxWidth: 520,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          color: '#e5e5e5',
        }}>
          <DialogHeader style={{ width: '100%' }}>
            <DialogTitle style={{ color: '#e5e5e5', fontWeight: 900, fontSize: 28, letterSpacing: 1 }}>Extensions</DialogTitle>
          </DialogHeader>
          <div style={{ width: '100%' }}>
            <div style={{ marginBottom: 16 }}>
              <Input
                value={newManifestUrl}
                onChange={e => setNewManifestUrl(e.target.value)}
                placeholder="Enter a URL that points to a manifest.json file..."
                style={{ width: '100%', marginBottom: 8 }}
              />
              <Button onClick={handleAddExtension} style={{ width: '100%' }}>
                Add Extension
              </Button>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Added Extensions:</div>
              {extensions.length === 0 && <div style={{ color: '#bbb' }}>No extensions added yet.</div>}
              {extensions.map(url => {
                const manifest = extensionManifests[url];
                const isDetailsOpen = showExtensionDetails === url;
                return (
                  <div key={url} style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    marginBottom: 18,
                    background: manifest && manifest.background ? `linear-gradient(90deg, #18181b 70%, rgba(32,32,40,0.92)), url(${manifest.background}) center/cover no-repeat` : 'linear-gradient(90deg, #18181b 60%, #222 100%)',
                    borderRadius: 14,
                    padding: '16px 20px',
                    boxShadow: '0 4px 18px #18181b44',
                    border: '1.5px solid #23272f',
                    minHeight: 60,
                    transition: 'background 0.2s',
                    gap: 20,
                    position: 'relative',
                  }}>
                    {/* Logo */}
                    {manifest && manifest.logo && (
                      <img src={manifest.logo} alt={manifest.name + ' logo'} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'contain', background: '#23272f', boxShadow: '0 2px 8px #0008', marginRight: 18 }} />
                    )}
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontWeight: 800, color: '#ffe082', fontSize: 19, marginBottom: 1, letterSpacing: 0.1, textShadow: manifest && manifest.background ? '0 1px 8px #000b' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {manifest && manifest.name ? manifest.name : url}
                      </span>
                      <span style={{ color: '#e5e5e5', fontSize: 14, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 350, textShadow: manifest && manifest.background ? '0 1px 8px #000b' : 'none', lineHeight: 1.4 }}>
                        {manifest && manifest.description ? manifest.description.slice(0, 100) + (manifest.description.length > 100 ? '...' : '') : ''}
                      </span>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <Button variant="destructive" size="sm" onClick={() => handleRemoveExtension(url)} style={{ fontSize: 13, padding: '5px 14px', borderRadius: 7, fontWeight: 600, boxShadow: '0 1px 6px #0005' }}>
                          Remove
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          style={{ fontSize: 13, padding: '5px 14px', borderRadius: 7, fontWeight: 600, background: 'rgba(32,32,40,0.85)', color: '#ffe082', border: 'none', boxShadow: '0 1px 6px #0008', fontStyle: 'italic', letterSpacing: 0.2 }}
                          onClick={() => setShowExtensionDetails(isDetailsOpen ? null : url)}
                        >
                          {isDetailsOpen ? 'Hide Details' : 'Show Details'}
                        </Button>
                      </div>
                      {isDetailsOpen && manifest && (
                        <div style={{
                          marginTop: 12,
                          background: 'rgba(24,24,27,0.93)',
                          color: '#ffe082',
                          borderRadius: 8,
                          padding: '14px 16px',
                          fontSize: 14.5,
                          fontStyle: 'italic',
                          fontWeight: 400,
                          boxShadow: '0 2px 8px #0008',
                          maxWidth: 480,
                          lineHeight: 1.7,
                          textShadow: '0 1px 8px #000b',
                        }}>
                          {manifest.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div style={{
                background: 'none',
                color: '#ffb300',
                borderRadius: 8,
                padding: '0.5rem 0',
                marginTop: 18,
                width: '100%',
                fontWeight: 400,
                fontSize: 13,
                fontStyle: 'italic',
                opacity: 0.85,
                textAlign: 'center',
                letterSpacing: 0.1,
                border: 'none',
                lineHeight: 1.6,
              }}>
                <span style={{fontSize: 16, marginRight: 5}}>⚠️</span>
                <span>
                  This app does not host or distribute any media content.<br/>
                  Users are responsible for any third-party add-ons they choose to use.<br/>
                  Use at your own risk and responsibility.
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Search Modal */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent style={{
          background: 'rgba(0, 0, 0, 0.80)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 40, 0.37)',
          borderRadius: 22,
          border: '1.5px solid #23272f',
          padding: '2.5rem 2rem',
          minWidth: 420,
          maxWidth: 520,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          color: '#e5e5e5',
        }}>
          <DialogHeader style={{ width: '100%' }}>
            <DialogTitle style={{ color: '#e5e5e5', fontWeight: 900, fontSize: 28, letterSpacing: 1 }}>Search</DialogTitle>
          </DialogHeader>
          <div style={{ minHeight: 100, color: '#e5e5e5', fontFamily: FONT_HEADER, textAlign: 'center', fontWeight: 500, fontSize: 18, width: '100%' }}>
            Here you can search for movies.
          </div>
        </DialogContent>
      </Dialog>
      {/* Google Fonts for modern look */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />
    </div>
  );
}
