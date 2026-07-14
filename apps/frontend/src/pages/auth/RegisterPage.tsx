import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import type { UserRole } from '../../types';

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'candidate' as UserRole, companyName: '',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, companyName: form.role === 'recruiter' ? form.companyName : undefined };
      const { token, user } = await authApi.register(payload);
      localStorage.setItem('sf_token', token);
      localStorage.setItem('sf_user', JSON.stringify(user));
      navigate(user.role === 'candidate' ? '/candidate/resume-upload' : '/recruiter/dashboard', { replace: true });
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-1 text-sm text-gray-500">Join SmartFresher today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          <div>
            <label htmlFor="reg-name" className="mb-1 block text-sm font-medium text-gray-700">Full name</label>
            <input id="reg-name" type="text" required value={form.name} onChange={set('name')} className="input" placeholder="Jane Smith" />
          </div>
          <div>
            <label htmlFor="reg-email" className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input id="reg-email" type="email" required value={form.email} onChange={set('email')} className="input" placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="reg-password" className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <input id="reg-password" type="password" required minLength={8} value={form.password} onChange={set('password')} className="input" placeholder="Min. 8 characters" />
          </div>
          <div>
            <label htmlFor="reg-role" className="mb-1 block text-sm font-medium text-gray-700">I am a…</label>
            <select id="reg-role" value={form.role} onChange={set('role')} className="input">
              <option value="candidate">Candidate (looking for a job)</option>
              <option value="recruiter">Recruiter (hiring)</option>
            </select>
          </div>
          {form.role === 'recruiter' && (
            <div>
              <label htmlFor="reg-company" className="mb-1 block text-sm font-medium text-gray-700">Company name</label>
              <input id="reg-company" type="text" required value={form.companyName} onChange={set('companyName')} className="input" placeholder="Acme Corp" />
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
