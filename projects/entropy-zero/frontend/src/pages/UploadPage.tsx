import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/contexts/I18nContext';
import rawApi from '@/lib/api/rawApi';
import { ApiError } from '@/lib/api/client';
import { isApiEnabled } from '@/lib/api/getAccessToken';

const MD_EXT = /\.md$/i;

export default function UploadPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const devToken = import.meta.env.VITE_DEV_ACCESS_TOKEN as string | undefined;
  const [file, setFile] = useState<File | null>(null);
  const [rawId, setRawId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [drag, setDrag] = useState(false);

  const validateFile = (f: File | null) => {
    if (!f) return t('upload.needMd');
    if (!MD_EXT.test(f.name)) {
      return t('upload.needMd');
    }
    return null;
  };

  const onFile = (f: File | null) => {
    setError(validateFile(f));
    setRawId(null);
    setStatus(null);
    setFile(f);
  };

  const upload = useCallback(async () => {
    setError(null);
    if (!isApiEnabled()) {
      setError(t('home.loadError'));
      return;
    }
    const err = validateFile(file);
    if (err) {
      setError(err);
      return;
    }
    if (!file) return;
    setBusy(true);
    setUploadPct(0);
    try {
      const data = await rawApi.uploadFile(file, (p) => setUploadPct(p));
      setRawId(data.raw_id);
      setStatus(data.status);
    } catch (e) {
      setError((e as ApiError).message || t('upload.errGeneric'));
    } finally {
      setBusy(false);
    }
  }, [file, t]);

  const startProcess = useCallback(async () => {
    if (!rawId) return;
    if (!isApiEnabled()) {
      setError(t('home.loadError'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await rawApi.process(rawId, { force_retry: false });
      setStatus(data.status);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }, [rawId, t]);

  return (
    <div className='min-h-[60vh] bg-[#F6F8F4] dark:bg-[#0B1213]'>
      <div className='max-w-[1200px] mx-auto px-4 py-8'>
        <h1 className='text-3xl font-bold mb-2 text-[#0F2A26] dark:text-[#E6F0EE]'>
          {t('upload.title')}
        </h1>
        <p className='text-sm text-slate-600 dark:text-slate-400 mb-8'>{t('upload.subtitle')}</p>
        {!user && !devToken && (
          <p className='mb-4 text-amber-700 dark:text-amber-400 text-sm'>{t('upload.needAuth')}</p>
        )}
        <div
          className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            drag
              ? 'border-[#2B8F80] bg-[#2B8F80]/5'
              : 'border-[#E6ECE6] dark:border-[#2A4144]'
          } bg-white dark:bg-[#0F1A1A]`}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files[0] ?? null;
            onFile(f);
          }}
        >
          <p className='text-slate-600 dark:text-slate-400'>{t('upload.dropHint')}</p>
          <label className='mt-4 inline-block'>
            <span className='cursor-pointer rounded-lg bg-[#2B8F80] px-4 py-2 text-sm text-white'>
              {t('upload.pickFile')}
            </span>
            <input
              type='file'
              accept='.md,text/markdown'
              className='hidden'
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {file && (
          <p className='mt-4 text-sm text-slate-600 font-mono'>
            {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}

        <div className='mt-4 flex flex-wrap gap-3'>
          <button
            type='button'
            onClick={() => void upload()}
            disabled={busy || !file}
            className='rounded-lg px-4 py-2 bg-[#2B8F80] text-white text-sm font-medium disabled:opacity-50'
          >
            {busy && uploadPct < 1 && uploadPct > 0
              ? t('upload.uploadProgress')
              : t('upload.uploadBtn')}
          </button>
          {busy && uploadPct > 0 && uploadPct < 1 && (
            <div
              className='h-2 flex-1 min-w-[120px] max-w-md rounded bg-slate-200 dark:bg-slate-700 self-center'
              aria-hidden
            >
              <div
                className='h-2 rounded bg-[#2B8F80] transition-all'
                style={{ width: `${Math.round(uploadPct * 100)}%` }}
              />
            </div>
          )}
          <button
            type='button'
            onClick={() => void startProcess()}
            disabled={busy || !rawId}
            className='rounded-lg px-4 py-2 border border-[#2B8F80] text-[#2B8F80] text-sm font-medium disabled:opacity-50'
          >
            {t('upload.startProcess')}
          </button>
        </div>
        {rawId && (
          <div className='mt-6 space-y-2 rounded-lg border border-[#E6ECE6] p-4 dark:border-[#2A4144]'>
            <p className='text-sm text-slate-700 dark:text-slate-300'>{t('upload.successRaw')}</p>
            <p className='font-mono text-sm'>{rawId}</p>
            {status && (
              <p className='text-sm text-[#2B8F80]'>
                {t('rawStatus.' + status)}
              </p>
            )}
            <Link
              to='/raw'
              className='inline-block rounded-md bg-[#2B8F80] px-3 py-1.5 text-sm text-white'
            >
              {t('upload.goRaw')}
            </Link>
          </div>
        )}
        {error && <p className='mt-4 text-sm text-rose-600 dark:text-rose-400'>{error}</p>}
      </div>
    </div>
  );
}
