import { ArrowRight, CheckCircle2, Clock, Mail, RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, type RegisterPayload } from '../../api/auth';

// ── State machine ──────────────────────────────────────────────────────────────
// form → email_sent → verified → (navigate to /login)
type Step = 'form' | 'email_sent' | 'verified';

const POLL_INTERVAL_MS = 3_000;       // poll every 3 s
const POLL_TIMEOUT_MS  = 5 * 60_000; // give up after 5 min

export function RegisterPage() {
  const navigate = useNavigate();

  // ── Form fields ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'candidate' as 'candidate' | 'recruiter',
    companyName: '',
  });

  const [step,      setStep]      = useState<Step>('form');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);

  // Raw verification token returned by the API — kept in a ref so interval
  // callbacks always read the latest value without stale-closure issues.
  const tokenRef      = useRef<string | null>(null);
  const pollTimer     = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartedAt = useRef<number>(0);

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  // Cleanup on unmount
  useEffect(() => () => { if (pollTimer.current) clearInterval(pollTimer.current); }, []);

  // ── Polling helper ────────────────────────────────────────────────────────────
  const startPolling = (token: string) => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    tokenRef.current   = token;
    pollStartedAt.current = Date.now();

    pollTimer.current = setInterval(async () => {
      if (Date.now() - pollStartedAt.current > POLL_TIMEOUT_MS) {
        clearInterval(pollTimer.current!);
        setError('Verification timed out. Please click "Resend email" and try again.');
        return;
      }
      try {
        const { verified } = await authApi.checkPreRegistrationToken(token);
        if (verified) {
          clearInterval(pollTimer.current!);
          setStep('verified');
        }
      } catch {
        // Network hiccup — keep polling silently
      }
    }, POLL_INTERVAL_MS);
  };

  // ── Step 1: Send verification email (does NOT create the user) ───────────────
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload: RegisterPayload = {
        name:        form.name,
        email:       form.email,
        password:    form.password,
        role:        form.role,
        ...(form.role === 'recruiter' ? { companyName: form.companyName } : {}),
      };
      const { verificationToken } = await authApi.sendPreRegistrationVerification(payload);
      startPolling(verificationToken);
      setStep('email_sent');
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      setError(apiMessage ?? 'Failed to send verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1b: Resend verification email ───────────────────────────────────────
  const handleResend = async () => {
    setError('');
    setResending(true);
    try {
      const payload: RegisterPayload = {
        name:        form.name,
        email:       form.email,
        password:    form.password,
        role:        form.role,
        ...(form.role === 'recruiter' ? { companyName: form.companyName } : {}),
      };
      const { verificationToken } = await authApi.sendPreRegistrationVerification(payload);
      startPolling(verificationToken);
      setStep('email_sent');
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      setError(apiMessage ?? 'Failed to resend email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // ── Step 3: Create the account ───────────────────────────────────────────────
  // The backend will only create the user if the pending entry is verified.
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload: RegisterPayload = {
        name:        form.name,
        email:       form.email,
        password:    form.password,
        role:        form.role,
        ...(form.role === 'recruiter' ? { companyName: form.companyName } : {}),
      };
      await authApi.register(payload);
      navigate('/login', {
        replace: true,
        state: { successMessage: 'Account created! Please sign in to continue.' },
      });
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      setError(apiMessage ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/90 shadow-[0_35px_120px_-45px_rgba(15,23,42,0.35)] lg:grid-cols-[0.95fr_1.05fr]">

        {/* ── Left panel ─────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-700 p-8 text-white sm:p-10">
          <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium">
            Launch faster
          </div>
          <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl">
            Create your hiring command center
          </h1>
          <p className="mt-4 max-w-md text-base text-slate-200">
            Join JOB-FIX and bring a premium, AI-assisted experience to candidates and recruiters alike.
          </p>
          <div className="mt-8 rounded-[24px] border border-white/20 bg-white/10 p-5 backdrop-blur">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5" />
              <p className="text-sm font-medium">Verified skills. Better matches. Faster hiring.</p>
            </div>
          </div>

          {/* Step progress indicator */}
          <div className="mt-10 space-y-4">
            {([
              { id: 'form',       label: 'Fill in your details' },
              { id: 'email_sent', label: 'Verify your email' },
              { id: 'verified',   label: 'Create your account' },
            ] as const).map((s, i) => {
              const stepOrder: Step[] = ['form', 'email_sent', 'verified'];
              const currentIndex = stepOrder.indexOf(step);
              const isActive = step === s.id;
              const isDone   = currentIndex > i;

              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300
                    ${isDone  ? 'bg-emerald-400 text-white scale-110'  :
                      isActive ? 'bg-white text-slate-900 scale-110 ring-2 ring-white/50' :
                                 'bg-white/15 text-white/40'}`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span className={`text-sm font-medium transition-colors duration-300
                    ${isActive ? 'text-white'        :
                      isDone   ? 'text-emerald-300'  :
                                 'text-white/35'}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right panel ────────────────────────────────────────────── */}
        <div className="p-8 sm:p-10">

          {/* ─── STEP 1: form ─────────────────────────────────────────── */}
          {step === 'form' && (
            <>
              <div className="mb-8 text-center lg:text-left">
                <h2 className="text-3xl font-semibold text-slate-900">Create an account</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Fill in your details and we'll send a verification email.
                </p>
              </div>

              <form onSubmit={handleVerifyEmail} className="space-y-4">
                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="reg-name" className="mb-2 block text-sm font-medium text-slate-700">
                    Full name
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    value={form.name}
                    onChange={set('name')}
                    className="input"
                    placeholder="Jane Smith"
                  />
                </div>

                <div>
                  <label htmlFor="reg-email" className="mb-2 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={set('email')}
                    className="input"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="reg-password" className="mb-2 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={set('password')}
                    className="input"
                    placeholder="Min. 8 characters"
                  />
                </div>

                <div>
                  <label htmlFor="reg-role" className="mb-2 block text-sm font-medium text-slate-700">
                    I am a...
                  </label>
                  <select
                    id="reg-role"
                    value={form.role}
                    onChange={set('role')}
                    className="input"
                  >
                    <option value="candidate">Candidate (looking for a job)</option>
                    <option value="recruiter">Recruiter (hiring)</option>
                  </select>
                </div>

                {form.role === 'recruiter' && (
                  <div>
                    <label htmlFor="reg-company" className="mb-2 block text-sm font-medium text-slate-700">
                      Company name
                    </label>
                    <input
                      id="reg-company"
                      type="text"
                      required
                      value={form.companyName}
                      onChange={set('companyName')}
                      className="input"
                      placeholder="Acme Corp"
                    />
                  </div>
                )}

                <button
                  id="reg-verify-email-btn"
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? 'Sending email…' : 'Verify Email'}
                  <Mail className="ml-2 h-4 w-4" />
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
                  Sign in
                </Link>
              </p>
            </>
          )}

          {/* ─── STEP 2: email_sent ───────────────────────────────────── */}
          {step === 'email_sent' && (
            <>
              <div className="mb-8 text-center lg:text-left">
                <h2 className="text-3xl font-semibold text-slate-900">Check your inbox</h2>
                <p className="mt-2 text-sm text-slate-500">
                  We sent a verification link to{' '}
                  <strong className="text-slate-700">{form.email}</strong>.
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Waiting state */}
              <div className="mb-6 flex items-start gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 animate-pulse text-blue-500" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Waiting for you to verify…</p>
                  <p className="mt-1 text-blue-700">
                    Click the link in your email. The Register button will unlock automatically.
                  </p>
                </div>
              </div>

              {/* Register button — locked until verified */}
              <form onSubmit={handleRegister}>
                <button
                  id="reg-register-btn"
                  type="submit"
                  disabled={true}
                  className="btn-primary w-full cursor-not-allowed opacity-40"
                  aria-disabled="true"
                >
                  Register
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </form>

              <div className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-500">
                <span>Didn&apos;t receive the email?</span>
                <button
                  id="reg-resend-btn"
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                  {resending ? 'Resending…' : 'Resend email'}
                </button>
              </div>
            </>
          )}

          {/* ─── STEP 3: verified ─────────────────────────────────────── */}
          {step === 'verified' && (
            <>
              <div className="mb-8 text-center lg:text-left">
                <h2 className="text-3xl font-semibold text-slate-900">Email verified!</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Your email address has been confirmed. Complete registration below.
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Verified badge */}
              <div className="mb-6 flex items-start gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <div className="text-sm text-emerald-800">
                  <p className="font-medium">Email address confirmed</p>
                  <p className="mt-1 text-emerald-700">
                    <strong>{form.email}</strong> is verified. Click Register to create your account.
                  </p>
                </div>
              </div>

              {/* Register button — now enabled */}
              <form onSubmit={handleRegister}>
                <button
                  id="reg-register-btn"
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? 'Creating account…' : 'Register'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
