import type { Point } from '@/types';

// TODO: Implement PointCard
// Features:
// - Sequence badge (01, 02, etc.)
// - Title and body (Markdown)
// - Code block support
// - Hover effects (border color change)
// - Watermark sequence number

interface PointCardProps {
  point: Point;
  index: number;
}

export default function PointCard({ point, index }: PointCardProps) {
  return (
    <div className='relative bg-white rounded-2xl border border-slate-200 p-6 transition-all hover:border-emerald-200'>
      <div className='absolute top-4 right-4 text-6xl font-bold text-slate-100 pointer-events-none'>
        {String(index + 1).padStart(2, '0')}
      </div>
      <div className='relative z-10'>
        <div className='inline-flex items-center justify-center h-6 px-3 rounded-lg bg-emerald-100 text-emerald-600 text-xs font-semibold mb-3'>
          {String(index + 1).padStart(2, '0')}
        </div>
        <h3 className='text-xl font-semibold mb-3'>{point.title}</h3>
        <div className='prose prose-slate max-w-none'>
          {/* TODO: Render Markdown */}
          <p className='text-slate-600'>{point.body}</p>
        </div>
      </div>
    </div>
  );
}
