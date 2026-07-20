import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { useAuth } from '../../auth/AuthContext';

export function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  // Success message passed from RegisterPage after account creation
  const successMessage = (location.state as { successMessage?: string } | null)?.successMessage ?? '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await authApi.login({ email, password });
      login(user);
      navigate(
        user.role === 'candidate'
          ? '/candidate/dashboard'
          : user.role === 'recruiter'
            ? '/recruiter/dashboard'
            : '/admin',
        { replace: true },
      );
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/90 shadow-[0_35px_120px_-45px_rgba(15,23,42,0.35)] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative flex flex-col justify-between bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 p-8 text-white sm:p-10">
          <div>
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium">Trusted by modern hiring teams</div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl">Welcome back to JOB-FIX</h1>
            <p className="mt-4 max-w-md text-base text-blue-50/90">Secure AI-powered interviews, polished candidate reviews, and a premium experience for every team member.</p>
          </div>

          <div className="mt-8 rounded-[24px] border border-white/20 bg-white/10 p-5 backdrop-blur">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5" />
              <p className="text-sm font-medium">Enterprise-grade authentication, built for focus.</p>
            </div>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-semibold text-slate-900">Sign in</h2>
            <p className="mt-2 text-sm text-slate-500">Continue where you left off.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {successMessage && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {successMessage}
              </div>
            )}
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="********" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign in'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-700">Forgot password?</Link>
            <Link to="/register" className="font-medium text-slate-600 hover:text-slate-900">Create account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
