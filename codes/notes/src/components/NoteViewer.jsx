import React from 'react';
import {
  AlertCircle,
  Hash,
  Link,
  BrainCircuit,
  CheckCircle2,
} from 'lucide-react';
import HookItem from './HookItem';

export default function NoteViewer({ noteData, cardsData }) {
  const renderEvidence = (evidence) => {
    const styles = {
      reasoning:
        'bg-amber-100/40 dark:bg-amber-900/10 text-amber-800 dark:text-amber-200 border-amber-200/30',
      api: 'bg-blue-100/40 dark:bg-blue-900/10 text-blue-800 dark:text-blue-200 border-blue-200/30',
      code_example:
        'bg-emerald-100/40 dark:bg-emerald-900/10 text-emerald-800 dark:text-emerald-200 border-emerald-200/30',
    };
    return (
      <div
        className={`mt-1.5 p-2 rounded-lg border text-[11px] leading-relaxed ${styles[evidence.type] || styles.reasoning}`}>
        <span className='font-bold opacity-60 mr-1.5 uppercase'>
          {evidence.type.replace('_', ' ')}
        </span>
        {evidence.description}
      </div>
    );
  };

  return (
    <div className='max-w-[1400px] mx-auto p-4 md:p-6'>
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500'>
        {/* 左侧：核心逻辑拆解和关联复习卡 */}
        <div className='lg:col-span-8 space-y-6'>
          <div className='bg-white dark:bg-[#0F1A1A] p-6 rounded-2xl border border-slate-200 dark:border-[#163033] shadow-sm relative overflow-hidden'>
            <div className='absolute top-0 left-0 w-1.5 h-full bg-[#2B8F80]'></div>
            <h2 className='text-xl font-bold mb-4'>{noteData.title}</h2>
            <p className='text-sm opacity-70 leading-relaxed italic border-l-2 border-slate-100 dark:border-[#163033] pl-4 mb-6'>
              {noteData.abstract}
            </p>

            {/* 核心逻辑拆解 */}
            <div className='space-y-4'>
              <h3 className='text-xs font-bold uppercase tracking-widest text-[#2B8F80] flex items-center gap-2'>
                <Hash size={14} /> 核心逻辑拆解
              </h3>
              <div className='grid grid-cols-1 gap-3'>
                {noteData.content.core_claims.map((item, idx) => (
                  <div
                    key={idx}
                    className='bg-white dark:bg-[#0F1A1A] p-4 rounded-xl border border-slate-200 dark:border-[#163033] hover:shadow-md transition-all'>
                    <div className='flex gap-3'>
                      <span className='text-xs font-black text-[#2B8F80]/30'>
                        {idx + 1}
                      </span>
                      <div className='flex-1'>
                        <p className='text-sm font-bold mb-1 leading-snug'>
                          {item.claim}
                        </p>
                        {renderEvidence(item.evidence)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 关联复习卡 */}
          {cardsData && cardsData.cards && cardsData.cards.length > 0 && (
            <div className='space-y-4 border-t border-slate-200 dark:border-[#163033] pt-6'>
              <h3 className='text-xs font-bold uppercase tracking-widest text-[#5A5FB5] flex items-center gap-2'>
                <BrainCircuit size={14} /> 关联复习卡 (Q&A 视图)
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                {cardsData.cards.map((card, idx) => (
                  <div
                    key={idx}
                    className='bg-[#F1F6F4] dark:bg-[#081514] p-4 rounded-xl border border-[#E6ECE6] dark:border-[#163033]'>
                    <div className='text-[10px] font-bold text-[#2B8F80] mb-2 uppercase opacity-60 flex justify-between'>
                      <span>{card.type}</span>
                      <span>#{card.card_id.slice(-4)}</span>
                    </div>
                    <div className='text-xs font-bold mb-3 leading-relaxed'>
                      {card.question ||
                        card.template?.replace('__________', '____')}
                    </div>
                    <div className='bg-white dark:bg-[#0F1A1A] p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30'>
                      <div className='text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mb-1 flex items-center gap-1'>
                        <CheckCircle2 size={10} />
                        参考答案
                      </div>
                      <div className='text-xs font-bold text-emerald-700 dark:text-emerald-300'>
                        {card.answer}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右侧：反模式和知识语义图谱 */}
        <div className='lg:col-span-4 space-y-4'>
          {/* 反模式 */}
          {noteData.content.refinement?.anti_patterns &&
            noteData.content.refinement.anti_patterns.length > 0 && (
              <div className='bg-red-50/30 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20 p-5 rounded-2xl'>
                <h4 className='text-[10px] font-bold text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2'>
                  <AlertCircle size={14} /> 反模式
                </h4>
                <ul className='space-y-2'>
                  {noteData.content.refinement.anti_patterns.map((item, i) => (
                    <li key={i} className='text-xs opacity-80 flex gap-2'>
                      <span className='text-red-400 font-bold'>×</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* 知识语义图谱 (Hooks) */}
          {noteData.content.hooks && noteData.content.hooks.length > 0 && (
            <div className='space-y-4'>
              <h4 className='text-[10px] font-bold text-[#2B8F80] uppercase tracking-widest flex items-center gap-2 ml-2'>
                <Link size={14} /> 知识语义图谱 (Hooks)
              </h4>
              <div className='grid grid-cols-1 gap-2.5'>
                {noteData.content.hooks.map((hook, i) => (
                  <HookItem key={i} hook={hook} />
                ))}
              </div>
              <div className='p-3 bg-slate-100/50 dark:bg-[#163033]/30 rounded-xl text-[9px] text-slate-400 dark:text-slate-500 leading-tight'>
                💡
                提示：关联语义通过图标与色彩建立"森林地图"，帮你理解知识间的推导逻辑。
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
