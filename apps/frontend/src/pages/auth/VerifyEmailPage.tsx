import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/auth';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status,  setStatus]  = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address…');
  const [isPendingRegistration, setIsPendingRegistration] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing its token.');
      return;
    }

    void authApi.verifyEmail(token)
      .then(({ message: msg, pendingRegistration }) => {
        setStatus('success');
        setMessage(msg);
        setIsPendingRegistration(Boolean(pendingRegistration));
      })
      .catch((error: unknown) => {
        const apiMessage = (error as { response?: { data?: { message?: string } } })
          .response?.data?.message;
        setStatus('error');
        setMessage(apiMessage ?? 'This verification link is invalid or has expired.');
      });
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4 py-10">
      <div className="w-full max-w-md rounded-[32px] border border-slate-200/80 bg-white/90 p-8 text-center shadow-[0_35px_120px_-45px_rgba(15,23,42,0.35)] sm:p-10">

        {/* Icon */}
        {status === 'success' && (
          <div className="mb-5 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
          </div>
        )}

        <h1 className="text-3xl font-semibold text-slate-900">Email verification</h1>

        <p className={`mt-4 text-sm ${status === 'error' ? 'text-red-700' : 'text-slate-600'}`}>
          {message}
        </p>

        {/* Context-aware CTA */}
        {status === 'success' && isPendingRegistration && (
          <p className="mt-3 text-sm text-slate-500">
            You can now close this tab and return to the registration page to complete your account.
          </p>
        )}

        {status !== 'loading' && (
          <Link
            to={isPendingRegistration ? '/register' : '/login'}
            className="btn-primary mt-6 inline-flex"
          >
            {isPendingRegistration ? 'Back to registration' : 'Go to sign in'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
