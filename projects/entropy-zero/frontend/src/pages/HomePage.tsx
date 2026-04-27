import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/hooks/useAuth';
import rawApi, { type RawListItem } from '@/lib/api/rawApi';
import type { TaskListItem } from '@/lib/api/tasksApi';
import tasksApi from '@/lib/api/tasksApi';
import { isApiEnabled } from '@/lib/api/getAccessToken';

export default function HomePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [raw, setRaw] = useState<RawListItem[]>([]);
  const [taskRows, setTaskRows] = useState<TaskListItem[]>([]);
  const [partialErr, setPartialErr] = useState(false);
  const load = useCallback(async () => {
    if (!isApiEnabled()) {
      setRaw([]);
      setTaskRows([]);
      return;
    }
    setPartialErr(false);
    const a = await rawApi.list({ page: 1, pageSize: 5 }).catch(() => null);
    const b = await tasksApi.list({ page: 1, pageSize: 5 }).catch(() => null);
    if (a === null && b === null) setPartialErr(true);
    if (a) setRaw(a);
    if (b) setTaskRows(b);
  }, []);

  useEffect(() => {
    void load();
  }, [load, user?.id]);

  return (
    <div className='mx-auto max-w-[1200px] px-4 py-8 space-y-8'>
      <h1 className='text-3xl font-bold'>{t('home.title')}</h1>
      {partialErr && <p className='text-amber-800 dark:text-amber-200'>{t('home.loadError')}</p>}

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='rounded-xl border border-[#E6ECE6] bg-white p-4 dark:border-[#2A4144] dark:bg-[#0F1A1A]'>
          <h2 className='text-lg font-semibold'>{t('home.dueReview')}</h2>
          <p className='mt-2 text-sm text-slate-500'>{t('home.dueReviewHint')}</p>
          <Link
            to='/review'
            className='mt-3 inline-block text-sm text-[#2B8F80] font-medium hover:underline'>
            {t('home.goReview')}
          </Link>
        </div>
        <div className='rounded-xl border border-[#E6ECE6] bg-white p-4 dark:border-[#2A4144] dark:bg-[#0F1A1A]'>
          <h2 className='text-lg font-semibold'>{t('home.shortcuts')}</h2>
          <div className='mt-3 flex flex-col gap-2 text-sm'>
            <Link to='/upload' className='text-[#2B8F80] hover:underline'>
              {t('home.goUpload')}
            </Link>
            <Link to='/raw' className='text-[#2B8F80] hover:underline'>
              {t('home.goRaw')}
            </Link>
            <Link to='/tasks' className='text-[#2B8F80] hover:underline'>
              {t('home.goTasks')}
            </Link>
            <Link to='/review' className='text-[#2B8F80] hover:underline'>
              {t('home.goReview')}
            </Link>
          </div>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <section className='rounded-xl border border-[#E6ECE6] bg-white p-4 dark:border-[#2A4144] dark:bg-[#0F1A1A]'>
          <h2 className='text-base font-semibold'>{t('home.recentRaw')}</h2>
          <ul className='mt-2 space-y-1 text-sm'>
            {raw.length === 0 && !partialErr && (
              <li className='text-slate-500'>{isApiEnabled() ? t('notes.empty') : t('home.loadError')}</li>
            )}
            {raw.map((r) => (
              <li key={r.raw_id} className='font-mono text-xs'>
                {r.file_name} — {r.status}
              </li>
            ))}
          </ul>
        </section>
        <section className='rounded-xl border border-[#E6ECE6] bg-white p-4 dark:border-[#2A4144] dark:bg-[#0F1A1A]'>
          <h2 className='text-base font-semibold'>{t('home.recentTasks')}</h2>
          <ul className='mt-2 space-y-1 text-sm'>
            {taskRows.length === 0 && !partialErr && (
              <li className='text-slate-500'>{isApiEnabled() ? t('notes.empty') : t('home.loadError')}</li>
            )}
            {taskRows.map((k) => (
              <li key={k.task_id} className='text-xs font-mono'>
                {k.task_id.slice(0, 8)}… — {k.status}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
