import { Outlet } from 'react-router-dom';
import type { UserRole } from '../types';
import { ProtectedRoute } from './ProtectedRoute';

interface RoleGuardProps {
  allowedRole: UserRole;
}

/**
 * Adapts nested React Router routes to the reusable role-aware guard.
 */
export function RoleGuard({ allowedRole }: RoleGuardProps) {
  return (
    <ProtectedRoute allowedRoles={[allowedRole]}>
      <Outlet />
    </ProtectedRoute>
  );
}
