import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 text-center">
      <span className="text-6xl">🔍</span>
      <h1 className="text-3xl font-bold text-gray-900">404 — Page not found</h1>
      <p className="text-gray-500">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary">Go home</Link>
    </div>
  );
}
