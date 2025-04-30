import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SoloSources from './sources/SoloSources';

const DetailsModal = ({ open, details, extensionManifests, detailsLoading, onClose, CARD_BG, OVERLAY_BG, BORDER_GREY, WHITE, LIGHT_GREY, FONT_HEADER }) => {
  const navigate = useNavigate();
  const [modalMode, setModalMode] = useState('details');

  useEffect(() => {
    if (open) setModalMode('details');
  }, [open]);

  const handleWatchAlone = () => {
    if (details?.id) {
      navigate(`/watch-alone/${details.id}`, { state: { details } });
    } else {
      alert('No IMDb ID found for this title.');
    }
  };

  const handleCreateParty = () => {
    if (details?.id) {
      navigate(`/watch-party/${details.id}`, { state: { details } });
    } else {
      alert('No IMDb ID found for this title.');
    }
  };

  if (!open) return null;
  if (detailsLoading && !details) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          width: '100vw',
          height: '100vh',
          overflow: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.80)',
          backdropFilter: 'blur(12px)',
          transition: 'opacity 0.25s cubic-bezier(.4,0,.2,1)',
        }}
        onClick={onClose}
      >
        <div style={{ background: 'rgba(24,24,27,0.93)', padding: 40, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="56" height="56" viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="20" fill="none" stroke="#ffe082" strokeWidth="5" strokeDasharray="31.4 31.4" strokeLinecap="round" style={{ transformOrigin: 'center', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </svg>
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        width: '100vw',
        height: '100vh',
        overflow: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.80)',
        backdropFilter: 'blur(12px)',
        transition: 'opacity 0.25s cubic-bezier(.4,0,.2,1)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: 24,
          boxShadow: '0 8px 32px #000c, 0 0 16px #0006',
          padding: '3.5rem 3rem',
          minWidth: 1080, 
          maxWidth: 1080,
          width: 1080,
          minHeight: 600,
          color: WHITE,
          border: `2px solid ${BORDER_GREY}`,
          zIndex: 1002,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: 0,
          background: 'transparent',
          fontFamily: FONT_HEADER,
          boxSizing: 'border-box',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Blurred poster as modal inner background */}
        {details?.poster && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              background: `url(${details.poster}) center/cover no-repeat`,
              filter: 'blur(26px) brightness(1.08) saturate(1.25)',
              borderRadius: 24,
              opacity: 0.68,
              pointerEvents: 'none',
              transition: 'opacity 200ms',
            }}
          />
        )}
        {/* Overlay for readability */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            borderRadius: 24,
            background: 'linear-gradient(180deg, rgba(24,24,27,0.55) 60%, rgba(24,24,27,0.75) 100%)',
            pointerEvents: 'none',
          }}
        />
        {/* Main content and sidebar */}
        <div style={{ flex: '0 0 740px', maxWidth: 740, minWidth: 740, position: 'relative', zIndex: 2, overflow: 'visible' }}>
          {modalMode === 'details' && (
            <>
              {details?.avatar && (
                <img src={details.avatar} alt={details.title} style={{ width: 240, height: 240, objectFit: 'contain', display: 'block', margin: '0 auto 1.2rem auto', borderRadius: 18 }} />
              )}
              {/* Poster image removed to avoid double display; only background is blurred poster */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 17, marginBottom: 12, color: LIGHT_GREY, fontWeight: 700, opacity: 0.88 }}>
                  {details?.release_date}
                  {details?.rating && <> &bull; ⭐ {details.rating}</>}
                </div>
                <div style={{ marginBottom: 18, fontSize: 18, color: LIGHT_GREY, opacity: 0.97, fontWeight: 400, textShadow: '0 2px 8px #0007', maxWidth: '100%', wordWrap: 'break-word', lineHeight: 1.45 }}>
                  {details?.overview}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                  {details?.actors && <span style={{ fontSize: 14, padding: '5px 14px', borderRadius: 14, fontWeight: 700, background: CARD_BG, color: WHITE, boxShadow: '0 1px 6px #0003' }}>{`Actors: ${details.actors}`}</span>}
                  {details?.director && <span style={{ fontSize: 14, padding: '5px 14px', borderRadius: 14, fontWeight: 700, background: CARD_BG, color: WHITE, boxShadow: '0 1px 6px #0003' }}>{`Director: ${details.director}`}</span>}
                  {details?.runtime && <span style={{ fontSize: 14, padding: '5px 14px', borderRadius: 14, fontWeight: 700, background: CARD_BG, color: WHITE, boxShadow: '0 1px 6px #0003' }}>{`Runtime: ${details.runtime}`}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 30, marginBottom: 8 }}>
                <button
                  style={{
                    width: '100%',
                    background: 'linear-gradient(90deg, #ff7e5f 0%, #feb47b 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 14,
                    fontWeight: 900,
                    fontSize: 18,
                    padding: '13px 0',
                    cursor: 'pointer',
                    boxShadow: '0 2px 12px #ff7e5f44',
                    transition: 'transform 0.1s',
                    fontFamily: FONT_HEADER,
                    letterSpacing: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    zIndex: 2,
                  }}
                  onClick={handleWatchAlone}
                >
                  <span role="img" aria-label="Play">▶️</span> Watch Alone
                </button>
                <button
                  style={{
                    width: '100%',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 14,
                    fontWeight: 900,
                    fontSize: 18,
                    padding: '13px 0',
                    cursor: 'pointer',
                    boxShadow: '0 2px 12px #185a9d44',
                    transition: 'transform 0.1s',
                    fontFamily: FONT_HEADER,
                    letterSpacing: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    zIndex: 2,
                  }}
                  onClick={handleCreateParty}
                >
                  <span role="img" aria-label="Party">🎉</span> Create Party
                </button>
              </div>
            </>
          )}
        </div>
        {/* Sidebar for SoloSources */}
        <div style={{
          flex: '0 0 340px',
          maxWidth: 340,
          minWidth: 340,
          height: '100%',
          position: 'relative',
          zIndex: 2,
          background: 'rgba(255,255,255,0.13)', 
          borderRadius: '0 22px 22px 0',
          boxShadow: 'none',
          overflowY: 'auto',
          padding: '2.2rem 1.1rem 2.2rem 1.1rem',
          borderLeft: '2px solid #23272f',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '600px',
          backdropFilter: 'blur(8px)',
          marginRight: 0,
        }}>
          <SoloSources extensionManifests={extensionManifests} details={details} sidebarMode={true} />
        </div>
        {/* End sidebar */}
      </div>
    </div>
  );
};

export default DetailsModal;
