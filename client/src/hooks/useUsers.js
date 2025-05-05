import { useState, useCallback, useEffect } from 'react';

const API_BASE = 'http://localhost:8080/api/users';

export function useUser() {
    const [token, setToken] = useState(() => localStorage.getItem('jwt') || '');
    const [username, setUsername] = useState(() => localStorage.getItem('username') || '');
    const [extensions, setExtensions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (token) {
            fetch(`${API_BASE}/extensions`, {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => setExtensions(data.extensions || []))
                .catch(() => setExtensions([]));
        } else {
            setExtensions([]);
        }
    }, [token])

    const register = useCallback(async (username, email, password) => {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        })
        const data = await res.json();
        setLoading(false);
        if (res.ok) return true;
        setError(data.error || 'Failed to register');
        return false;
    }, [])

    const login = useCallback(async (usernameOrEmail, password) => {
        setLoading(true);
        setError(null);
        // Try username first, fallback to email if needed
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameOrEmail, password })
        })
        const data = await res.json();
        setLoading(false);
        if (data.token) {
            setToken(data.token);
            setUsername(data.username);
            localStorage.setItem('jwt', data.token);
            localStorage.setItem('username', data.username);
            localStorage.setItem('extensions', JSON.stringify(data.extensions || []));
            setExtensions(data.extensions || []);
            return true;
        }
        setError(data.error || 'Failed to login');
        return false;
    }, [])

    const logout = useCallback(() => {
        setToken('');
        setUsername('');
        setExtensions([]);
        localStorage.removeItem('jwt');
        localStorage.removeItem('username');
    }, []);

    const updateExtensions = useCallback(async (newExtensions) => {
        if (!token) return false;
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/extensions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ extensions: newExtensions })
        })
        setLoading(false);
        if (res.ok) {
            setExtensions(newExtensions);
            localStorage.setItem('extensions', JSON.stringify(newExtensions));
            return true;
        }
        setError('Failed to update extensions');
        return false;
    }, [token]);

    return {
        token,
        username,
        extensions,
        loading,
        error,
        register,
        login,
        logout,
        updateExtensions
    };
}