import { ArrowRight, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { useAuth } from '../../auth/AuthContext';

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'candidate' as 'candidate' | 'recruiter', companyName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, companyName: form.role === 'recruiter' ? form.companyName : undefined };
      const { user } = await authApi.register(payload);
      login(user);
      navigate(user.role === 'candidate' ? '/candidate/resume-upload' : '/recruiter/dashboard', { replace: true });
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/90 shadow-[0_35px_120px_-45px_rgba(15,23,42,0.35)] lg:grid-cols-[0.95fr_1.05fr]">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-700 p-8 text-white sm:p-10">
          <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium">Launch faster</div>
          <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl">Create your hiring command center</h1>
          <p className="mt-4 max-w-md text-base text-slate-200">Join SmartFresher and bring a premium, AI-assisted experience to candidates and recruiters alike.</p>
          <div className="mt-8 rounded-[24px] border border-white/20 bg-white/10 p-5 backdrop-blur">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5" />
              <p className="text-sm font-medium">Beautiful by default. Fast by design.</p>
            </div>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-semibold text-slate-900">Create an account</h2>
            <p className="mt-2 text-sm text-slate-500">Start with your role and move forward with confidence.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            <div>
              <label htmlFor="reg-name" className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
              <input id="reg-name" type="text" required value={form.name} onChange={set('name')} className="input" placeholder="Jane Smith" />
            </div>
            <div>
              <label htmlFor="reg-email" className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input id="reg-email" type="email" required value={form.email} onChange={set('email')} className="input" placeholder="you@example.com" />
            </div>
            <div>
              <label htmlFor="reg-password" className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <input id="reg-password" type="password" required minLength={8} value={form.password} onChange={set('password')} className="input" placeholder="Min. 8 characters" />
            </div>
            <div>
              <label htmlFor="reg-role" className="mb-2 block text-sm font-medium text-slate-700">I am a...</label>
              <select id="reg-role" value={form.role} onChange={set('role')} className="input">
                <option value="candidate">Candidate (looking for a job)</option>
                <option value="recruiter">Recruiter (hiring)</option>
              </select>
            </div>
            {form.role === 'recruiter' && (
              <div>
                <label htmlFor="reg-company" className="mb-2 block text-sm font-medium text-slate-700">Company name</label>
                <input id="reg-company" type="text" required value={form.companyName} onChange={set('companyName')} className="input" placeholder="Acme Corp" />
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account...' : 'Create account'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
