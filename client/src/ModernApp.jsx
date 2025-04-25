import React, { useState } from "react";
import logo from "../public/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useMovies } from "./hooks/useMovies";
import { useMovieDetails } from "./hooks/useMovieDetails";
import { useChat } from "./hooks/useChat";
import MovieList from './components/MovieList';
import DetailsModal from './components/DetailsModal';
import ChatPanel from './components/ChatPanel';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { movies, loading: moviesLoading, error: moviesError } = useMovies(search);
  const { details, loading: detailsLoading, error: detailsError, fetchDetails } = useMovieDetails();
  const { messages, status, send, joinRoom, disconnect } = useChat({ roomId, username });
  const [chatInput, setChatInput] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [logoError, setLogoError] = useState(false);

  const handleMovieClick = async (movie) => {
    setSelectedMovie(movie);
    setDetailsOpen(true);
    await fetchDetails(movie.imdb_id, movie.tmdb_id);
  };
  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedMovie(null);
  };
  const handleSendChat = () => {
    if (chatInput.trim()) {
      send(chatInput);
      setChatInput("");
    }
  };

  return (
    <div className="min-h-screen flex flex-row relative" style={{ background: BG_GRADIENT, fontFamily: FONT_HEADER }}>
      {/* Vignette & Grain overlays */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.34) 60%, transparent 100%)',
          zIndex: 1
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(https://www.transparenttextures.com/patterns/grunge-wall.png)',
          opacity: 0.13,
          zIndex: 2
        }} />
      </div>
      {/* SIDEBAR NAVIGATION */}
{/*       <Sidebar SIDEBAR_BG={SIDEBAR_BG} BORDER_GREY={BORDER_GREY} />
 */}      {/* MAIN COLUMN */}
      <div className="flex-1 flex flex-col min-h-screen relative" style={{ zIndex: 1 }}>
        {/* HEADER */}
        <Header
          search={search}
          setSearch={setSearch}
          roomId={roomId}
          setRoomId={setRoomId}
          username={username}
          setUsername={setUsername}
          joinRoom={joinRoom}
          disconnect={disconnect}
          CARD_BG={CARD_BG}
          BORDER_GREY={BORDER_GREY}
          WHITE={WHITE}
          FONT_HEADER={FONT_HEADER}
        />
        {/* MAIN CONTENT GRID & DETAILS PANEL */}
        <div className="flex flex-1 flex-row overflow-hidden">
          {/* MOVIE GRID */}
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
          {/* DETAILS MODAL OVERLAY */}
          <DetailsModal
            open={detailsOpen}
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
        </div>
        {/* Chat Panel (right sidebar) */}
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
      {/* Google Fonts for modern look */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />
    </div>
  );
}
