import { useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import type { Components } from 'react-markdown';
import { markdownSanitizeSchema } from '@/lib/markdown/sanitizeSchema';
import CodeBlock from '@/components/note/CodeBlock';

export type TocItem = { level: 2 | 3; text: string; id: string };

function buildToc(body: string, base: string): TocItem[] {
  const items: TocItem[] = [];
  let i = 0;
  for (const line of body.split('\n')) {
    const t = line.trim();
    const m = /^(#{2,3})\s+(.+)$/.exec(t);
    if (!m) continue;
    const level = (m[1].length === 2 ? 2 : 3) as 2 | 3;
    items.push({ level, text: m[2].trim(), id: `${base}-h-${i++}` });
  }
  return items;
}

export function extractTocFromBody(body: string, pointKey: string): TocItem[] {
  return buildToc(body, `p-${pointKey}`);
}

type MarkdownPointBodyProps = {
  body: string;
  pointKey: string;
  onToc?: (items: TocItem[]) => void;
  onCopyError?: (msg: string) => void;
};

export default function MarkdownPointBody({
  body,
  pointKey,
  onToc,
  onCopyError,
}: MarkdownPointBodyProps) {
  const toc = useMemo(() => buildToc(body, `p-${pointKey}`), [body, pointKey]);
  const headIdx = useRef(0);

  useEffect(() => {
    onToc?.(toc);
  }, [toc, onToc]);

  const mdComponents: Components = useMemo(
    () => ({
      h2: ({ children }) => {
        const t = toc[headIdx.current];
        if (t && t.level === 2) {
          const id = t.id;
          headIdx.current += 1;
          return (
            <h2
              id={id}
              className='mt-6 scroll-mt-24 text-xl font-semibold text-slate-900 dark:text-slate-100'>
              {children}
            </h2>
          );
        }
        return (
          <h2 className='mt-6 text-xl font-semibold text-slate-900 dark:text-slate-100'>{children}</h2>
        );
      },
      h3: ({ children }) => {
        const t = toc[headIdx.current];
        if (t && t.level === 3) {
          const id = t.id;
          headIdx.current += 1;
          return (
            <h3
              id={id}
              className='mt-4 scroll-mt-24 text-lg font-semibold text-slate-800 dark:text-slate-200'>
              {children}
            </h3>
          );
        }
        return (
          <h3 className='mt-4 text-lg font-semibold text-slate-800 dark:text-slate-200'>{children}</h3>
        );
      },
      p: ({ children }) => <p className='my-2 leading-relaxed text-slate-600 dark:text-slate-300'>{children}</p>,
      ul: ({ children }) => <ul className='my-2 list-disc pl-6 text-slate-600'>{children}</ul>,
      ol: ({ children }) => <ol className='my-2 list-decimal pl-6 text-slate-600'>{children}</ol>,
      li: ({ children }) => <li className='my-0.5'>{children}</li>,
      blockquote: ({ children }) => (
        <blockquote className='border-l-4 border-emerald-200 pl-4 italic text-slate-600'>{children}</blockquote>
      ),
      a: ({ href, children }) => (
        <a href={href} className='text-[#2B8F80] underline hover:opacity-90' target='_blank' rel='noreferrer noopener'>
          {children}
        </a>
      ),
      code: (props) => {
        const { className, children } = props;
        const inline = 'inline' in props && (props as { inline?: boolean }).inline;
        if (inline) {
          return (
            <code className='rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-rose-700 dark:bg-slate-800 dark:text-rose-300'>
              {children}
            </code>
          );
        }
        const code = String(children ?? '').replace(/\n$/, '');
        const lang = /language-(\w+)/.exec(className || '')?.[1] ?? 'text';
        return <CodeBlock code={code} language={lang} onCopyError={onCopyError} />;
      },
    }),
    [onCopyError, toc],
  );

  headIdx.current = 0;
  return (
    <div className='markdown-point'>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, markdownSanitizeSchema]]}
        components={mdComponents}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
