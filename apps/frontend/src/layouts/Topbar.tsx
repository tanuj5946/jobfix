import { useNavigate } from 'react-router-dom';
import type { User } from '../types';
import { useAuth } from '../auth/AuthContext';

interface TopbarProps {
  user: User;
}

export function Topbar({ user }: TopbarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Page context — filled by page title via document.title or future context */}
      <div />

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {user.name}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
