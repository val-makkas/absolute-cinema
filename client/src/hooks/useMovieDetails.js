import { useState, useCallback } from 'react';

const API_BASE = 'http://localhost:8080/api/metadata';

const detailsCache = {};

// Helper: Only cache valid details (adjust fields as needed)
const isValidDetails = (data) => {
  return data && typeof data === 'object' && data.title;
};

export function useMovieDetails() {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const clearDetails = useCallback(() => {
    setDetails(null);
    setError(null);
    setLoading(false);
  }, []);

  const isCached = useCallback((imdbId, tmdbId) => {
    const cacheKey = imdbId + ':' + tmdbId;
    const cached = detailsCache[cacheKey];
    return isValidDetails(cached);
  }, []);

  const setDetailsFromCache = useCallback((imdbId, tmdbId) => {
    const cacheKey = imdbId + ':' + tmdbId;
    setDetails(detailsCache[cacheKey]);
  }, []);

  const fetchDetails = useCallback(async (imdbId, tmdbId) => {
    const cacheKey = imdbId + ':' + tmdbId;
    if (isCached(imdbId, tmdbId)) {
      setDetails(detailsCache[cacheKey]);
      setLoading(false);
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
      if (isValidDetails(data)) {
        detailsCache[cacheKey] = data;
        setDetails(data);
      } else {
        throw new Error('Movie details not found');
      }
    } catch (err) {
      setError(err.message);
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, [isCached]);

  return { details, loading, error, fetchDetails, isCached, clearDetails, setDetailsFromCache };
}
