import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  RotateCcw,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import HookItem from './HookItem';
import MarkdownContent from './MarkdownContent';

export default function CardPlayer({ cardsData, noteData }) {
  const [activeCard, setActiveCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const cards = cardsData.cards || [];
  const currentCard = cards[activeCard];

  if (!currentCard) {
    return (
      <div className='max-w-xl mx-auto p-6 text-center'>
        <p className='text-gray-500'>暂无复习卡</p>
      </div>
    );
  }

  const handleNext = () => {
    setShowAnswer(false);
    setActiveCard((prev) => (prev + 1) % cards.length);
  };

  return (
    <div className='max-w-xl mx-auto py-2 animate-in zoom-in-95 duration-300'>
      {/* 进度指示 */}
      <div className='flex items-center justify-between mb-3 px-2'>
        <span className='text-[9px] font-bold opacity-30 uppercase tracking-[0.2em]'>
          Self-Testing Mode
        </span>
        <div className='flex items-center gap-1'>
          {cards.map((_, i) => (
            <div
              key={i}
              className={`w-5 h-0.5 rounded-full ${
                i === activeCard
                  ? 'bg-[#2B8F80]'
                  : 'bg-slate-200 dark:bg-[#163033]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 卡片容器 */}
      <div className='bg-white dark:bg-[#0F1A1A] rounded-2xl border border-slate-200 dark:border-[#163033] shadow-lg flex flex-col overflow-hidden'>
        {/* 卡片头部 */}
        <div className='px-4 py-2 border-b border-slate-50 dark:border-[#163033] flex justify-between items-center bg-slate-50/40 dark:bg-[#163033]/20'>
          <span className='text-[9px] font-bold px-2 py-0.5 rounded bg-[#5A5FB5] text-white uppercase'>
            {currentCard.type}
          </span>
          <span className='text-[9px] opacity-30'>
            {activeCard + 1} / {cards.length}
          </span>
        </div>

        {/* 卡片内容 */}
        <div className='px-6 py-8 flex flex-col justify-center text-center'>
          <div className='text-left mb-4'>
            <MarkdownContent
              content={currentCard.question || '补全代码：'}
              className='text-lg font-bold leading-tight text-slate-800 dark:text-[#E6F0EE] prose prose-sm dark:prose-invert max-w-none'
            />
          </div>

          {(currentCard.template || currentCard.code_snippet) && (
            <div className='bg-slate-900 text-slate-300 p-4 rounded-xl text-[12px] font-mono text-left mb-4 border border-white/5 leading-relaxed'>
              {currentCard.template || currentCard.code_snippet}
            </div>
          )}

          {showAnswer && (
            <div className='space-y-4 animate-in slide-in-from-bottom-2 duration-400'>
              <div className='inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-lg border border-emerald-100 dark:border-emerald-800/30'>
                <CheckCircle2 size={16} />
                <MarkdownContent
                  content={currentCard.answer || ''}
                  className='text-sm font-bold prose prose-sm dark:prose-invert max-w-none'
                />
              </div>
              <p className='text-[10px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed italic'>
                {currentCard.explanation}
              </p>

              {/* 关联语义节点 */}
              {noteData &&
                noteData.content.hooks &&
                currentCard.hook_index !== undefined &&
                noteData.content.hooks[currentCard.hook_index] && (
                  <div className='pt-4 border-t border-slate-100 dark:border-[#163033]'>
                    <p className='text-[9px] font-black uppercase tracking-widest opacity-20 mb-2'>
                      关联语义节点 (Memory Link)
                    </p>
                    <div className='text-left'>
                      <HookItem
                        hook={noteData.content.hooks[currentCard.hook_index]}
                        compact
                      />
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className='p-3 bg-slate-50/50 dark:bg-[#163033]/20 border-t border-slate-100 dark:border-[#163033]'>
          {!showAnswer ? (
            <button
              onClick={() => setShowAnswer(true)}
              className='w-full py-2.5 bg-[#2B8F80] hover:bg-[#196B5E] text-white rounded-lg font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 text-xs'>
              <Eye size={14} /> 显示答案与语义关联
            </button>
          ) : (
            <div className='flex gap-2'>
              <button
                onClick={handleNext}
                className='flex-1 py-2.5 bg-slate-900 dark:bg-[#2B8F80] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-transform'>
                下一步 <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setShowAnswer(false)}
                className='px-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-400'>
                <RotateCcw size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 底部提示 */}
      <div className='mt-4 text-center'>
        <p className='text-[10px] uppercase font-bold tracking-[0.2em] opacity-10 flex items-center justify-center gap-2'>
          <EyeOff size={10} /> Active Recall with Semantic Anchors
        </p>
      </div>
    </div>
  );
}
