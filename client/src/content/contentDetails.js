import { fetchDetails } from './contentService.js';

export async function showDetails(imdbId, tmdbId) {
  const d = await fetchDetails(imdbId, tmdbId);
  // Get modal elements
  const detailsModal = document.getElementById('details-modal');
  const detailsModalContent = document.getElementById('details-modal-content');
  const closeDetailsModal = document.getElementById('close-details-modal');

  detailsModalContent.innerHTML = `
  <div class="details-bg" style="background-image:url('${d.poster}')"></div>
  <div class="details-foreground">
    <div class="details-header">
      ${d.avatar ? `<img class="details-avatar" src="${d.avatar}" alt="${d.title}" />` : ""}
      <div class="details-meta">
        <span>${d.runtime ? d.runtime + ' min' : ''}</span>
        <span>${d.release_date || ''}</span>
        <span>
          ${d.rating ? d.rating : 'N/A'}
          <span class="imdb-badge">IMDb</span>
        </span>
      </div>
    </div>
    <p class="details-plot">${d.overview || ''}</p>
    <div class="details-section">
      <div class="details-label">ΕΙΔΗ</div>
      <div class="details-genres">
        ${(d.genres || []).map(g => `<span class="details-chip">${g}</span>`).join('')}
      </div>
    </div>
    <div class="details-section">
      <div class="details-label">ΣΚΗΝΟΘΕΤΕΣ</div>
      <div class="details-directors">
        ${(d.directors || []).map(name => `<span class="details-chip">${name}</span>`).join('')}
      </div>
    </div>
  </div>
`;
  detailsModal.classList.remove('hidden');
  document.body.classList.add('modal-open');

  closeDetailsModal.onclick = () => {
    detailsModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  };
  // Click-outside-to-close (optional, but recommended)
  detailsModal.onclick = (e) => {
    if (e.target === detailsModal) {
      detailsModal.classList.add('hidden');
      document.body.classList.remove('modal-open');
    }
  };
}