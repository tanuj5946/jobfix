import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getAccessToken, getAccessTokenExpiresAt } from '../auth/storage';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Redirects unauthenticated users to /login.
 * Wrapped around the entire logged-in route tree.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [hasValidToken, setHasValidToken] = useState(() => Boolean(getAccessToken()));

  useEffect(() => {
    const expiresAt = getAccessTokenExpiresAt();
    if (!expiresAt) {
      setHasValidToken(false);
      return;
    }

    const timeout = window.setTimeout(() => setHasValidToken(false), Math.max(0, expiresAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, []);

  if (!hasValidToken || !getAccessToken()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
