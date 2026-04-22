import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  RotateCcw,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

export default function CardPlayer({ cardsData }) {
  const [activeCard, setActiveCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const cards = cardsData.cards || [];
  const currentCard = cards[activeCard];

  if (!currentCard) {
    return (
      <div className='max-w-[800px] mx-auto p-6 text-center'>
        <p className='text-gray-500'>暂无复习卡</p>
      </div>
    );
  }

  const handleNext = () => {
    setShowAnswer(false);
    setActiveCard((prev) => (prev + 1) % cards.length);
  };

  const handleReset = () => {
    setActiveCard(0);
    setShowAnswer(false);
  };

  const renderCardContent = () => {
    switch (currentCard.type) {
      case 'qa':
      case '问答题':
        return (
          <div>
            <div className='mb-4'>
              <div className='text-xs font-bold text-blue-600 dark:text-blue-400 mb-2 uppercase'>
                Question
              </div>
              <p className='text-base leading-relaxed'>
                {currentCard.question}
              </p>
            </div>
            {showAnswer && (
              <div className='bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg p-4'>
                <div className='text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-2 uppercase'>
                  Answer
                </div>
                <p className='text-sm mb-3 font-medium'>{currentCard.answer}</p>
                {currentCard.explanation && (
                  <p className='text-xs opacity-70 leading-relaxed'>
                    <span className='font-bold'>解析：</span>
                    {currentCard.explanation}
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 'fill_in_blank':
      case '填空题':
        return (
          <div>
            <div className='mb-4'>
              <div className='text-xs font-bold text-amber-600 dark:text-amber-400 mb-2 uppercase'>
                Fill in the Blank
              </div>
              <pre className='text-sm leading-relaxed whitespace-pre-wrap font-mono bg-slate-100 dark:bg-slate-800 p-3 rounded'>
                {currentCard.template}
              </pre>
            </div>
            {showAnswer && (
              <div className='bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg p-4'>
                <div className='text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-2 uppercase'>
                  Answer
                </div>
                <p className='text-sm mb-3 font-bold font-mono'>
                  {currentCard.answer}
                </p>
                {currentCard.explanation && (
                  <p className='text-xs opacity-70 leading-relaxed'>
                    <span className='font-bold'>解析：</span>
                    {currentCard.explanation}
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 'error_correction':
      case '找错题':
        return (
          <div>
            <div className='mb-4'>
              <div className='text-xs font-bold text-rose-600 dark:text-rose-400 mb-2 uppercase'>
                Find the Error
              </div>
              <pre className='text-sm leading-relaxed whitespace-pre-wrap font-mono bg-slate-100 dark:bg-slate-800 p-3 rounded mb-3'>
                {currentCard.code_snippet}
              </pre>
              <p className='text-sm'>{currentCard.question}</p>
            </div>
            {showAnswer && (
              <div className='bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg p-4'>
                <div className='text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-2 uppercase'>
                  Answer
                </div>
                <p className='text-sm mb-3 font-medium'>{currentCard.answer}</p>
                {currentCard.explanation && (
                  <p className='text-xs opacity-70 leading-relaxed'>
                    <span className='font-bold'>解析：</span>
                    {currentCard.explanation}
                  </p>
                )}
              </div>
            )}
          </div>
        );

      default:
        return <p>未知卡片类型</p>;
    }
  };

  return (
    <div className='max-w-[800px] mx-auto p-6'>
      {/* 进度指示 */}
      <div className='mb-4 flex items-center justify-between'>
        <div className='text-sm opacity-60'>
          卡片 {activeCard + 1} / {cards.length}
        </div>
        <div className='flex gap-2'>
          <button
            onClick={handleReset}
            className='p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors'>
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* 卡片内容 */}
      <div className='bg-white dark:bg-[#163033] border border-slate-200 dark:border-[#2A4144] rounded-xl p-6 shadow-lg mb-4'>
        {renderCardContent()}
      </div>

      {/* 操作按钮 */}
      <div className='flex gap-3'>
        <button
          onClick={() => setShowAnswer(!showAnswer)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
            showAnswer
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              : 'bg-[#2B8F80] text-white hover:bg-[#247567] shadow-md'
          }`}>
          {showAnswer ? <EyeOff size={18} /> : <Eye size={18} />}
          {showAnswer ? '隐藏答案' : '显示答案'}
        </button>
        {showAnswer && (
          <button
            onClick={handleNext}
            className='flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-bold text-sm bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-md'>
            {activeCard === cards.length - 1 ? (
              <>
                <CheckCircle2 size={18} />
                完成
              </>
            ) : (
              <>
                下一张
                <ChevronRight size={18} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
