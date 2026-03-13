import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  function saveSession(token, userData) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  // Refreshes permissions from DB without requiring re-login
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await api.get('/auth/me');
      const fresh = res.data;
      localStorage.setItem('user', JSON.stringify(fresh));
      setUser(fresh);
    } catch {
      // If 401, the api interceptor will log out automatically
    }
  }, []);

  // Auto-refresh when the tab becomes visible again (e.g. admin changed permissions in another tab)
  useEffect(() => {
    if (!user) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshUser();
    };
    document.addEventListener('visibilitychange', onVisible);
    // Also poll every 30 seconds while the tab is active
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refreshUser();
    }, 30000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, [user, refreshUser]);

  return (
    <AuthContext.Provider value={{ user, saveSession, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
