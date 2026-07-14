import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Redirects unauthenticated users to /login.
 * Wrapped around the entire logged-in route tree.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = localStorage.getItem('sf_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
