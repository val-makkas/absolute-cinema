import React from 'react';

const DetailsModal = ({ open, details, detailsLoading, onClose, CARD_BG, OVERLAY_BG, BORDER_GREY, WHITE, LIGHT_GREY, FONT_HEADER }) => {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.93)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.25s cubic-bezier(.4,0,.2,1)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: OVERLAY_BG,
          borderRadius: 16,
          boxShadow: '0 8px 32px #000c, 0 0 16px #0006',
          padding: '3.5rem 3rem',
          maxWidth: 550,
          width: '100%',
          color: WHITE,
          position: 'relative',
          border: `2px solid ${BORDER_GREY}`,
          zIndex: 1001,
          transform: 'scale(1)',
          opacity: 1,
          overflow: 'visible',
          fontFamily: FONT_HEADER,
        }}
        onClick={e => e.stopPropagation()}
      >
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
            fontFamily: FONT_HEADER,
          }}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        {details?.poster && (
          <img src={details.poster} alt={details.title} style={{ width: 176, borderRadius: 16, boxShadow: '0 2px 12px #0008', display: 'block', margin: '0 auto 1.5rem auto' }} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8, color: WHITE, textShadow: '0 2px 12px #000', lineHeight: 1 }}>
            {detailsLoading ? 'Loading...' : details?.title}
          </div>
          <div style={{ fontSize: 16, marginBottom: 12, color: LIGHT_GREY }}>
            {details?.release_date}
            {details?.rating && <> &bull; ⭐ {details.rating}</>}
          </div>
          <div style={{ marginBottom: 18, fontSize: 17, color: LIGHT_GREY }}>
            {details?.overview}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
            {details?.actors && <span style={{ fontSize: 13, padding: '4px 12px', borderRadius: 14, fontWeight: 700, background: CARD_BG, color: WHITE }}>{`Actors: ${details.actors}`}</span>}
            {details?.director && <span style={{ fontSize: 13, padding: '4px 12px', borderRadius: 14, fontWeight: 700, background: CARD_BG, color: WHITE }}>{`Director: ${details.director}`}</span>}
            {details?.runtime && <span style={{ fontSize: 13, padding: '4px 12px', borderRadius: 14, fontWeight: 700, background: CARD_BG, color: WHITE }}>{`Runtime: ${details.runtime}`}</span>}
          </div>
        </div>
        <button
          style={{
            marginTop: 32,
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            color: WHITE,
            border: `2px solid ${WHITE}`,
            borderRadius: 12,
            fontWeight: 900,
            fontSize: 18,
            padding: '12px 0',
            cursor: 'pointer',
            fontFamily: FONT_HEADER,
          }}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default DetailsModal;
