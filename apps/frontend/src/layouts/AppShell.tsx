import { Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import type { User } from '../types';
import { getAuthenticatedUser } from '../auth/storage';

export function AppShell() {
  const user: User | null = getAuthenticatedUser();

  // Redirect root '/' based on role
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col" style={{ width: 'var(--sidebar-width)' }}>
        <Sidebar user={user} />
      </aside>

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
