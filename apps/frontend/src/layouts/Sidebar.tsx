import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  BriefcaseBusiness,
  Compass,
  FileCheck2,
  LayoutGrid,
  PencilRuler,
  Search,
  UserCircle2,
} from 'lucide-react';
import type { User } from '../types';
import { FEATURES } from '../config/features';

interface SidebarProps {
  user: User;
}

const candidateLinks = [
  { to: '/candidate/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/candidate/resume-upload', label: 'Resume Parsing', icon: FileCheck2 },
  { to: '/candidate/skills', label: 'Skill Selection', icon: Search },
  { to: '/candidate/assessment', label: 'Assessment', icon: PencilRuler },
  { to: '/candidate/jobs', label: 'Browse Jobs', icon: BriefcaseBusiness },
  { to: '/candidate/applications', label: 'Applications', icon: BarChart3 },
  { to: '/candidate/profile', label: 'Verified Profile', icon: UserCircle2 },
  ...(FEATURES.CAREER_COACH
    ? [{ to: '/candidate/career-coach', label: 'Career Coach', icon: Compass }]
    : []),
];

const recruiterLinks = [
  { to: '/recruiter/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/recruiter/jobs/new', label: 'Post a Job', icon: BriefcaseBusiness },
  { to: '/recruiter/company', label: 'Company', icon: UserCircle2 },
];

const adminLinks = [
  { to: '/admin', label: 'Administration', icon: BarChart3 },
];

export function Sidebar({ user }: SidebarProps) {
  const links = user.role === 'candidate'
    ? candidateLinks
    : user.role === 'recruiter'
      ? recruiterLinks
      : adminLinks;

  return (
    <div className="flex h-full flex-col rounded-[28px] border border-slate-200/70 bg-white/80 p-3 shadow-soft backdrop-blur">
      <div className="flex items-center gap-3 rounded-[22px] border border-slate-200/80 bg-gradient-to-r from-blue-600 to-cyan-500 p-4 text-white shadow-lg shadow-blue-500/20">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-lg font-semibold">S</div>
        <div>
          <p className="text-sm font-semibold">SmartFresher</p>
          <p className="text-xs text-blue-50/90">AI hiring workspace</p>
        </div>
      </div>

      <nav className="mt-4 flex-1 space-y-1.5">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                ].join(' ')
              }
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Current role</p>
        <span
          className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            user.role === 'candidate'
              ? 'bg-blue-100 text-blue-700'
              : user.role === 'recruiter'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-violet-100 text-violet-700'
          }`}
        >
          {user.role}
        </span>
      </div>
    </div>
  );
}
