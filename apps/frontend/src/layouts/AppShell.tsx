import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import type { User } from '../types';

export function AppShell() {
  const navigate = useNavigate();
  const raw = localStorage.getItem('sf_user');
  const user: User | null = raw ? JSON.parse(raw) : null;

  // Redirect root '/' based on role
  if (!user) {
    navigate('/login', { replace: true });
    return null;
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
