import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '../types';
import { clearAuth, getAccessToken, getAccessTokenExpiresAt, getAuthenticatedUser, saveAuth } from './storage';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (accessToken: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ token: string | null; user: User | null }>(() => {
    const token = getAccessToken();
    const user = token ? getAuthenticatedUser() : null;
    return user ? { token, user } : { token: null, user: null };
  });

  const logout = useCallback(() => {
    clearAuth();
    setSession({ token: null, user: null });
  }, []);

  const login = useCallback((accessToken: string, user: User) => {
    saveAuth(accessToken, user);
    setSession({ token: accessToken, user });
  }, []);

  useEffect(() => {
    if (!session.token) return;

    const expiresAt = getAccessTokenExpiresAt();
    if (!expiresAt) {
      logout();
      return;
    }

    const timeout = window.setTimeout(logout, Math.max(0, expiresAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [logout, session.token]);

  const value = useMemo<AuthContextValue>(() => ({
    ...session,
    isAuthenticated: Boolean(session.token && session.user),
    login,
    logout,
  }), [login, logout, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
