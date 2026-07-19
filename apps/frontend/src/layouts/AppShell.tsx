import { Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../auth/AuthContext';

export function AppShell() {
  const { isLoading, user } = useAuth();

  if (isLoading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-transparent px-3 py-3 sm:px-4 lg:px-5">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-7xl gap-4 rounded-[32px] border border-slate-200/70 bg-white/60 p-3 shadow-[0_30px_90px_-36px_rgba(15,23,42,0.3)] backdrop-blur xl:gap-6">
        <aside className="hidden w-[var(--sidebar-width)] flex-col lg:flex">
          <Sidebar user={user} />
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-200/70 bg-slate-50/70">
          <Topbar user={user} />
          <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
