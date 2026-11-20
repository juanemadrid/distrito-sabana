import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, getStoredToken, setStoredToken } from '../lib/api';
import type { AuthUser, Church } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  churches: Church[];
  selectedChurchId: string; // 'all' or numeric string
  setSelectedChurchId: (id: string) => void;
  refreshChurches: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isDistrictAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [churches, setChurches] = useState<Church[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<string>('all');

  const refreshChurches = async () => {
    try {
      const data = await api.get<{ churches: Church[] }>('/api/churches');
      setChurches(data.churches);
    } catch {
      // ignore if not logged in
    }
  };

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<{ user: AuthUser }>('/api/auth/me')
      .then((res) => {
        setUser(res.user);
        setSelectedChurchId(res.user.role === 'ADMIN_DISTRITO' ? 'all' : String(res.user.church_id || ''));
        return refreshChurches();
      })
      .catch(() => {
        setStoredToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));

    const handleUnauthorized = () => {
      setUser(null);
      setChurches([]);
    };
    window.addEventListener('igleico:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('igleico:unauthorized', handleUnauthorized);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.post<{ token: string; user: AuthUser }>('/api/auth/login', {
      username,
      password,
    });
    setStoredToken(res.token);
    setUser(res.user);
    setSelectedChurchId(res.user.role === 'ADMIN_DISTRITO' ? 'all' : String(res.user.church_id || ''));
    await refreshChurches();
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
    setChurches([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        churches,
        selectedChurchId,
        setSelectedChurchId,
        refreshChurches,
        login,
        logout,
        isDistrictAdmin: user?.role === 'ADMIN_DISTRITO',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
