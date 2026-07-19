import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-transparent px-6 text-center">
      <div className="rounded-[32px] border border-slate-200/80 bg-white/90 p-10 shadow-[0_35px_120px_-45px_rgba(15,23,42,0.35)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
          <Compass className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-3 max-w-md text-sm text-slate-500">The route you’re looking for doesn’t exist, but you can still return to the workspace.</p>
        <Link to="/" className="btn-primary mt-6">Go home</Link>
      </div>
    </div>
  );
}
