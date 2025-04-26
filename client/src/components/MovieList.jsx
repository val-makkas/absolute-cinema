import React from 'react';
import MovieCard from './MovieCard';

// FINAL: Robust, Netflix-style centered grid using CSS Grid
const CARD_MIN_WIDTH = 200; // px
const CARD_MAX_WIDTH = 260; // px
const CARD_GAP = 32; // px

const MovieList = ({ movies, moviesLoading, moviesError, onMovieClick, CARD_BG, BORDER_GREY, OVERLAY_BG, WHITE, FONT_HEADER, menuOpen, sidebarWidth }) => (
  <main
    className="overflow-y-auto"
    style={{
      width: '100%',
      margin: '0 auto',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}
  >
    {moviesError && <div className="mb-4" style={{ color: WHITE, width: '100%' }}>{moviesError}</div>}
    <div
      className="grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${CARD_MIN_WIDTH}px, 1fr))`,
        gap: `${CARD_GAP}px`,
        justifyItems: 'center',
        alignItems: 'start',
        width: '100%',
        maxWidth: 1200,
        margin: '0 auto',
        transition: 'gap 0.25s cubic-bezier(.4,0,.2,1)',
      }}
    >
      {moviesLoading
        ? Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[2/3] rounded-2xl animate-pulse shadow-2xl"
            style={{ background: CARD_BG, border: `1.5px solid ${BORDER_GREY}`, width: CARD_MIN_WIDTH, height: 1.5 * CARD_MIN_WIDTH }}
          />
        ))
        : movies.map((m, i) => (
          <MovieCard
            key={m.imdb_id || i}
            movie={m}
            onClick={onMovieClick}
            CARD_BG={CARD_BG}
            BORDER_GREY={BORDER_GREY}
            OVERLAY_BG={OVERLAY_BG}
            WHITE={WHITE}
            FONT_HEADER={FONT_HEADER}
          />
        ))}
    </div>
  </main>
);

export default MovieList;
