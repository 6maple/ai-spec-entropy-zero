import { useI18n } from '@/contexts/I18nContext';

export default function LoginPage() {
  const { t } = useI18n();
  return (
    <div className='min-h-screen flex items-center justify-center bg-[#F6F8F4] dark:bg-[#0B1213] px-4'>
      <div className='max-w-md w-full bg-white p-8 rounded-2xl border border-[#E6ECE6] dark:bg-[#0F1A1A] dark:border-[#2A4144]'>
        <h1 className='text-2xl font-bold mb-6 text-center'>{t('auth.login')}</h1>
        <p className='text-slate-600 dark:text-slate-400 text-center'>{t('app.name')}</p>
        <p className='text-sm text-slate-500 text-center mt-4'>{t('auth.loginSub')}</p>
      </div>
    </div>
  );
}
