import { Bell, LogOut, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types';
import { useAuth } from '../auth/AuthContext';

interface TopbarProps {
  user: User;
}

export function Topbar({ user }: TopbarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 sm:flex">
          <Search className="h-4 w-4" />
          <span>Explore your workspace</span>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900">
            <Bell className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-semibold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-500">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
