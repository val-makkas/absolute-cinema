import { fetchPopular, searchMovies } from './contentService.js';
import { showDetails } from './contentDetails.js';

const listEl = document.getElementById('movie-list');
const searchEl = document.getElementById('search-input');

let debounceTimer;

export function initMovieList() {
  // Load & render either popular or search results
  async function load(query = '') {
    try {
      const movies = query.length >= 3
        ? await searchMovies(query)
        : await fetchPopular();

      listEl.innerHTML = '';
      movies.forEach(m => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `
  <img src="${m.poster}" alt="${m.title}">
  <div class="card-rating">
    <span class="card-rating-value">${m.rating ?? ''}</span>
    <span class="imdb-badge">IMDb</span>
  </div>
`;
        card.onclick = () => showDetails(m.imdb_id, m.tmdb_id);
        listEl.append(card);
      });
    } catch (err) {
      console.error('Failed to load movies', err);
      listEl.innerHTML = '<p style="color: #ff5555; padding: 1rem;">Error loading movies</p>';
    }
  }

  // Uncomment for live search
  // searchEl.addEventListener('input', e => {
  //   clearTimeout(debounceTimer);
  //   const q = e.target.value.trim();
  //   debounceTimer = setTimeout(() => load(q), 300);
  // });

  // Initial load (no query = popular)
  load();
}