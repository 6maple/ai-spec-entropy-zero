import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import notesApi from '@/lib/api/notesApi';
import { useI18n } from '@/contexts/I18nContext';
import { ApiError } from '@/lib/api/client';
import { isApiEnabled } from '@/lib/api/getAccessToken';
import type { Note } from '@/types';

export default function NotesListPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Note[]>([]);
  const [e, setE] = useState<string | null>(null);
  const [load, setLoad] = useState(true);
  const [tag, setTag] = useState('');
  const [keyword, setKeyword] = useState('');
  const [rawId, setRawId] = useState('');

  const runList = () => {
    if (!isApiEnabled()) {
      setLoad(false);
      return;
    }
    setLoad(true);
    setE(null);
    void notesApi
      .list({
        limit: 50,
        tag: tag.trim() || undefined,
        keyword: keyword.trim() || undefined,
        raw_id: rawId.trim() || undefined,
      })
      .then(setRows)
      .catch((err) => setE((err as ApiError).message))
      .finally(() => setLoad(false));
  };

  useEffect(() => {
    runList();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅首次挂载
  }, []);

  return (
    <div className='mx-auto max-w-[1200px] px-4 py-8'>
      <h1 className='text-2xl font-bold'>{t('notes.title')}</h1>

      <div className='mt-6 flex flex-wrap gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700'>
        <label className='flex flex-col text-sm'>
          <span className='text-slate-500'>{t('notes.filterTag')}</span>
          <input
            value={tag}
            onChange={(ev) => setTag(ev.target.value)}
            className='mt-1 rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-900'
          />
        </label>
        <label className='flex flex-col text-sm'>
          <span className='text-slate-500'>{t('notes.filterKeyword')}</span>
          <input
            value={keyword}
            onChange={(ev) => setKeyword(ev.target.value)}
            className='mt-1 rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-900'
          />
        </label>
        <label className='flex flex-col text-sm'>
          <span className='text-slate-500'>{t('notes.filterRaw')}</span>
          <input
            value={rawId}
            onChange={(ev) => setRawId(ev.target.value)}
            className='mt-1 min-w-[200px] rounded border border-slate-300 px-2 py-1 font-mono text-xs dark:border-slate-600 dark:bg-slate-900'
          />
        </label>
        <div className='flex items-end gap-2'>
          <button
            type='button'
            onClick={runList}
            className='rounded-lg bg-[#2B8F80] px-4 py-2 text-sm font-medium text-white hover:bg-[#247a6d]'>
            {t('notes.search')}
          </button>
          <button
            type='button'
            onClick={() => {
              setTag('');
              setKeyword('');
              setRawId('');
              setLoad(true);
              if (isApiEnabled()) {
                void notesApi
                  .list({ limit: 50 })
                  .then(setRows)
                  .catch((err) => setE((err as ApiError).message))
                  .finally(() => setLoad(false));
              }
            }}
            className='rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800'>
            {t('notes.clear')}
          </button>
        </div>
      </div>

      {load && (
        <div className='mt-8 flex justify-center'>
          <div className='h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-[#2B8F80]' />
        </div>
      )}
      {e && <p className='mt-4 text-rose-600'>{e}</p>}
      {!load && !e && rows.length === 0 && (
        <div className='mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-600'>
          <p className='text-slate-600'>{t('notes.empty')}</p>
          <p className='mt-2 text-sm text-slate-500'>{t('notes.emptyCta')}</p>
          <div className='mt-6 flex flex-wrap justify-center gap-3'>
            <Link
              to='/upload'
              className='inline-flex rounded-lg bg-[#2B8F80] px-4 py-2 text-sm font-medium text-white hover:bg-[#247a6d]'>
              {t('notes.goUpload')}
            </Link>
            <Link
              to='/raw'
              className='inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800'>
              {t('notes.goRaw')}
            </Link>
          </div>
        </div>
      )}
      <ul className='mt-6 space-y-2'>
        {rows.map((n) => (
          <li
            key={n.note_id}
            className='rounded-lg border border-[#E6ECE6] p-3 dark:border-[#2A4144]'>
            <Link
              to={'/notes/' + n.note_id}
              className='font-medium text-[#2B8F80] hover:underline'>
              {n.title || n.note_id}
            </Link>
            {n.meta_tag &&
              (n.meta_tag.domain ||
                (n.meta_tag.topics && n.meta_tag.topics.length > 0)) ? (
              <div className='mt-1 flex flex-wrap gap-1.5'>
                <span className='text-xs text-slate-500'>{t('notes.metaTag')}：</span>
                {n.meta_tag.domain ? (
                  <span className='rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'>
                    {n.meta_tag.domain}
                  </span>
                ) : null}
                {(n.meta_tag.topics ?? []).map((topic) => (
                  <span
                    key={topic}
                    className='rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300'>
                    {topic}
                  </span>
                ))}
              </div>
            ) : null}
            <p className='line-clamp-2 text-sm text-slate-500'>{n.abstract}</p>
            <p className='text-xs text-slate-400'>{new Date(n.created_at).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
