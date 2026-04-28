import { useEffect, useState, type FormEvent } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/hooks/useAuth';

type Mode = 'login' | 'register';

function mapSupabaseErr(msg: string, t: (k: string) => string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return t('auth.errInvalidCredential');
  if (m.includes('email not confirmed') || m.includes('not confirmed'))
    return t('auth.errEmailNotConfirmed');
  if (m.includes('user already registered')) return t('auth.errAlreadyRegistered');
  if (m.includes('password')) return t('auth.errWeakPassword');
  return msg;
}

export default function LoginPage() {
  const { t } = useI18n();
  const { signIn, signUp, authError, clearAuthError, isSupabaseConfigured } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [signupHint, setSignupHint] = useState(false);

  useEffect(() => {
    clearAuthError();
    setSignupHint(false);
  }, [mode, clearAuthError]);

  const displayErr = (): string | null => {
    if (!authError) return null;
    if (authError === 'MISSING_SUPABASE') return t('auth.missingSupabase');
    return mapSupabaseErr(authError, t);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || busy) return;
    clearAuthError();
    setSignupHint(false);
    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        const ok = await signUp(email.trim(), password);
        if (ok) setSignupHint(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const err = displayErr();

  return (
    <div className='min-h-[calc(100vh-8rem)] flex items-center justify-center bg-[#F6F8F4] px-4 dark:bg-[#0B1213]'>
      <div className='w-full max-w-md rounded-2xl border border-[#E6ECE6] bg-white p-8 dark:border-[#2A4144] dark:bg-[#0F1A1A]'>
        <h1 className='text-center text-2xl font-bold text-slate-900 dark:text-slate-50'>
          {t('auth.login')}
        </h1>
        <p className='mt-1 text-center text-sm text-slate-500 dark:text-slate-400'>{t('auth.subtitle')}</p>

        <div className='mt-6 flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700'>
          <button
            type='button'
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              mode === 'login'
                ? 'bg-[#2B8F80] text-white'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5'
            }`}
            onClick={() => setMode('login')}
          >
            {t('auth.tabLogin')}
          </button>
          <button
            type='button'
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              mode === 'register'
                ? 'bg-[#2B8F80] text-white'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5'
            }`}
            onClick={() => setMode('register')}
          >
            {t('auth.tabRegister')}
          </button>
        </div>

        {!isSupabaseConfigured ? (
          <p className='mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100'>
            {t('auth.missingSupabase')}
          </p>
        ) : null}

        <form className='mt-6 space-y-4' onSubmit={onSubmit}>
          <div>
            <label className='block text-sm font-medium text-slate-700 dark:text-slate-300' htmlFor='email'>
              {t('auth.email')}
            </label>
            <input
              id='email'
              type='email'
              autoComplete='email'
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-[#2B8F80] focus:ring-2 dark:border-slate-600 dark:bg-slate-950'
              disabled={!isSupabaseConfigured || busy}
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-slate-700 dark:text-slate-300' htmlFor='password'>
              {t('auth.password')}
            </label>
            <input
              id='password'
              type='password'
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-[#2B8F80] focus:ring-2 dark:border-slate-600 dark:bg-slate-950'
              disabled={!isSupabaseConfigured || busy}
            />
          </div>

          {signupHint ? (
            <p className='rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100'>
              {t('auth.signupSuccessHint')}
            </p>
          ) : null}

          {err ? (
            <p className='rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-100'>
              {err}
            </p>
          ) : null}

          <button
            type='submit'
            disabled={!isSupabaseConfigured || busy}
            className='flex w-full items-center justify-center rounded-lg bg-[#2B8F80] py-2.5 text-sm font-medium text-white transition hover:bg-[#247a6d] disabled:cursor-not-allowed disabled:opacity-50'
          >
            {busy ? t('auth.submitting') : mode === 'login' ? t('auth.submitLogin') : t('auth.submitRegister')}
          </button>
        </form>
      </div>
    </div>
  );
}
