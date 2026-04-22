import React from 'react';
import { AlertCircle, Hash, Link } from 'lucide-react';
import HookItem from './HookItem';

export default function NoteViewer({ noteData }) {
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
    <div className='max-w-[1200px] mx-auto p-6'>
      {/* 标题部分 */}
      <div className='mb-6'>
        <div className='flex items-center gap-2 mb-2 opacity-60 text-xs'>
          <Hash size={14} />
          <span>{noteData.id}</span>
        </div>
        <h2 className='text-2xl font-bold mb-3'>{noteData.title}</h2>
        <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4'>
          <div className='flex items-start gap-2'>
            <AlertCircle
              size={16}
              className='text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0'
            />
            <p className='text-sm leading-relaxed text-blue-900 dark:text-blue-100'>
              {noteData.abstract}
            </p>
          </div>
        </div>
      </div>

      {/* 核心主张 */}
      <div className='mb-6'>
        <h3 className='text-lg font-bold mb-3 flex items-center gap-2'>
          <span className='w-1 h-5 bg-[#2B8F80] rounded'></span>
          核心主张
        </h3>
        <div className='space-y-3'>
          {noteData.content.core_claims.map((claim, idx) => (
            <div
              key={idx}
              className='bg-white dark:bg-[#163033] border border-slate-200 dark:border-[#2A4144] rounded-xl p-4 hover:shadow-md transition-shadow'>
              <p className='text-sm font-medium mb-2'>{claim.claim}</p>
              {claim.evidence && renderEvidence(claim.evidence)}
              {claim.source_lines && (
                <div className='mt-2 text-[10px] opacity-50 flex items-center gap-1'>
                  <Link size={12} />
                  <span>源文件行: {claim.source_lines.join(', ')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 反模式 */}
      {noteData.content.refinement?.anti_patterns &&
        noteData.content.refinement.anti_patterns.length > 0 && (
          <div className='mb-6'>
            <h3 className='text-lg font-bold mb-3 flex items-center gap-2'>
              <span className='w-1 h-5 bg-rose-500 rounded'></span>
              反模式警示
            </h3>
            <div className='bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 rounded-xl p-4'>
              <ul className='space-y-2'>
                {noteData.content.refinement.anti_patterns.map(
                  (pattern, idx) => (
                    <li key={idx} className='text-sm flex items-start gap-2'>
                      <span className='text-rose-500 font-bold'>✗</span>
                      <span>{pattern}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>
        )}

      {/* 知识钩子 */}
      {noteData.content.hooks && noteData.content.hooks.length > 0 && (
        <div>
          <h3 className='text-lg font-bold mb-3 flex items-center gap-2'>
            <span className='w-1 h-5 bg-indigo-500 rounded'></span>
            知识钩子
          </h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            {noteData.content.hooks.map((hook, idx) => (
              <HookItem key={idx} hook={hook} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
