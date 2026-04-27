import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import type { Components } from 'react-markdown';
import { markdownSanitizeSchema } from '@/lib/markdown/sanitizeSchema';
import CodeBlock from '@/components/note/CodeBlock';
import rawApi from '@/lib/api/rawApi';
import { useI18n } from '@/contexts/I18nContext';
import { ApiError } from '@/lib/api/client';
import { isApiEnabled } from '@/lib/api/getAccessToken';
import { clsx } from 'clsx';

function statusClass(s: string) {
  if (s === 'processed' || s === 'completed') return 'text-[#2B8F80]';
  if (s === 'failed') return 'text-rose-600 dark:text-rose-400';
  return 'text-amber-700 dark:text-amber-300';
}

export default function RawDetailPage() {
  const { id: rawId } = useParams();
  const { t } = useI18n();
  const [detail, setDetail] = useState<Awaited<
    ReturnType<typeof rawApi.get>
  > | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const handleCopyErr = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const tmr = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(tmr);
  }, [toast]);

  useEffect(() => {
    if (!isApiEnabled() || !rawId) {
      setLoading(false);
      return;
    }
    void rawApi
      .get(rawId)
      .then(setDetail)
      .catch((e) => setErr((e as ApiError).message))
      .finally(() => setLoading(false));
  }, [rawId]);

  const mdComponents: Components = {
    h1: ({ children }) => (
      <h1 className='mt-8 text-3xl font-bold text-slate-900 dark:text-slate-100'>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className='mt-6 text-2xl font-semibold text-slate-900 dark:text-slate-100'>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className='mt-4 text-xl font-semibold text-slate-800 dark:text-slate-200'>
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className='mt-3 text-lg font-semibold text-slate-800 dark:text-slate-200'>
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p className='my-3 leading-relaxed text-slate-700 dark:text-slate-300'>
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className='my-3 list-disc pl-6 text-slate-700 dark:text-slate-300'>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className='my-3 list-decimal pl-6 text-slate-700 dark:text-slate-300'>
        {children}
      </ol>
    ),
    li: ({ children }) => <li className='my-1'>{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className='my-3 border-l-4 border-emerald-200 pl-4 italic text-slate-600 dark:border-emerald-800 dark:text-slate-400'>
        {children}
      </blockquote>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        className='text-[#2B8F80] underline hover:opacity-90'
        target='_blank'
        rel='noreferrer noopener'>
        {children}
      </a>
    ),
    code: (props) => {
      const { className, children } = props;
      const inline =
        'inline' in props && (props as { inline?: boolean }).inline;
      if (inline) {
        return (
          <code className='rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-rose-700 dark:bg-slate-800 dark:text-rose-300'>
            {children}
          </code>
        );
      }
      const code = String(children ?? '').replace(/\n$/, '');
      const lang = /language-(\w+)/.exec(className || '')?.[1] ?? 'text';
      return (
        <CodeBlock code={code} language={lang} onCopyError={handleCopyErr} />
      );
    },
    hr: () => <hr className='my-6 border-slate-200 dark:border-slate-700' />,
    table: ({ children }) => (
      <div className='my-4 overflow-x-auto'>
        <table className='min-w-full divide-y divide-slate-200 dark:divide-slate-700'>
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className='bg-slate-50 dark:bg-slate-800'>{children}</thead>
    ),
    tbody: ({ children }) => (
      <tbody className='divide-y divide-slate-200 dark:divide-slate-700'>
        {children}
      </tbody>
    ),
    tr: ({ children }) => <tr>{children}</tr>,
    th: ({ children }) => (
      <th className='px-4 py-2 text-left text-sm font-semibold text-slate-900 dark:text-slate-100'>
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className='px-4 py-2 text-sm text-slate-700 dark:text-slate-300'>
        {children}
      </td>
    ),
  };

  if (!rawId) {
    return <p className='p-6'>{t('raw.missingId')}</p>;
  }

  if (loading) {
    return (
      <div className='mx-auto flex max-w-[1200px] items-center justify-center px-4 py-24'>
        <div className='h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-[#2B8F80]' />
      </div>
    );
  }

  if (err || !detail) {
    return (
      <div className='mx-auto max-w-[1200px] px-4 py-8'>
        <p className='text-rose-600'>{err ?? t('raw.loadError')}</p>
        <Link
          to='/raw'
          className='mt-4 inline-block text-[#2B8F80] hover:underline'>
          {t('raw.backList')}
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

      <div className='mb-6'>
        <Link
          to='/raw'
          className='text-sm text-slate-500 hover:text-[#2B8F80] hover:underline'>
          ← {t('raw.backList')}
        </Link>
        <div className='mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-slate-900 dark:text-slate-100'>
              {detail.file_name}
            </h1>
            <div className='mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400'>
              <span className={clsx('font-medium', statusClass(detail.status))}>
                {t('rawStatus.' + detail.status)}
              </span>
              <span>·</span>
              <span>{new Date(detail.created_at).toLocaleString()}</span>
            </div>
          </div>

          <div className='flex flex-col gap-2 text-sm'>
            <div className='flex gap-4'>
              <span className='text-slate-600 dark:text-slate-400'>
                {t('raw.noteCount')}:{' '}
                <span className='font-semibold text-[#2B8F80]'>
                  {detail.notes_count}
                </span>
              </span>
              <span className='text-slate-600 dark:text-slate-400'>
                {t('raw.cardCount')}:{' '}
                <span className='font-semibold text-[#2B8F80]'>
                  {detail.flashcards_count}
                </span>
              </span>
            </div>
            {detail.notes_count > 0 && (
              <Link
                to='/notes'
                className='text-center rounded-lg border border-[#2B8F80] px-3 py-1.5 text-[#2B8F80] hover:bg-[#2B8F80]/5'>
                {t('nav.notes')}
              </Link>
            )}
          </div>
        </div>

        {detail.error_summary && (
          <div className='mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200'>
            {detail.error_summary}
          </div>
        )}
      </div>

      <div className='rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-[#0F1A1A] lg:p-8'>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[[rehypeSanitize, markdownSanitizeSchema]]}
          components={mdComponents}>
          {detail.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
