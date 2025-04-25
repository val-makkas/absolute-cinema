import React from 'react';
import logo from '../../public/logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Header = ({ search, setSearch, roomId, setRoomId, username, setUsername, joinRoom, disconnect, CARD_BG, BORDER_GREY, WHITE, FONT_HEADER }) => (
  <header className="backdrop-blur-xl border-b px-10 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xl" style={{ background: 'rgba(12,12,12,1)', borderColor: BORDER_GREY, borderWidth: 1 }}>
    <div className="flex items-center gap-6 w-full justify-between">
      {/* Left: Search */}
      <Input className="w-80 border-none rounded-xl focus:ring-0 focus:outline-none shadow-sm text-white placeholder:text-gray-400" style={{ background: CARD_BG, borderColor: BORDER_GREY, borderWidth: 1, fontFamily: FONT_HEADER, color: WHITE }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search or paste link..." />
      {/* Center: Logo */}
      <img src={logo} alt="Absolute Cinema Logo" style={{ height: 72, width: 72, objectFit: 'contain', display: 'block' }} />
      {/* Right: Controls */}
      <div className="flex gap-3 items-center">
        <Input className="w-28 border-none rounded-xl focus:ring-2 shadow-sm" style={{ background: CARD_BG, color: WHITE, borderColor: BORDER_GREY, borderWidth: 1 }} value={roomId} onChange={e => setRoomId(e.target.value)} placeholder="Room" />
        <Input className="w-28 border-none rounded-xl focus:ring-2 shadow-sm" style={{ background: CARD_BG, color: WHITE, borderColor: BORDER_GREY, borderWidth: 1 }} value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
        <Button className="font-black rounded-xl shadow-lg px-5 text-lg" style={{ background: WHITE, color: '#181818', boxShadow: `0 2px 12px 0 #2228` }} onClick={joinRoom}>Join</Button>
        <Button variant="outline" className="rounded-xl px-5 border text-lg" style={{ borderColor: WHITE, color: WHITE, background: 'rgba(255,255,255,0.08)' }} onClick={disconnect}>Disconnect</Button>
      </div>
    </div>
  </header>
);

export default Header;
