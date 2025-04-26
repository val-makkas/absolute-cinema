import React from 'react';

const DetailsModal = ({ open, details, detailsLoading, onClose, CARD_BG, OVERLAY_BG, BORDER_GREY, WHITE, LIGHT_GREY, FONT_HEADER }) => {
  if (!open) return null;
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
        backdropFilter: 'blur(12px)', // Blurs what's behind the modal
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
          maxWidth: 550,
          width: '100%',
          color: WHITE,
          border: `2px solid ${BORDER_GREY}`,
          zIndex: 1002,
          transform: 'scale(1)',
          opacity: 1,
          overflow: 'visible',
          fontFamily: FONT_HEADER,
          boxSizing: 'border-box',
          background: details?.poster ? 'transparent' : 'rgba(0, 0, 0, 0.70)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Blurred poster as card background */}
        {details?.poster && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              background: `url(${details.poster}) center/cover no-repeat`,
              filter: 'blur(18px)',
              borderRadius: 24,
              opacity: 1,
            }}
          />
        )}
        {/* Dark overlay for readability */}
        {details?.poster && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              background: 'rgba(20,20,30,0.50)',
              borderRadius: 24,
            }}
          />
        )}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <button
            style={{
              position: 'absolute',
              top: '1.2rem',
              right: '1.5rem',
              background: 'none',
              border: 'none',
              color: WHITE,
              fontSize: '2rem',
              cursor: 'pointer',
              zIndex: 3,
              textShadow: '0 2px 8px #000a',
            }}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
          {/* Avatar from API at the top of the card, 2.5x bigger */}
          {details?.avatar && (
            <img src={details.avatar} alt={details.title} style={{ width: 240, height: 240, objectFit: 'contain', display: 'block', margin: '0 auto 1.2rem auto' }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 17, marginBottom: 12, color: LIGHT_GREY, fontWeight: 700, opacity: 0.88 }}>
              {details?.release_date}
              {details?.rating && <> &bull; ⭐ {details.rating}</>}
            </div>
            <div style={{ marginBottom: 18, fontSize: 18, color: LIGHT_GREY, opacity: 0.97, fontWeight: 400, textShadow: '0 2px 8px #0007' }}>
              {details?.overview}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
              {details?.actors && <span style={{ fontSize: 14, padding: '5px 14px', borderRadius: 14, fontWeight: 700, background: CARD_BG, color: WHITE, boxShadow: '0 1px 6px #0003' }}>{`Actors: ${details.actors}`}</span>}
              {details?.director && <span style={{ fontSize: 14, padding: '5px 14px', borderRadius: 14, fontWeight: 700, background: CARD_BG, color: WHITE, boxShadow: '0 1px 6px #0003' }}>{`Director: ${details.director}`}</span>}
              {details?.runtime && <span style={{ fontSize: 14, padding: '5px 14px', borderRadius: 14, fontWeight: 700, background: CARD_BG, color: WHITE, boxShadow: '0 1px 6px #0003' }}>{`Runtime: ${details.runtime}`}</span>}
            </div>
          </div>
          {/* Beautiful buttons */}
          <div style={{ display: 'flex', gap: 18, marginTop: 36, marginBottom: 8, justifyContent: 'center' }}>
            <button
              style={{
                flex: 1,
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
              onClick={() => alert('Watch Alone clicked!')}
            >
              <span role="img" aria-label="Play">▶️</span> Watch Alone
            </button>
            <button
              style={{
                flex: 1,
                background: 'linear-gradient(90deg, #43cea2 0%, #185a9d 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                fontWeight: 900,
                fontSize: 18,
                padding: '13px 0',
                cursor: 'pointer',
                boxShadow: '0 2px 12px #43cea244',
                transition: 'transform 0.1s',
                fontFamily: FONT_HEADER,
                letterSpacing: 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                zIndex: 2,
              }}
              onClick={() => alert('Create Party clicked!')}
            >
              <span role="img" aria-label="Party">🎉</span> Create Party
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailsModal;
