import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/contexts/I18nContext';

function ShellLoading({ message }: { message: string }) {
  return (
    <div className='min-h-screen flex items-center justify-center bg-[#F6F8F4] dark:bg-[#0B1213]'>
      <p className='text-slate-500'>{message}</p>
    </div>
  );
}

/** 业务页：未登录重定向登录。 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { t } = useI18n();

  if (loading) {
    return <ShellLoading message={t('app.loading')} />;
  }
  if (!user) {
    return <Navigate to='/auth/login' replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}

/** 登录页：已登录跳转首页（或可从 state.from 回填，由访客自行导航）。 */
export function RequireGuest({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useI18n();

  if (loading) {
    return <ShellLoading message={t('app.loading')} />;
  }
  if (user) {
    return <Navigate to='/' replace />;
  }
  return <>{children}</>;
}
