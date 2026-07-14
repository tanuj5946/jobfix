import { NavLink } from 'react-router-dom';
import type { User } from '../types';

interface SidebarProps {
  user: User;
}

const candidateLinks = [
  { to: '/candidate/resume-upload', label: 'Resume Parsing', icon: '1' },
  { to: '/candidate/skills', label: 'Skill Selection', icon: '2' },
  { to: '/candidate/assessment', label: 'Assessment', icon: '3' },
  { to: '/candidate/dashboard', label: 'Dashboard', icon: '4' },
  { to: '/candidate/profile', label: 'Verified Profile', icon: 'P' },
  { to: '/candidate/career-coach', label: 'Career Coach', icon: 'C' },
];

const recruiterLinks = [
  { to: '/recruiter/dashboard', label: 'Dashboard', icon: 'D' },
  { to: '/recruiter/jobs/new', label: 'Post a Job', icon: '+' },
];

export function Sidebar({ user }: SidebarProps) {
  const links = user.role === 'candidate' ? candidateLinks : recruiterLinks;

  return (
    <div className="flex h-full flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <span className="text-lg font-bold text-brand-600">SmartFresher</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              ].join(' ')
            }
          >
            <span className="w-4 text-center text-base leading-none">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-200 px-6 py-4">
        <span
          className={`badge text-xs ${
            user.role === 'candidate'
              ? 'bg-brand-100 text-brand-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {user.role}
        </span>
      </div>
    </div>
  );
}
