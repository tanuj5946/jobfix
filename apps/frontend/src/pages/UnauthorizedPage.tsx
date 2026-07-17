import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Access denied</h1>
        <p className="mt-2 text-sm text-gray-500">Your account does not have permission to view this page.</p>
        <Link to="/" className="btn-primary mt-6 inline-flex">Go to dashboard</Link>
      </div>
    </div>
  );
}
