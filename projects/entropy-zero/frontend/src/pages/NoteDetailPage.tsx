import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import notesApi from '@/lib/api/notesApi';
import PointCard from '@/components/note/PointCard';
import { useI18n } from '@/contexts/I18nContext';
import { ApiError } from '@/lib/api/client';
import { isApiEnabled } from '@/lib/api/getAccessToken';
import type { TocItem } from '@/components/note/MarkdownPointBody';
import type { Note, Point } from '@/types';

function TocList({
  points,
  tocByPoint,
  t,
}: {
  points: Point[];
  tocByPoint: Record<string, TocItem[]>;
  t: (k: string) => string;
}) {
  if (points.every((p) => !(tocByPoint[p.p_id]?.length)))
    return <p className='text-sm text-slate-500'>{t('noteDetail.tocEmpty')}</p>;
  return (
    <ol className='space-y-1 text-sm'>
      {points.flatMap((p) => {
        const items = tocByPoint[p.p_id] ?? [];
        return items.map((it) => (
          <li
            key={it.id}
            className={it.level === 2 ? 'font-medium' : 'ml-3 text-slate-600'}>
            <a
              className='text-[#2B8F80] hover:underline'
              href={`#${it.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(it.id)?.scrollIntoView({ behavior: 'smooth' });
              }}>
              {p.title} · {it.text}
            </a>
          </li>
        ));
      })}
    </ol>
  );
}

export default function NoteDetailPage() {
  const { id: noteId } = useParams();
  const { t } = useI18n();
  const [note, setNote] = useState<Note | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [load, setLoad] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [tocByPoint, setTocByPoint] = useState<Record<string, TocItem[]>>({});

  const handleToc = useCallback((pointKey: string, items: TocItem[]) => {
    setTocByPoint((prev) => ({ ...prev, [pointKey]: items }));
  }, []);

  const handleCopyErr = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const tmr = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(tmr);
  }, [toast]);

  useEffect(() => {
    if (!isApiEnabled() || !noteId) {
      setLoad(false);
      return;
    }
    void notesApi
      .get(noteId)
      .then(setNote)
      .catch((e) => setErr((e as ApiError).message))
      .finally(() => setLoad(false));
  }, [noteId]);

  const points = note?.content_json ?? [];
  const reviewHref = useMemo(() => {
    if (!noteId) return '/review';
    return `/review?scope=note&note_id=${encodeURIComponent(noteId)}`;
  }, [noteId]);

  if (!noteId) {
    return <p className='p-6'>{t('noteDetail.missingId')}</p>;
  }

  if (load) {
    return (
      <div className='mx-auto flex max-w-[1200px] items-center justify-center px-4 py-24'>
        <div className='h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-[#2B8F80]' />
      </div>
    );
  }

  if (err || !note) {
    return (
      <div className='mx-auto max-w-[1200px] px-4 py-8'>
        <p className='text-rose-600'>{err ?? t('noteDetail.loadError')}</p>
        <Link to='/notes' className='mt-4 inline-block text-[#2B8F80] hover:underline'>
          {t('noteDetail.backList')}
        </Link>
      </div>
    );
  }

  return (
    <div className='relative mx-auto max-w-[1200px] px-4 py-6'>
      {toast && (
        <div
          role='status'
          className='fixed bottom-4 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 shadow-lg dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-100'>
          {toast}
        </div>
      )}
      <div className='mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <Link
            to='/notes'
            className='text-sm text-slate-500 hover:text-[#2B8F80] hover:underline'>
            ← {t('noteDetail.backList')}
          </Link>
          <h1 className='mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100'>{note.title}</h1>
          {note.abstract ? <p className='mt-2 text-slate-600 dark:text-slate-400'>{note.abstract}</p> : null}
        </div>
        <div className='flex flex-wrap gap-2'>
          {note.tags?.map((x) => (
            <span
              key={x}
              className='inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300'>
              {x}
            </span>
          ))}
        </div>
      </div>

      {note.raw_id ? (
        <p className='mb-4 text-sm text-slate-500'>
          {t('noteDetail.fromRaw')}{' '}
          <Link
            to='/raw'
            className='text-[#2B8F80] hover:underline'>
            {t('noteDetail.openRawList')}
          </Link>
        </p>
      ) : null}

      <div className='lg:grid lg:grid-cols-[1fr_240px] lg:items-start lg:gap-8'>
        <div className='min-w-0 space-y-6'>
          <details className='rounded-lg border border-slate-200 p-3 lg:hidden dark:border-slate-700'>
            <summary className='cursor-pointer text-sm font-medium'>{t('noteDetail.tocTitle')}</summary>
            <div className='mt-3 max-h-48 overflow-y-auto'>
              <TocList points={points} tocByPoint={tocByPoint} t={t} />
            </div>
          </details>

          {points.map((p, i) => (
            <PointCard
              key={p.p_id}
              point={p}
              index={i}
              onCopyError={handleCopyErr}
              onTocPoint={handleToc}
            />
          ))}
        </div>

        <aside className='mt-8 hidden h-fit max-h-[calc(100vh-6rem)] space-y-5 overflow-y-auto rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700 lg:sticky lg:top-24 lg:mt-0 lg:block'>
          <p className='font-medium text-slate-800 dark:text-slate-100'>{t('noteDetail.sidebarStats')}</p>
          <p className='text-slate-600'>{t('noteDetail.cardCount').replace('%n', String(note.flashcards_count ?? 0))}</p>
          <div>
            <p className='mb-2 font-medium'>{t('noteDetail.tocTitle')}</p>
            <TocList points={points} tocByPoint={tocByPoint} t={t} />
          </div>
          <Link
            to={reviewHref}
            className='block w-full rounded-lg bg-[#2B8F80] py-2.5 text-center text-sm font-medium text-white transition hover:bg-[#247a6d]'>
            {t('noteDetail.enterReview')}
          </Link>
        </aside>
      </div>
    </div>
  );
}
