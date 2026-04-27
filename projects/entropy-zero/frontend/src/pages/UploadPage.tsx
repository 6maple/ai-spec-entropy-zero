import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

export default function UploadPage() {
  const { user } = useAuth();
  const devToken = import.meta.env.VITE_DEV_ACCESS_TOKEN as string | undefined;

  const [file, setFile] = useState<File | null>(null);
  const [rawId, setRawId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const bearer = async (): Promise<string | null> => {
    if (devToken && import.meta.env.DEV) return devToken;
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };

  const upload = useCallback(async () => {
    setError(null);
    if (!file) {
      setError('请选择 .md 文件');
      return;
    }
    const token = await bearer();
    if (!token) {
      setError('未登录：请在开发环境配置 VITE_DEV_ACCESS_TOKEN 或使用 Supabase 登录');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/raw/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((j as { detail?: string }).detail ?? `上传失败 (${res.status})`);
        return;
      }
      const data = j as { raw_id: string; status: string };
      setRawId(data.raw_id);
      setStatus(data.status);
    } finally {
      setBusy(false);
    }
  }, [file]);

  const processRaw = useCallback(async () => {
    if (!rawId) return;
    setError(null);
    const token = await bearer();
    if (!token) {
      setError('未登录');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/raw/${rawId}/process`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force_retry: false }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((j as { detail?: string }).detail ?? `处理请求失败 (${res.status})`);
        return;
      }
      const data = j as { task_id: string; status: string };
      setTaskId(data.task_id);
      setStatus(data.status);
    } finally {
      setBusy(false);
    }
  }, [rawId]);

  const poll = useCallback(async () => {
    if (!rawId) return;
    const token = await bearer();
    if (!token) return;
    const res = await fetch(`${API_BASE}/raw/${rawId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const row = (await res.json()) as { status: string };
    setStatus(row.status);
  }, [rawId]);

  return (
    <div className='min-h-screen bg-[#F6F8F4] dark:bg-[#0B1213]'>
      <div className='max-w-[1200px] mx-auto px-4 py-8'>
        <h1 className='text-3xl font-bold mb-2 text-[#0F2A26] dark:text-[#E6F0EE]'>
          上传知识文件
        </h1>
        <p className='text-sm text-slate-600 dark:text-slate-400 mb-8'>
          仅支持 UTF-8 编码的 Markdown 文件（multipart 上传）
        </p>

        {!user && !devToken && (
          <p className='mb-4 text-amber-700 dark:text-amber-400 text-sm'>
            未检测到登录会话。本地开发可在{' '}
            <code className='text-xs'>frontend/.env.development.local</code> 中设置{' '}
            <code className='text-xs'>VITE_DEV_ACCESS_TOKEN</code>（与后端{' '}
            <code className='text-xs'>DEV_JWT_SECRET</code> 配套）。
            <Link
              to='/auth/login'
              className='ml-2 text-[#2B8F80] underline'
            >
              前往登录
            </Link>
          </p>
        )}

        <div className='rounded-xl border border-[#E6ECE6] dark:border-[#2A4144] bg-white dark:bg-[#0F1A1A] p-6 space-y-4'>
          <input
            type='file'
            accept='.md,text/markdown'
            className='block text-sm text-[#0F2A26] dark:text-[#E6F0EE]'
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <div className='flex flex-wrap gap-3'>
            <button
              type='button'
              onClick={() => void upload()}
              disabled={busy}
              className='rounded-lg px-4 py-2 bg-[#2B8F80] text-white text-sm font-medium disabled:opacity-50'
            >
              {busy ? '请稍候…' : '上传'}
            </button>
            <button
              type='button'
              onClick={() => void processRaw()}
              disabled={busy || !rawId}
              className='rounded-lg px-4 py-2 border border-[#2B8F80] text-[#2B8F80] text-sm font-medium disabled:opacity-50 dark:text-[#2B8F80]'
            >
              开始处理
            </button>
            <button
              type='button'
              onClick={() => void poll()}
              disabled={!rawId}
              className='rounded-lg px-4 py-2 border border-slate-300 dark:border-[#2A4144] text-sm text-[#0F2A26] dark:text-[#E6F0EE]'
            >
              刷新状态
            </button>
          </div>

          {rawId && (
            <p className='text-sm text-slate-700 dark:text-slate-300'>
              raw_id: <span className='font-mono'>{rawId}</span>
            </p>
          )}
          {taskId && (
            <p className='text-sm text-slate-700 dark:text-slate-300'>
              task_id: <span className='font-mono'>{taskId}</span>
            </p>
          )}
          {status && (
            <p className='text-sm text-slate-700 dark:text-slate-300'>
              状态: <span className='font-semibold text-[#2B8F80]'>{status}</span>
            </p>
          )}
          {error && (
            <p className='text-sm text-rose-600 dark:text-rose-400'>{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
