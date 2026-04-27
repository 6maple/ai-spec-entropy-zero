import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import rawApi, { type RawListItem, type RawStatus } from '@/lib/api/rawApi';
import { useI18n } from '@/contexts/I18nContext';
import { ApiError } from '@/lib/api/client';
import { isApiEnabled } from '@/lib/api/getAccessToken';
import {
  POLL_INTERVAL_MS,
  POLL_MAX_MS,
  isRawPendingPoll,
} from '@/constants/polling';
import { clsx } from 'clsx';

function statusClass(s: string) {
  if (s === 'processed' || s === 'completed') return 'text-[#2B8F80]';
  if (s === 'failed') return 'text-rose-600 dark:text-rose-400';
  return 'text-amber-700 dark:text-amber-300';
}

export default function RawLibraryPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<RawListItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'' | RawStatus>('');
  const [keyword, setKeyword] = useState('');
  const [kw, setKw] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [pollTimeout, setPollTimeout] = useState(false);

  const load = useCallback(async () => {
    if (!isApiEnabled()) {
      setRows([]);
      setErr(null);
      return;
    }
    try {
      setErr(null);
      const r = await rawApi.list({
        status: statusFilter || undefined,
        keyword: kw || undefined,
        page: 1,
        pageSize: 50,
      });
      setRows(r);
    } catch (e) {
      setErr((e as ApiError).message || (e as Error).message);
    }
  }, [statusFilter, kw]);

  useEffect(() => {
    if (!isApiEnabled()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const hasNonTerminal = rows.some((r) => isRawPendingPoll(r.status));

  useEffect(() => {
    if (!hasNonTerminal) {
      setPollTimeout(false);
      return;
    }
    const t0 = Date.now();
    const id = window.setInterval(() => {
      if (Date.now() - t0 > POLL_MAX_MS) {
        setPollTimeout(true);
        window.clearInterval(id);
        return;
      }
      void load();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [hasNonTerminal, load]);

  const onProcess = async (rawId: string, forceRetry: boolean) => {
    if (!isApiEnabled()) return;
    setActionBusy(true);
    try {
      setErr(null);
      await rawApi.process(rawId, { force_retry: forceRetry });
      await load();
    } catch (e) {
      setErr((e as ApiError).message || (e as Error).message);
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className='mx-auto max-w-[1200px] px-4 py-8'>
      <h1 className='text-2xl font-bold'>{t('raw.title')}</h1>
      <div className='mt-4 flex flex-wrap items-end gap-3'>
        <label className='flex flex-col text-sm gap-1'>
          <span>{t('raw.filterStatus')}</span>
          <select
            className='rounded-lg border border-[#E6ECE6] bg-white px-2 py-1.5 text-sm dark:border-[#2A4144] dark:bg-[#0F1A1A]'
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter((e.target.value as RawStatus | '') || '')
            }>
            <option value=''>{t('raw.all')}</option>
            <option value='pending'>{t('rawStatus.pending')}</option>
            <option value='processing'>{t('rawStatus.processing')}</option>
            <option value='processed'>{t('rawStatus.processed')}</option>
            <option value='failed'>{t('rawStatus.failed')}</option>
          </select>
        </label>
        <label className='flex flex-col text-sm gap-1'>
          <span>{t('raw.keyword')}</span>
          <div className='flex gap-1'>
            <input
              className='rounded-lg border border-[#E6ECE6] bg-white px-2 py-1.5 text-sm dark:border-[#2A4144] dark:bg-[#0F1A1A]'
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <button
              type='button'
              className='rounded-lg bg-slate-200 px-2 text-sm dark:bg-[#2A4144]'
              onClick={() => setKw(keyword)}>
              {t('common.refresh')}
            </button>
          </div>
        </label>
        <button
          type='button'
          onClick={() => void load()}
          className='rounded-lg border border-[#2B8F80] px-3 py-1.5 text-sm text-[#2B8F80]'>
          {t('common.refresh')}
        </button>
      </div>
      {pollTimeout && (
        <p className='mt-2 text-sm text-amber-800 dark:text-amber-200'>
          {t('raw.pollStopped')}
        </p>
      )}
      {err && <p className='mt-2 text-sm text-rose-600'>{err}</p>}
      {loading && (
        <div className='mt-8 flex justify-center' aria-label='loading'>
          <div className='h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-[#2B8F80]' />
        </div>
      )}
      {!loading && !isApiEnabled() && (
        <p className='mt-4 text-sm text-slate-600'>{t('home.loadError')}</p>
      )}
      <div className='mt-4 overflow-x-auto rounded-xl border border-[#E6ECE6] dark:border-[#2A4144]'>
        <table className='w-full min-w-[640px] text-left text-sm'>
          <thead>
            <tr className='border-b border-slate-200 dark:border-[#2A4144] bg-white/50 dark:bg-[#0F1A1A]'>
              <th className='p-2'>{t('raw.fileName')}</th>
              <th className='p-2'>{t('raw.status')}</th>
              <th className='p-2'>{t('raw.time')}</th>
              <th className='p-2' />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.raw_id}
                className='border-b border-slate-100 last:border-0 dark:border-[#1a2c2c]'>
                <td className='p-2 font-mono text-xs'>{r.file_name}</td>
                <td className={clsx('p-2', statusClass(r.status))}>
                  {t('rawStatus.' + r.status)}
                </td>
                <td className='p-2 text-slate-500'>
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className='p-2 flex flex-wrap gap-1'>
                  <Link
                    to={`/raw/${r.raw_id}`}
                    className='text-[#2B8F80] underline'>
                    {t('raw.openDetail')}
                  </Link>
                  {(r.status === 'pending' || r.status === 'failed') && (
                    <button
                      type='button'
                      className='text-[#2B8F80] text-xs disabled:opacity-50'
                      disabled={actionBusy}
                      onClick={() =>
                        void onProcess(r.raw_id, r.status === 'failed')
                      }>
                      {r.status === 'failed'
                        ? t('raw.reprocess')
                        : t('raw.process')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && isApiEnabled() && (
          <p className='p-4 text-slate-500 text-center'>{t('raw.all')}</p>
        )}
      </div>
    </div>
  );
}
