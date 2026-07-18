import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/auth';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get('token') ?? '');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'checking' | 'ready' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('Checking your reset link…');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This password reset link is missing its token.');
      return;
    }
    void authApi.validatePasswordResetToken(token)
      .then(() => setStatus('ready'))
      .catch((error: unknown) => {
        const apiMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
        setStatus('error');
        setMessage(apiMessage ?? 'This password reset link is invalid or has expired.');
      });
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setMessage(await authApi.resetPassword(token, password));
      setStatus('success');
    } catch (error: unknown) {
      const apiMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setStatus('error');
      setMessage(apiMessage ?? 'Unable to reset your password.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-gray-900">Reset password</h1>
        {status === 'ready' && (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <input className="input" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password (8+ characters)" />
            <button className="btn-primary w-full" type="submit">Reset password</button>
          </form>
        )}
        {status !== 'ready' && <p className={`mt-4 text-sm ${status === 'error' ? 'text-red-700' : 'text-gray-600'}`}>{message}</p>}
        {status === 'success' || status === 'error' ? <p className="mt-6 text-center text-sm"><Link className="font-medium text-brand-600" to="/login">Go to sign in</Link></p> : null}
      </div>
    </div>
  );
}
