import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import tasksApi, {
  type TaskListItem,
  type TaskStatus,
} from '@/lib/api/tasksApi';
import rawApi from '@/lib/api/rawApi';
import { useI18n } from '@/contexts/I18nContext';
import { ApiError } from '@/lib/api/client';
import { isApiEnabled } from '@/lib/api/getAccessToken';
import {
  POLL_INTERVAL_MS,
  POLL_MAX_MS,
  isTaskPendingPoll,
} from '@/constants/polling';
import { clsx } from 'clsx';

function statusClass(s: string) {
  if (s === 'completed' || s === 'processed') return 'text-[#2B8F80]';
  if (s === 'failed') return 'text-rose-600 dark:text-rose-400';
  return 'text-amber-700 dark:text-amber-300';
}

export default function TasksPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [rows, setRows] = useState<TaskListItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'' | TaskStatus>('');
  const [actionBusy, setActionBusy] = useState(false);
  const [pollTimeout, setPollTimeout] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const lastFingerprintRef = useRef('');
  const failCountRef = useRef(0);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (isPoll = false) => {
      if (!isApiEnabled()) {
        setRows([]);
        setLoading(false);
        return;
      }

      // 生成新的请求 ID，用于追踪最新请求
      const currentRequestId = ++requestIdRef.current;

      try {
        if (!isPoll) setErr(null);
        setIsRefreshing(true);
        const r = await tasksApi.list({
          status: statusFilter || undefined,
          page: 1,
          pageSize: 50,
        });

        // 只有当这是最新的请求时才更新状态
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        const newFingerprint = JSON.stringify(
          r.map((item) => ({ id: item.task_id, status: item.status })),
        );

        if (isPoll) {
          if (newFingerprint === lastFingerprintRef.current) {
            failCountRef.current = Math.min(failCountRef.current + 1, 4);
          } else {
            failCountRef.current = 0;
          }
        } else {
          failCountRef.current = 0;
        }

        lastFingerprintRef.current = newFingerprint;
        setRows(r);
      } catch (e) {
        // 只有当这是最新的请求时才更新错误状态
        if (currentRequestId === requestIdRef.current) {
          setErr((e as ApiError).message);
        }
      } finally {
        // 只有当这是最新的请求时才清除刷新状态
        if (currentRequestId === requestIdRef.current) {
          setIsRefreshing(false);
        }
        setLoading(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    if (!isApiEnabled()) {
      setLoading(false);
      return;
    }
    if (rows.length === 0) {
      setLoading(true);
    }
    void load(false);
  }, [load]);

  const hasNonTerminal = rows.some((r) => isTaskPendingPoll(r.status));

  useEffect(() => {
    if (!hasNonTerminal) {
      setPollTimeout(false);
      return;
    }
    const t0 = Date.now();
    let isCancelled = false;

    const runPoll = async () => {
      if (isCancelled) return;
      if (Date.now() - t0 > POLL_MAX_MS) {
        setPollTimeout(true);
        return;
      }

      await load(true);

      if (!isCancelled) {
        const nextInterval = POLL_INTERVAL_MS * (1 + failCountRef.current);
        console.debug(
          '[Poll] Next interval: ' +
            nextInterval +
            'ms (failCount: ' +
            failCountRef.current +
            ')',
        );
        setTimeout(() => {
          if (!isCancelled) void runPoll();
        }, nextInterval);
      }
    };

    const timerId = setTimeout(() => {
      if (!isCancelled) void runPoll();
    }, POLL_INTERVAL_MS);

    return () => {
      isCancelled = true;
      clearTimeout(timerId);
    };
  }, [hasNonTerminal, load]);

  const retryViaRaw = async (rawId: string) => {
    if (!isApiEnabled()) return;
    setActionBusy(true);
    try {
      setErr(null);
      await rawApi.process(rawId, { force_retry: true });
      await load();
    } catch (e) {
      setErr((e as ApiError).message);
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className='mx-auto max-w-300 px-4 py-8'>
      <h1 className='text-2xl font-bold' onClick={() => nav('/tasks')}>
        {t('tasks.title')}
      </h1>
      <div className='mt-4 flex flex-wrap items-end gap-3'>
        <label className='flex flex-col text-sm gap-1'>
          <span>{t('raw.filterStatus')}</span>
          <select
            className='rounded-lg border border-[#E6ECE6] bg-white px-2 py-1.5 text-sm dark:border-[#2A4144] dark:bg-[#0F1A1A]'
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter((e.target.value as TaskStatus | '') || '')
            }>
            <option value=''>{t('raw.all')}</option>
            <option value='queued'>{t('taskStatus.queued')}</option>
            <option value='processing'>{t('taskStatus.processing')}</option>
            <option value='completed'>{t('taskStatus.completed')}</option>
            <option value='failed'>{t('taskStatus.failed')}</option>
          </select>
        </label>
        <button
          type='button'
          onClick={() => void load()}
          className='rounded-lg border border-[#2B8F80] px-3 py-1.5 text-sm text-[#2B8F80] flex items-center gap-2'>
          {isRefreshing && (
            <div className='h-3 w-3 animate-spin rounded-full border-2 border-[#2B8F80] border-t-transparent' />
          )}
          {t('common.refresh')}
        </button>
      </div>
      {pollTimeout && (
        <p className='mt-2 text-sm text-amber-800'>{t('raw.pollStopped')}</p>
      )}
      {err && <p className='mt-2 text-sm text-rose-600'>{err}</p>}
      {loading && (
        <div className='mt-8 flex justify-center' aria-label='loading'>
          <div className='h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-[#2B8F80]' />
        </div>
      )}
      <div className='mt-4 overflow-x-auto rounded-xl border border-[#E6ECE6] dark:border-[#2A4144]'>
        <table className='w-full min-w-200 text-left text-sm'>
          <thead>
            <tr className='border-b border-slate-200 dark:border-[#2A4144] bg-white/50 dark:bg-[#0F1A1A]'>
              <th className='p-2'>{t('tasks.type')}</th>
              <th className='p-2'>{t('raw.status')}</th>
              <th className='p-2'>{t('tasks.progress')}</th>
              <th className='p-2'>{t('raw.time')}</th>
              <th className='p-2' />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.task_id}
                className='border-b border-slate-100 last:border-0 dark:border-[#1a2c2c]'>
                <td className='p-2'>
                  <div className='font-medium'>
                    {t('taskType.' + r.task_type)}
                  </div>
                  <div className='text-xs text-slate-500 font-mono'>
                    {r.task_id}
                  </div>
                </td>
                <td className={clsx('p-2', statusClass(r.status))}>
                  {t('taskStatus.' + r.status)}
                </td>
                <td className='p-2'>
                  <div className='flex items-center gap-2'>
                    <div className='w-24 h-2 bg-slate-100 rounded-full overflow-hidden dark:bg-[#1a2c2c]'>
                      <div
                        className='h-full bg-[#2B8F80] transition-all duration-300'
                        style={{ width: r.progress_percent + '%' }}
                      />
                    </div>
                    <span>{r.progress_percent}%</span>
                  </div>
                  {r.current_step && (
                    <div className='text-[10px] text-slate-400 mt-1'>
                      {r.current_step}
                    </div>
                  )}
                </td>
                <td className='p-2 text-slate-500'>
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className='p-2'>
                  <button
                    type='button'
                    disabled={actionBusy || r.status !== 'failed'}
                    className='text-[#2B8F80] underline disabled:opacity-0'
                    onClick={() => void retryViaRaw(r.raw_id)}>
                    {t('raw.reprocess')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && (
          <p className='p-4 text-slate-500 text-center'>{t('raw.all')}</p>
        )}
      </div>
    </div>
  );
}
