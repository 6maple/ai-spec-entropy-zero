import { useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Brain, Bell, LogIn, LogOut, Menu, Search, Upload, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/contexts/I18nContext';
import { clsx } from 'clsx';

const linkClass = (active: boolean) =>
  clsx(
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    active
      ? 'bg-[#2B8F80]/15 text-[#2B8F80] dark:text-[#5ec4b0]'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5',
  );

const centerPaths = [
  { to: '/', key: 'nav.home' as const },
  { to: '/raw', key: 'nav.raw' as const },
  { to: '/tasks', key: 'nav.tasks' as const },
  { to: '/notes', key: 'nav.notes' as const },
  { to: '/review', key: 'nav.review' as const },
];

function ShellToast({ msg, onClose }: { msg: string | null; onClose: () => void }) {
  if (!msg) return null;
  return (
    <div
      className='fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 rounded-lg bg-[#0F2A26] px-4 py-2 text-sm text-white shadow-lg'
      role='status'
    >
      {msg}
      <button
        type='button'
        className='ml-2 text-white/80 hover:text-white'
        onClick={onClose}
        aria-label='close'
      >
        ×
      </button>
    </div>
  );
}

export function TopNav() {
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showSearchToast = (e: FormEvent) => {
    e.preventDefault();
    setToast(t('shell.searchHint'));
  };

  return (
    <>
      <header className='sticky top-0 z-50 w-full h-14 border-b border-[#E6ECE6] bg-white/80 backdrop-blur-md dark:border-[#2A4144] dark:bg-[#0F1A1A]/90'>
        <div className='container mx-auto flex h-14 items-center justify-between gap-2 px-4'>
          <div className='flex min-w-0 items-center gap-2'>
            <button
              type='button'
              className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-white/5 lg:hidden'
              aria-label='menu'
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className='h-5 w-5' />
            </button>
            <Link to='/' className='flex min-w-0 items-center gap-2'>
              <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2B8F80]'>
                <Brain className='h-5 w-5 text-white' />
              </div>
              <span className='hidden font-semibold sm:inline truncate'>{t('app.name')}</span>
            </Link>
          </div>

          <nav
            className='hidden max-w-2xl flex-1 items-center justify-center gap-0.5 lg:flex'
            aria-label='主菜单'
          >
            {centerPaths.map(({ to, key }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => linkClass(isActive)}
              >
                {t(key)}
              </NavLink>
            ))}
          </nav>

          <div className='flex shrink-0 items-center gap-1 sm:gap-2'>
            <Link
              to='/upload'
              className='inline-flex items-center gap-1.5 rounded-lg bg-[#2B8F80] px-2.5 py-2 text-xs font-medium text-white sm:px-3 sm:text-sm'
            >
              <Upload className='h-4 w-4' />
              <span className='hidden sm:inline'>{t('nav.upload')}</span>
            </Link>
            <form onSubmit={showSearchToast} className='hidden sm:block'>
              <button
                type='submit'
                className='inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
                title={t('shell.searchHint')}
              >
                <Search className='h-5 w-5' />
              </button>
            </form>
            <button
              type='button'
              className='hidden h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 sm:inline-flex'
              title={t('shell.notifHint')}
              onClick={() => setToast(t('shell.notifHint'))}
            >
              <Bell className='h-5 w-5' />
            </button>
            {user ? (
              <button
                type='button'
                className='inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
                onClick={async () => {
                  await signOut();
                }}
                title={t('auth.signOut')}
              >
                <LogOut className='h-5 w-5' />
              </button>
            ) : (
              <button
                type='button'
                className='inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
                onClick={() => void navigate('/auth/login')}
                title={t('auth.login')}
              >
                <LogIn className='h-5 w-5' />
              </button>
            )}
          </div>
        </div>
      </header>

      {drawerOpen && (
        <div
          className='fixed inset-0 z-[60] lg:hidden'
          role='dialog'
          aria-modal='true'
        >
          <div
            className='absolute inset-0 bg-black/40'
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className='absolute left-0 top-0 flex h-full w-[min(20rem,88vw)] flex-col bg-white p-4 shadow-xl dark:bg-[#0F1A1A]'>
            <div className='mb-4 flex items-center justify-between'>
              <span className='font-semibold'>{t('app.name')}</span>
              <button
                type='button'
                onClick={() => setDrawerOpen(false)}
                className='rounded p-1 hover:bg-slate-100 dark:hover:bg-white/5'
                aria-label='close'
              >
                <X className='h-5 w-5' />
              </button>
            </div>
            <div className='flex flex-col gap-0.5'>
              {centerPaths.map(({ to, key }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) => clsx('rounded-md px-3 py-2', linkClass(isActive))}
                >
                  {t(key)}
                </NavLink>
              ))}
            </div>
            <div className='mt-4 border-t border-slate-200 pt-4 dark:border-[#2A4144]'>
              <form onSubmit={showSearchToast}>
                <button
                  type='submit'
                  className='flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-slate-600 dark:text-slate-400'
                >
                  <Search className='h-4 w-4' />
                  {t('shell.searchHint')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <ShellToast msg={toast} onClose={() => setToast(null)} />
    </>
  );
}
