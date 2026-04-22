import React from 'react';
import { RELATION_MAP } from '@/utils/constants';

export default function HookItem({ hook, compact = false }) {
  const config = RELATION_MAP[hook.relation] || RELATION_MAP['补充'];
  const IconComponent = config.icon;

  return (
    <div
      className={`transition-all border ${config.bg} ${config.border} rounded-xl ${compact ? 'p-2.5 shadow-sm' : 'p-3 hover:shadow-md'}`}>
      <div
        className={`flex items-center gap-1.5 mb-1.5 ${config.color} font-bold text-[9px] uppercase tracking-wider`}>
        <IconComponent size={14} />
        <span>
          {hook.relation} · {config.hint}
        </span>
      </div>
      <h5 className='text-[11px] font-bold mb-1 leading-tight'>
        {hook.target_concept}
      </h5>
      {!compact && (
        <p className='text-[10px] opacity-60 leading-relaxed'>{hook.context}</p>
      )}
    </div>
  );
}
