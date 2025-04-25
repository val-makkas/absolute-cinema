import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:8080/api/metadata';

export function useMovies(searchQuery) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMovies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = searchQuery && searchQuery.length >= 3
        ? `${API_BASE}/movies/search?query=${encodeURIComponent(searchQuery)}`
        : `${API_BASE}/movies/popular`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch movies');
      const data = await res.json();
      setMovies(data);
    } catch (err) {
      setError(err.message);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  return { movies, loading, error, refetch: fetchMovies };
}
