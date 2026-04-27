import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import tasksApi, { type TaskListItem, type TaskStatus } from '@/lib/api/tasksApi';
import rawApi from '@/lib/api/rawApi';
import { useI18n } from '@/contexts/I18nContext';
import { ApiError } from '@/lib/api/client';
import { isApiEnabled } from '@/lib/api/getAccessToken';
import { POLL_INTERVAL_MS, POLL_MAX_MS, isTaskPendingPoll } from '@/constants/polling';
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
  const [selected, setSelected] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [pollTimeout, setPollTimeout] = useState(false);

  const load = useCallback(async () => {
    if (!isApiEnabled()) {
      setRows([]);
      return;
    }
    try {
      setErr(null);
      const r = await tasksApi.list({
        status: statusFilter || undefined,
        page: 1,
        pageSize: 50,
      });
      setRows(r);
    } catch (e) {
      setErr((e as ApiError).message);
    }
  }, [statusFilter]);

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

  const hasNonTerminal = rows.some((r) => isTaskPendingPoll(r.status));

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
    <div className='mx-auto max-w-[1200px] px-4 py-8'>
      <h1 className='text-2xl font-bold'>{t('tasks.title')}</h1>
      <div className='mt-4 flex flex-wrap items-end gap-3'>
        <label className='flex flex-col text-sm gap-1'>
          <span>{t('raw.filterStatus')}</span>
          <select
            className='rounded-lg border border-[#E6ECE6] bg-white px-2 py-1.5 text-sm dark:border-[#2A4144] dark:bg-[#0F1A1A]'
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target.value as TaskStatus | '') || '')}
          >
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
          className='rounded-lg border border-[#2B8F80] px-3 py-1.5 text-sm text-[#2B8F80]'
        >
          {t('common.refresh')}
        </button>
      </div>
      {pollTimeout && <p className='mt-2 text-sm text-amber-800'>{t('raw.pollStopped')}</p>}
      {err && <p className='mt-2 text-sm text-rose-600'>{err}</p>}
      {loading && (
        <div className='mt-8 flex justify-center' aria-label='loading'>
          <div className='h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-[#2B8F80]' />
        </div>
      )}
      <div className='mt-4 overflow-x-auto rounded-xl border border-[#E6ECE6] dark:border-[#2A4144]'>
        <table className='w-full min-w-[800px] text-left text-sm'>
          <thead>
            <tr className='border-b border-slate-200 dark:border-[#2A4144] bg-white/50 dark:bg-[#0F1A1A]'>
              <th className='p-2'>{t('tasks.type')}</th>
              <th className='p-2'>{t('tasks.status')}</th>
              <th className='p-2'>{t('tasks.step')}</th>
              <th className='p-2'>{t('tasks.progress')}</th>
              <th className='p-2'>{t('tasks.time')}</th>
              <th className='p-2' />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.task_id}
                className='border-b border-slate-100 last:border-0 dark:border-[#1a2c2c]'
              >
                <td className='p-2 font-mono text-xs'>{r.task_type}</td>
                <td className={clsx('p-2', statusClass(r.status))}>{t('taskStatus.' + r.status)}</td>
                <td className='p-2 text-slate-600'>{r.current_step}</td>
                <td className='p-2'>{r.progress_percent}%</td>
                <td className='p-2 text-slate-500'>{new Date(r.created_at).toLocaleString()}</td>
                <td className='p-2'>
                  <button
                    type='button'
                    className='text-[#2B8F80] underline'
                    onClick={() => setSelected(r.task_id)}
                  >
                    {t('tasks.openDetail')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && isApiEnabled() && (
          <p className='p-4 text-slate-500 text-center'>{t('raw.all')}</p>
        )}
      </div>

      {selected && (
        <TaskDetailDrawer
          taskId={selected}
          onClose={() => setSelected(null)}
          onRetryRaw={retryViaRaw}
          busy={actionBusy}
          nav={nav}
        />
      )}
    </div>
  );
}

function TaskDetailDrawer({
  taskId,
  onClose,
  onRetryRaw,
  busy,
  nav,
}: {
  taskId: string;
  onClose: () => void;
  onRetryRaw: (rawId: string) => Promise<void>;
  busy: boolean;
  nav: ReturnType<typeof useNavigate>;
}) {
  const { t } = useI18n();
  const [d, setD] = useState<Awaited<ReturnType<typeof tasksApi.get>> | null>(null);
  const [e, setE] = useState<string | null>(null);
  const load = useCallback(() => {
    if (!isApiEnabled()) return;
    void tasksApi
      .get(taskId)
      .then(setD)
      .catch((err) => setE((err as ApiError).message));
  }, [taskId]);
  useEffect(() => {
    load();
  }, [load]);
  const isPending = d && isTaskPendingPoll(d.status);
  useEffect(() => {
    if (!isPending) return;
    const id = window.setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isPending, load]);
  if (!isApiEnabled()) return null;
  return (
    <div className='fixed inset-0 z-50 flex justify-end' role='dialog'>
      <div className='absolute inset-0 bg-black/30' onClick={onClose} />
      <div className='relative z-10 flex h-full w-full max-w-md flex-col bg-white p-4 shadow-xl dark:bg-[#0F1A1A] overflow-y-auto'>
        <div className='mb-2 flex items-center justify-between'>
          <h2 className='font-semibold'>{t('tasks.detailTitle')}</h2>
          <button type='button' onClick={onClose} className='text-slate-500'>
            {t('common.close')}
          </button>
        </div>
        {e && <p className='text-sm text-rose-600'>{e}</p>}
        {d && (
          <div className='space-y-2 text-sm'>
            <p className='font-mono text-xs'>{d.task_id}</p>
            <p>
              {t('tasks.rawRef')}: <span className='font-mono'>{d.raw_id}</span>
            </p>
            <p className={statusClass(d.status)}>{t('taskStatus.' + d.status)}</p>
            <p>
              {d.current_step} · {d.progress_percent}%
            </p>
            {d.error_msg && <p className='text-rose-600'>{d.error_msg}</p>}
            {d.note_id && (
              <p>
                <button
                  type='button'
                  className='text-[#2B8F80] underline'
                  onClick={() => {
                    void nav('/notes/' + d.note_id);
                    onClose();
                  }}
                >
                  {t('tasks.openNote')}
                </button>
              </p>
            )}
            {d.status === 'failed' && (
              <button
                type='button'
                className='rounded-lg bg-[#2B8F80] px-3 py-2 text-white text-sm disabled:opacity-50'
                disabled={busy}
                onClick={() => void onRetryRaw(d.raw_id)}
              >
                {t('tasks.retryViaRaw')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
