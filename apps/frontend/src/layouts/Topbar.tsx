import { Bell, LogOut, Search, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { User } from '../types';
import { useAuth } from '../auth/AuthContext';

interface TopbarProps {
  user: User;
}

export function Topbar({ user }: TopbarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const nextStep = user.role === 'candidate'
    ? { title: 'Keep your profile moving', description: 'Complete your assessment to strengthen your matches.', to: '/candidate/assessment', label: 'Continue assessment' }
    : user.role === 'recruiter'
      ? { title: 'Build your hiring pipeline', description: 'Publish a role and start reviewing ranked candidates.', to: '/recruiter/jobs/new', label: 'Post a job' }
      : { title: 'Review workspace activity', description: 'Check the latest platform metrics and account activity.', to: '/admin', label: 'Open administration' };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 sm:flex">
          <Search className="h-4 w-4" />
          <span>{user.role === 'candidate' ? 'Your career workspace' : 'Your hiring workspace'}</span>
        </div>

        <div className="relative flex items-center gap-3">
          <button
            type="button"
            onClick={() => setNotificationsOpen(open => !open)}
            aria-expanded={notificationsOpen}
            aria-label="Toggle workspace updates"
            className="relative rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-blue-500" />
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 top-12 z-30 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Workspace update</p>
                  <p className="mt-1 text-sm text-slate-600">{nextStep.title}</p>
                </div>
                <button type="button" onClick={() => setNotificationsOpen(false)} aria-label="Close updates" className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{nextStep.description}</p>
              <Link to={nextStep.to} onClick={() => setNotificationsOpen(false)} className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700">
                {nextStep.label} →
              </Link>
            </div>
          )}
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
