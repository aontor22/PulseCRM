import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, refreshAccessToken, setAccessToken } from '../lib/api';
import type { User } from '../types';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onRefreshed = (event: Event) => setUser((event as CustomEvent<User>).detail);
    window.addEventListener('crm:refreshed', onRefreshed);
    refreshAccessToken().finally(() => setLoading(false));
    return () => window.removeEventListener('crm:refreshed', onRefreshed);
  }, []);

  async function login(email: string, password: string) {
    const data = await api<{ accessToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      retry: false
    });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }

  async function register(name: string, email: string, password: string) {
    const data = await api<{ accessToken: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
      retry: false
    });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }

  async function googleLogin(credential: string) {
    const data = await api<{ accessToken: string; user: User }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
      retry: false
    });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST', retry: false }).catch(() => undefined);
    setAccessToken(null);
    setUser(null);
  }

  const value = useMemo(() => ({ user, loading, login, register, googleLogin, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
