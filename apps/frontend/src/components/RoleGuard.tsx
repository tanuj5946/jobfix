import { Navigate, Outlet } from 'react-router-dom';
import type { UserRole } from '../types';
import { getAuthenticatedUser } from '../auth/storage';

interface RoleGuardProps {
  allowedRole: UserRole;
}

/**
 * Renders an <Outlet /> when the stored user role matches allowedRole.
 * Redirects to the Unauthorized page if the role doesn't match.
 */
export function RoleGuard({ allowedRole }: RoleGuardProps) {
  const user = getAuthenticatedUser();

  if (!user) return <Navigate to="/login" replace />;

  if (user.role !== allowedRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
