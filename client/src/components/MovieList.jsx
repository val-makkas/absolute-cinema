import React from 'react';
import MovieCard from './MovieCard';

const MovieList = ({ movies, moviesLoading, moviesError, onMovieClick, CARD_BG, BORDER_GREY, OVERLAY_BG, WHITE, FONT_HEADER }) => (
  <main className="flex-1 p-10 overflow-y-auto">
    {moviesError && <div className="mb-4" style={{ color: WHITE }}>{moviesError}</div>}
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
      {moviesLoading ? (
        Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] rounded-2xl animate-pulse shadow-2xl" style={{ background: CARD_BG, border: `1.5px solid ${BORDER_GREY}` }} />
        ))
      ) : (
        movies.map((m, i) => (
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
        ))
      )}
    </div>
  </main>
);

export default MovieList;
