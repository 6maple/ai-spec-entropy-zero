import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import cardsApi from '@/lib/api/cardsApi';
import type { Flashcard } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { ApiError } from '@/lib/api/client';
import { isApiEnabled } from '@/lib/api/getAccessToken';

type Scope = 'global' | 'note';

export default function ReviewPage() {
  const { t } = useI18n();
  const [sp] = useSearchParams();
  const scope = (sp.get('scope') as Scope) || 'global';
  const noteId = sp.get('note_id') || sp.get('noteId') || undefined;

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [load, setLoad] = useState(true);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadDue = useCallback(async () => {
    if (!isApiEnabled()) return;
    if (scope === 'note' && !noteId) {
      throw new ApiError(400, '本笔记模式需要提供 note_id 参数');
    }
    const list = await cardsApi.listDue({
      scope: scope === 'note' ? 'note' : 'global',
      noteId: scope === 'note' ? noteId : undefined,
    });
    setCards(list);
    setIdx(0);
    setRevealed(false);
  }, [scope, noteId]);

  useEffect(() => {
    if (!isApiEnabled()) {
      setLoad(false);
      return;
    }
    setLoad(true);
    void loadDue()
      .catch((e) => setErr((e as ApiError).message))
      .finally(() => setLoad(false));
  }, [loadDue]);

  useEffect(() => {
    if (!toast) return;
    const tmr = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(tmr);
  }, [toast]);

  const current = cards[idx] ?? null;

  const onRate = async (rating: 1 | 2 | 3 | 4) => {
    if (!current || submitting) return;
    setSubmitting(true);
    setErr(null);
    try {
      await cardsApi.submitReview(current.card_id, {
        rating,
        reviewed_at: new Date().toISOString(),
      });
      await loadDue();
    } catch (e) {
      setErr((e as ApiError).message);
      setToast((e as ApiError).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (load && cards.length === 0 && !err) {
    return (
      <div className='mx-auto flex max-w-[720px] items-center justify-center px-4 py-24'>
        <div className='h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-[#2B8F80]' />
      </div>
    );
  }

  return (
    <div className='relative mx-auto max-w-[720px] px-4 py-8'>
      {toast && (
        <div
          role='status'
          className='fixed bottom-4 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-900 shadow-lg dark:border-rose-900 dark:bg-rose-950/90 dark:text-rose-100'>
          {toast}
        </div>
      )}
      <div className='mb-6 flex flex-wrap items-center justify-between gap-2'>
        <h1 className='text-2xl font-bold'>{t('review.title')}</h1>
        <div className='text-sm text-slate-500'>
          {scope === 'note' && noteId ? t('review.scopeNote') : t('review.scopeGlobal')}
        </div>
      </div>
      {err && <p className='mb-4 text-rose-600'>{err}</p>}

      {!load && cards.length === 0 && (
        <div className='rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900/30'>
          <p className='text-slate-600'>{t('review.empty')}</p>
          <div className='mt-6 flex flex-wrap justify-center gap-3'>
            <Link
              to='/notes'
              className='inline-flex rounded-lg bg-[#2B8F80] px-4 py-2 text-sm font-medium text-white hover:bg-[#247a6d]'>
              {t('review.goNotes')}
            </Link>
            <Link
              to='/upload'
              className='inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800'>
              {t('review.goUpload')}
            </Link>
          </div>
        </div>
      )}

      {current && (
        <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/30'>
          <p className='text-xs text-slate-400'>
            {idx + 1} / {cards.length}
          </p>
          <p className='mt-4 text-lg font-medium text-slate-900 dark:text-slate-100'>{current.question}</p>
          {!revealed ? (
            <button
              type='button'
              onClick={() => setRevealed(true)}
              className='mt-6 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'>
              {t('review.showAnswer')}
            </button>
          ) : (
            <div className='mt-4 rounded-lg border border-emerald-100 bg-emerald-50/50 p-4 text-slate-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-slate-200'>
              {current.answer}
            </div>
          )}

          {revealed && (
            <div className='mt-6 flex flex-wrap gap-2'>
              {(
                [
                  [1, 'review.again'],
                  [2, 'review.hard'],
                  [3, 'review.good'],
                  [4, 'review.easy'],
                ] as const
              ).map(([val, key]) => (
                <button
                  key={val}
                  type='button'
                  disabled={submitting}
                  onClick={() => void onRate(val)}
                  className='min-w-[4.5rem] flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium hover:border-[#2B8F80] hover:text-[#2B8F80] disabled:opacity-50 dark:border-slate-600'>
                  {t(key)}
                </button>
              ))}
            </div>
          )}
          {submitting && <p className='mt-4 text-sm text-slate-500'>{t('review.submitting')}</p>}
        </div>
      )}
    </div>
  );
}
