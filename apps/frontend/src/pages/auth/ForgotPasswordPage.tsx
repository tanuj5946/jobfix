import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/auth';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      setMessage(await authApi.forgotPassword(email));
    } catch {
      setMessage('Unable to request a password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4 py-10">
      <div className="w-full max-w-md rounded-[32px] border border-slate-200/80 bg-white/90 p-8 shadow-[0_35px_120px_-45px_rgba(15,23,42,0.35)] sm:p-10">
        <h1 className="text-3xl font-semibold text-slate-900">Forgot password?</h1>
        <p className="mt-2 text-sm text-slate-500">Enter your email and we'll send a reset link.</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <input className="input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
          <button className="btn-primary w-full" disabled={loading} type="submit">
            {loading ? 'Sending...' : 'Send reset link'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </form>
        {message && <p className="mt-4 text-sm text-slate-600">{message}</p>}
        <p className="mt-6 text-center text-sm text-slate-500"><Link className="font-medium text-blue-600 hover:text-blue-700" to="/login">Back to sign in</Link></p>
      </div>
    </div>
  );
}
