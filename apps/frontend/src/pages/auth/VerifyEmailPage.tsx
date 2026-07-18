import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/auth';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address…');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing its token.');
      return;
    }

    void authApi.verifyEmail(token)
      .then((result) => {
        setStatus('success');
        setMessage(result);
      })
      .catch((error: unknown) => {
        const apiMessage = (error as { response?: { data?: { message?: string } } })
          .response?.data?.message;
        setStatus('error');
        setMessage(apiMessage ?? 'This verification link is invalid or has expired.');
      });
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Email verification</h1>
        <p className={`mt-4 text-sm ${status === 'error' ? 'text-red-700' : 'text-gray-600'}`}>
          {message}
        </p>
        {status !== 'loading' && (
          <Link to="/login" className="btn-primary mt-6 inline-block">Go to sign in</Link>
        )}
      </div>
    </div>
  );
}
