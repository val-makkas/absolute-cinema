import React from "react";
import logo from "../../public/logo.png";

export default function Header({
  search,
  setSearch,
  roomId,
  setRoomId,
  username,
  setUsername,
  joinRoom,
  disconnect,
  CARD_BG,
  BORDER_GREY,
  WHITE,
  FONT_HEADER,
  open,
  setOpen,
}) {
  return (
    <header
      className="flex items-center w-full px-8 py-4 border-b border-neutral-800 bg-black/70"
      style={{ minHeight: 64, zIndex: 10, position: 'relative' }}
    >
      <img
        src={logo}
        alt="Absolute Cinema Logo"
        style={{ width: 54, height: 54, objectFit: 'contain', marginRight: 24 }}
      />
      <div className="flex-1 flex items-center">
        <span
          style={{
            fontFamily: FONT_HEADER,
            fontWeight: 900,
            fontSize: 26,
            letterSpacing: 1.2,
            color: WHITE,
            marginRight: 32,
          }}
        >
          ABSOLUTE CINEMA
        </span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search or paste link..."
          className="rounded-lg px-4 py-2 bg-neutral-900 text-white border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-600"
          style={{ width: 260, marginRight: 24, background: CARD_BG, borderColor: BORDER_GREY, borderWidth: 1, fontFamily: FONT_HEADER, color: WHITE }}
        />
        {/* Room and username controls can go here if needed */}
      </div>
    </header>
  );
}
