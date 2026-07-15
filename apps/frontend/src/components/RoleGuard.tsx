import { Navigate, Outlet } from 'react-router-dom';
import type { UserRole } from '../types';

interface RoleGuardProps {
  allowedRole: UserRole;
}

/**
 * Renders an <Outlet /> when the stored user role matches allowedRole.
 * Redirects to the correct home if the role doesn't match.
 */
export function RoleGuard({ allowedRole }: RoleGuardProps) {
  const raw = localStorage.getItem('sf_user');
  const user = raw ? JSON.parse(raw) : null;

  if (!user) return <Navigate to="/login" replace />;

  if (user.role !== allowedRole) {
    const home = user.role === 'candidate'
      ? '/candidate/dashboard'
      : user.role === 'recruiter'
        ? '/recruiter/dashboard'
        : '/admin';
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}
