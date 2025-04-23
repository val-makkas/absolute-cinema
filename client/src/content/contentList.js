import { fetchPopular, searchMovies } from './movieService.js';

const listEl = document.getElementById('movie-list');
const searchEl = document.getElementById('search-input');

export function initMovieList(onSelect) {
  async function load(q) {
    const movies = q ? await searchMovies(q) : await fetchPopular();
    listEl.innerHTML = '';
    movies.forEach(m => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img src="${m.poster}" alt="${m.title}">
        <h4>${m.title}</h4>
      `;
      card.onclick = () => onSelect(m.imdb_id);
      listEl.append(card);
    });
  }

  searchEl.addEventListener('input', e => load(e.target.value));
  load();
}
