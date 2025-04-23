import { fetchDetails } from './movieService.js';

const detailsEl = document.getElementById('movie-details');

export async function showDetails(imdbId) {
  const d = await fetchDetails(imdbId);
  detailsEl.innerHTML = `
    <button id="close-btn">×</button>
    <h2>${d.title} (${d.year})</h2>
    <img src="${d.poster}" alt="${d.title}" style="width:100%;border-radius:8px;">
    <p>${d.plot}</p>
    <p><strong>Genres:</strong> ${d.genres.join(', ')}</p>
  `;
  detailsEl.classList.remove('hidden');
  document.getElementById('close-btn').onclick = () => detailsEl.classList.add('hidden');
}