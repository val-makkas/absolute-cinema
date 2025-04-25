import { useState, useCallback } from 'react';

const API_BASE = 'http://localhost:8080/api/metadata';

const detailsCache = {};

export function useMovieDetails() {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDetails = useCallback(async (imdbId, tmdbId) => {
    const cacheKey = imdbId + ':' + tmdbId;
    if (detailsCache[cacheKey]) {
      setDetails(detailsCache[cacheKey]);
      return;
    }
    setDetails(null);
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}/details/${imdbId}/${tmdbId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch details');
      const data = await res.json();
      detailsCache[cacheKey] = data;
      setDetails(data);
    } catch (err) {
      setError(err.message);
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { details, loading, error, fetchDetails };
}
