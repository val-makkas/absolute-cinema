import React from "react";
import logo from "../../public/logo.png";
import { ExtensionIcon } from "@/components/icons/ExtensionIcon";
import { SearchIcon } from "@/components/icons/SearchIcon";
import { LoadingSpinner } from "@/components/icons/LoadingSpinner";

const ICON_SIZE = 28;
const sidebarIcons = [
  {
    key: 'search',
    label: 'Search',
    icon: <SearchIcon size={ICON_SIZE} color="#bcbcbc" />,
  },
  {
    key: 'extensions',
    label: 'Extensions',
    icon: <ExtensionIcon size={ICON_SIZE} color="#bcbcbc" />, // Neutral grey
  },
  // Add more icons here as needed
];

export default function MiniSidebar({ onSelect, loadingDetails }) {
  return (
    <nav
      style={{
        width: 64,
        height: '100vh',
        background: 'rgba(0,0,0,0.7)', // Header color: bg-black/70
        borderRight: '1px solid #23272f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.2rem 0',
        gap: 10,
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 100,
        boxShadow: '2px 0 10px #18181b22',
      }}
    >
      <img
        src={logo}
        alt="Absolute Cinema Logo"
        style={{ width: 44, height: 44, objectFit: 'contain', marginBottom: 20, borderRadius: 12 }}
      />
      {sidebarIcons.map(opt => (
        <button
          key={opt.key}
          aria-label={opt.label}
          onClick={() => onSelect && onSelect(opt.key)}
          style={{
            background: 'none',
            border: 'none',
            margin: '1.2rem 0',
            cursor: 'pointer',
            padding: 0,
            borderRadius: 8,
            transition: 'background 0.15s',
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseOver={e => e.currentTarget.style.background = '#23272f'}
          onMouseOut={e => e.currentTarget.style.background = 'none'}
        >
          {opt.icon}
        </button>
      ))}
      {/* Loading spinner at the bottom left */}
      <div style={{ flex: 1 }} />
      {loadingDetails && (
        <div style={{ marginBottom: 18, alignSelf: 'flex-start', marginLeft: 15 }}>
          <LoadingSpinner size={28} color="#bcbcbc" />
        </div>
      )}
    </nav>
  );
}
