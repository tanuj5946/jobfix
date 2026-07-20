import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { BarChart3, BriefcaseBusiness, FileCheck2, LayoutGrid, PencilRuler, UserCircle2 } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../auth/AuthContext';

export function AppShell() {
  const { isLoading, user } = useAuth();

  if (isLoading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const mobileLinks = user.role === 'candidate'
    ? [
        { to: '/candidate/dashboard', label: 'Home', icon: LayoutGrid },
        { to: '/candidate/resume-upload', label: 'Resume', icon: FileCheck2 },
        { to: '/candidate/assessment', label: 'Assess', icon: PencilRuler },
        { to: '/candidate/jobs', label: 'Jobs', icon: BriefcaseBusiness },
        { to: '/candidate/profile', label: 'Profile', icon: UserCircle2 },
      ]
    : user.role === 'recruiter'
      ? [
          { to: '/recruiter/dashboard', label: 'Home', icon: LayoutGrid },
          { to: '/recruiter/jobs/new', label: 'Post job', icon: BriefcaseBusiness },
          { to: '/recruiter/company', label: 'Company', icon: UserCircle2 },
        ]
      : [
          { to: '/admin', label: 'Overview', icon: LayoutGrid },
          { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
          { to: '/admin/people', label: 'People', icon: UserCircle2 },
          { to: '/admin/operations', label: 'Ops', icon: BriefcaseBusiness },
        ];

  return (
    <div className="min-h-screen bg-transparent px-3 py-3 sm:px-4 lg:px-5">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-7xl gap-4 rounded-[32px] border border-slate-200/70 bg-white/60 p-3 shadow-[0_30px_90px_-36px_rgba(15,23,42,0.3)] backdrop-blur xl:gap-6">
        <aside className="hidden w-[var(--sidebar-width)] flex-col lg:flex">
          <Sidebar user={user} />
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-200/70 bg-slate-50/70">
          <Topbar user={user} />
          <nav className="flex gap-2 overflow-x-auto border-b border-slate-200/70 bg-white/60 px-3 py-2 lg:hidden" aria-label="Main navigation">
            {mobileLinks.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Icon className="h-3.5 w-3.5" />
                {label}
              </NavLink>
            ))}
          </nav>
          <main className="page-enter flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
