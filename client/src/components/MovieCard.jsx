import React from 'react';

const MovieCard = ({ movie, onClick, CARD_BG, BORDER_GREY, OVERLAY_BG, WHITE, FONT_HEADER }) => (
  <div
    className="aspect-[2/3] w-56 rounded-2xl overflow-hidden cursor-pointer relative group shadow-2xl hover:scale-105 hover:shadow-2xl transition-transform duration-200 border"
    style={{ background: CARD_BG, border: `1.5px solid ${BORDER_GREY}` }}
    onClick={() => onClick(movie)}
  >
    <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover group-hover:brightness-90 transition" />
  </div>
);

export default MovieCard;
