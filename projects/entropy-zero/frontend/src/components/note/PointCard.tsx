import { useCallback } from 'react';
import type { Point } from '@/types';
import MarkdownPointBody, { type TocItem } from '@/components/note/MarkdownPointBody';

interface PointCardProps {
  point: Point;
  index: number;
  onCopyError?: (msg: string) => void;
  onTocPoint?: (pointKey: string, items: TocItem[]) => void;
}

export default function PointCard({ point, index, onCopyError, onTocPoint }: PointCardProps) {
  const handleToc = useCallback(
    (items: TocItem[]) => {
      onTocPoint?.(point.p_id, items);
    },
    [point.p_id, onTocPoint],
  );

  return (
    <div className='relative rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-emerald-200 dark:border-slate-700 dark:bg-slate-900/30'>
      <div className='absolute right-4 top-4 pointer-events-none text-6xl font-bold text-slate-100 dark:text-slate-800'>
        {String(index + 1).padStart(2, '0')}
      </div>
      <div className='relative z-10'>
        <div className='mb-3 inline-flex h-6 items-center justify-center rounded-lg bg-emerald-100 px-3 text-xs font-semibold text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300'>
          {String(index + 1).padStart(2, '0')}
        </div>
        <h3 className='mb-3 text-xl font-semibold'>{point.title}</h3>
        <div className='prose-slate max-w-none'>
          <MarkdownPointBody
            body={point.body}
            pointKey={point.p_id}
            onCopyError={onCopyError}
            onToc={handleToc}
          />
        </div>
      </div>
    </div>
  );
}
