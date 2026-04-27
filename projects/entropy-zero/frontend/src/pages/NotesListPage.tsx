import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import notesApi from '@/lib/api/notesApi';
import { useI18n } from '@/contexts/I18nContext';
import { ApiError } from '@/lib/api/client';
import { isApiEnabled } from '@/lib/api/getAccessToken';

export default function NotesListPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<{ note_id: string; title: string; abstract: string; created_at: string }[]>([]);
  const [e, setE] = useState<string | null>(null);
  const [load, setLoad] = useState(true);
  useEffect(() => {
    if (!isApiEnabled()) {
      setLoad(false);
      return;
    }
    void notesApi
      .list(50)
      .then(setRows)
      .catch((err) => setE((err as ApiError).message))
      .finally(() => setLoad(false));
  }, []);
  return (
    <div className='mx-auto max-w-[1200px] px-4 py-8'>
      <h1 className='text-2xl font-bold'>{t('notes.title')}</h1>
      {load && (
        <div className='mt-8 flex justify-center'>
          <div className='h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-[#2B8F80]' />
        </div>
      )}
      {e && <p className='mt-4 text-rose-600'>{e}</p>}
      {!load && !e && rows.length === 0 && <p className='mt-4 text-slate-500'>{t('notes.empty')}</p>}
      <ul className='mt-6 space-y-2'>
        {rows.map((n) => (
          <li key={n.note_id} className='rounded-lg border border-[#E6ECE6] p-3 dark:border-[#2A4144]'>
            <Link
              to={'/notes/' + n.note_id}
              className='font-medium text-[#2B8F80] hover:underline'
            >
              {n.title || n.note_id}
            </Link>
            <p className='line-clamp-2 text-sm text-slate-500'>{n.abstract}</p>
            <p className='text-xs text-slate-400'>{new Date(n.created_at).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
