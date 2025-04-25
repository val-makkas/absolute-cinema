import React from 'react';

const Sidebar = ({ SIDEBAR_BG, BORDER_GREY }) => (
  <aside className="w-24 flex flex-col items-center py-8 gap-6 border-r sticky left-0 top-0 z-40 backdrop-blur-2xl" style={{ background: SIDEBAR_BG, borderColor: BORDER_GREY, borderWidth: 1 }}>
    <div className="flex flex-col gap-4 text-[color:#E0E0E0] text-2xl mt-2">
      <button className="hover:text-white"><span role="img" aria-label="home">🏠</span></button>
      <button className="hover:text-white"><span role="img" aria-label="search">🔍</span></button>
      <button className="hover:text-white"><span role="img" aria-label="calendar">🗓️</span></button>
      <button className="hover:text-white"><span role="img" aria-label="settings">⚙️</span></button>
    </div>
  </aside>
);

export default Sidebar;
