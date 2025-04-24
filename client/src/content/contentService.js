const PROXY = 'http://localhost:8080/api/metadata';

export async function fetchPopular() {
  const res = await fetch(`${PROXY}/movies/popular`);
  return res.ok ? res.json() : [];
}

export async function searchMovies(q) {
  const res = await fetch(`${PROXY}/movies/search?query=${encodeURIComponent(q)}`);
  return res.ok ? res.json() : [];
}

export async function fetchDetails(imdbId, tmdbId) {
  const res = await fetch(`${PROXY}/details/${imdbId}/${tmdbId}`);
  return res.ok ? res.json() : {};
}
