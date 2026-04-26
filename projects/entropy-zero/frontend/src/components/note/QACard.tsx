import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Flashcard } from '@/types';

// TODO: Implement QACard
// Features:
// - Collapsible Q&A
// - Hidden answer by default
// - Smooth expand/collapse animation
// - Support for Markdown in question and answer

interface QACardProps {
  card: Flashcard;
  onRate?: (rating: 1 | 2 | 3 | 4) => void;
}

export default function QACard({ card, onRate }: QACardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className='bg-white rounded-xl border border-slate-200 overflow-hidden transition-all'>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors'>
        <h4 className='font-medium'>{card.question}</h4>
        {isOpen ? (
          <ChevronUp className='h-5 w-5 text-slate-400' />
        ) : (
          <ChevronDown className='h-5 w-5 text-slate-400' />
        )}
      </button>

      {isOpen && (
        <div className='px-4 pb-4 border-t border-slate-100'>
          <div className='prose prose-sm mt-3'>
            {/* TODO: Render Markdown */}
            <p className='text-slate-600'>{card.answer}</p>
          </div>

          {onRate && (
            <div className='flex gap-2 mt-4'>
              <button
                onClick={() => onRate(1)}
                className='px-3 py-1 text-sm rounded-lg bg-red-100 text-red-600 hover:bg-red-200'>
                忘记
              </button>
              <button
                onClick={() => onRate(2)}
                className='px-3 py-1 text-sm rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200'>
                困难
              </button>
              <button
                onClick={() => onRate(3)}
                className='px-3 py-1 text-sm rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200'>
                良好
              </button>
              <button
                onClick={() => onRate(4)}
                className='px-3 py-1 text-sm rounded-lg bg-green-100 text-green-600 hover:bg-green-200'>
                简单
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
