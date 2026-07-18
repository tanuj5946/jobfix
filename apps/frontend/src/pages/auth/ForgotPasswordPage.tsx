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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-gray-900">Forgot password?</h1>
        <p className="mt-2 text-sm text-gray-500">Enter your email and we’ll send a reset link.</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <input className="input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
          <button className="btn-primary w-full" disabled={loading} type="submit">
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        {message && <p className="mt-4 text-sm text-gray-600">{message}</p>}
        <p className="mt-6 text-center text-sm text-gray-500"><Link className="font-medium text-brand-600" to="/login">Back to sign in</Link></p>
      </div>
    </div>
  );
}
