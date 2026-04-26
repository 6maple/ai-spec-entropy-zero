import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Layers,
  AlertCircle,
  Link,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  Hash,
  FileText,
  Clock,
  Zap,
  Moon,
  Sun,
  RotateCcw,
  CheckCircle2,
  Layout,
  BrainCircuit,
  Eye,
  EyeOff,
} from 'lucide-react';

const noteData = {
  id: 'note_3f2a1b_20260512',
  title: 'Vue 大型不可变数据的响应性优化策略',
  abstract:
    '为了避免 Vue 深度响应式系统在处理超大数组或深层对象时的性能负担，应使用浅层响应式 API 并遵循不可变数据更新模式。',
  source: {
    input_path: 'docs/raw/vue-performance-deep.md',
    line_range: [1, 22],
    checksum: 'a1b2c3d4e5f6',
  },
  content: {
    core_claims: [
      {
        claim: 'Vue 默认的深度响应式在数据量极大时产生明显的性能负担。',
        evidence: {
          type: 'reasoning',
          description: '每个属性访问都会触发 Proxy 的依赖追踪逻辑。',
        },
        source_lines: [1, 2],
      },
      {
        claim: 'shallowRef() 和 shallowReactive() 只对顶层属性进行响应式处理。',
        evidence: {
          type: 'api',
          description: 'Vue 提供的官方浅层式 API。',
        },
        source_lines: [5],
      },
      {
        claim: '必须将深层对象视为不可变数据，通过替换根状态触发更新。',
        evidence: {
          type: 'code_example',
          description:
            'shallowArray.value = [...shallowArray.value, newObject]',
        },
        source_lines: [8, 14, 16, 18],
      },
    ],
    refinement: {
      summary:
        '面临 Vue 性能瓶颈时，切换至 shallowRef 并配合解构赋值或 Immer 风格替换，是牺牲便捷性换取渲染性能的关键手段。',
      anti_patterns: [
        '通过 `shallowArray.value.push()` 修改内容',
        '直接修改深层属性 `shallowArray.value[0].foo = 1`',
      ],
    },
    hooks: [
      {
        relation: '补充',
        target_concept: 'Vue 响应式原理',
        context: '解释了深度响应式 Proxy 的性能瓶颈。',
      },
      {
        relation: '对立',
        target_concept: 'ref 自动解包',
        context: 'shallowRef 不具备自动解包能力。',
      },
      {
        relation: '延伸',
        target_concept: 'Immer.js',
        context: '配合浅层响应式的标准高性能模式。',
      },
    ],
  },
  metadata: {
    created_at: '2026-04-22T10:00:00Z',
    domain: ['前端开发', 'Vue.js', '性能优化'],
  },
};

const cardData = {
  cards: [
    {
      card_id: 'card_a1_20260512',
      type: '问答题',
      question: '10 万条数据列表渲染卡顿，应优先替换为什么 API？',
      answer: '优先替换为 shallowRef。',
      explanation: '跳过深层属性代理开销，减少初始化负担。',
      source_lines: [5],
    },
    {
      card_id: 'card_a2_20260512',
      type: '填空题',
      template: 'shallowRef 触发更新必须写：\narr.value = __________',
      answer: '[...arr.value, x]',
      explanation: '通过替换引用触发浅层 setter。',
      source_lines: [14, 16],
    },
    {
      card_id: 'card_a3_20260512',
      type: '找错题',
      code_snippet:
        "const state = shallowRef({ list: [] });\nstate.value.list.push('item');",
      question: '上述代码为什么不会触发视图更新？',
      answer: '修改的是深层属性而非根引用。',
      explanation: 'shallowRef 只监听 .value 的赋值操作。',
      source_lines: [16, 18],
    },
  ],
};

const App = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState('note'); // 'note' or 'review'
  const [activeCard, setActiveCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const renderEvidence = (evidence) => {
    if (!evidence) return null;
    const styles = {
      reasoning:
        'bg-amber-100/40 dark:bg-amber-900/10 text-amber-800 dark:text-amber-200 border-amber-200/30',
      api: 'bg-blue-100/40 dark:bg-blue-900/10 text-blue-800 dark:text-blue-200 border-blue-200/30',
      code_example:
        'bg-emerald-100/40 dark:bg-emerald-900/10 text-emerald-800 dark:text-emerald-200 border-emerald-200/30',
    };
    return (
      <div
        className={`mt-1.5 p-2 rounded-lg border text-[11px] leading-relaxed ${styles[evidence.type]}`}>
        <span className='font-bold opacity-60 mr-1.5 uppercase'>
          {evidence.type.replace('_', ' ')}
        </span>
        {evidence.description}
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 font-sans ${darkMode ? 'bg-[#0B1213] text-[#E6F0EE]' : 'bg-[#F6F8F4] text-[#0F2A26]'}`}>
      {/* 顶部多模态导航栏 */}
      <nav className='sticky top-0 z-50 border-b transition-all shadow-sm backdrop-blur-md border-slate-200 dark:border-[#163033] bg-white/90 dark:bg-[#0F1A1A]/90 px-4'>
        <div className='max-w-[1400px] mx-auto flex items-center justify-between h-14'>
          <div className='flex items-center gap-6'>
            <div className='flex items-center gap-2'>
              <div className='p-1.5 bg-[#2B8F80] rounded text-white shadow-sm'>
                <Zap size={16} fill='currentColor' />
              </div>
              <h1 className='text-xs font-bold tracking-tight hidden md:block'>
                Knowledge Hub
              </h1>
            </div>

            {/* 模式切换菜单 */}
            <div className='flex bg-slate-100 dark:bg-[#163033] p-1 rounded-lg'>
              <button
                onClick={() => setViewMode('note')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'note' ? 'bg-white dark:bg-[#2B8F80] shadow-sm text-[#2B8F80] dark:text-white' : 'text-slate-400'}`}>
                <Layout size={14} /> 开卷笔记
              </button>
              <button
                onClick={() => {
                  setViewMode('review');
                  setShowAnswer(false);
                }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'review' ? 'bg-white dark:bg-[#2B8F80] shadow-sm text-[#2B8F80] dark:text-white' : 'text-slate-400'}`}>
                <BrainCircuit size={14} /> 闭卷复习
              </button>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className='p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors'>
              {darkMode ? (
                <Sun size={16} className='text-[#F4B84A]' />
              ) : (
                <Moon size={16} className='text-[#5A5FB5]' />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* 主体内容 */}
      <main className='max-w-[1400px] mx-auto p-4 md:p-6'>
        {viewMode === 'note' ? (
          /* 开卷笔记模式：侧重逻辑梳理与关联展示 */
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500'>
            {/* 左侧：精解笔记 */}
            <div className='lg:col-span-8 space-y-6'>
              <div className='bg-white dark:bg-[#0F1A1A] p-6 rounded-2xl border border-slate-200 dark:border-[#163033] shadow-sm relative overflow-hidden'>
                <div className='absolute top-0 left-0 w-1.5 h-full bg-[#2B8F80]'></div>
                <div className='flex items-center justify-between mb-4'>
                  <h2 className='text-xl font-bold'>{noteData.title}</h2>
                  <span className='text-[10px] font-mono opacity-40'>
                    ID: {noteData.id}
                  </span>
                </div>
                <p className='text-sm opacity-70 leading-relaxed italic border-l-2 border-[#E6ECE6] dark:border-[#163033] pl-4 py-1'>
                  {noteData.abstract}
                </p>
              </div>

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
                          <div className='mt-2 flex justify-end'>
                            <span className='text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-900 opacity-40'>
                              SOURCE: L{item.source_lines.join(',')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 关联复习卡（开卷模式特有：Q&A 直观平铺） */}
              <div className='space-y-4 border-t border-slate-200 dark:border-[#163033] pt-6'>
                <h3 className='text-xs font-bold uppercase tracking-widest text-[#5A5FB5] flex items-center gap-2'>
                  <BrainCircuit size={14} /> 关联复习卡 (Q&A 视图)
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                  {cardData.cards.map((card, idx) => (
                    <div
                      key={idx}
                      className='bg-[#F1F6F4] dark:bg-[#081514] p-4 rounded-xl border border-[#E6ECE6] dark:border-[#163033]'>
                      <div className='text-[10px] font-bold text-[#2B8F80] mb-2 uppercase opacity-60 flex justify-between'>
                        <span>{card.type}</span>
                        <span>#{card.card_id.slice(-4)}</span>
                      </div>
                      <div className='text-xs font-bold mb-3 leading-relaxed text-slate-700 dark:text-slate-200'>
                        {card.question ||
                          card.template.replace('__________', '____')}
                      </div>
                      <div className='bg-white dark:bg-[#0F1A1A] p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30'>
                        <div className='text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mb-1 flex items-center gap-1'>
                          <CheckCircle2 size={10} /> 参考答案
                        </div>
                        <div className='text-xs font-bold text-emerald-700 dark:text-emerald-300'>
                          {card.answer}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 右侧：知识脉络与辅助 */}
            <div className='lg:col-span-4 space-y-4'>
              <div className='bg-red-50/40 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20 p-5 rounded-2xl'>
                <h4 className='text-[10px] font-bold text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2'>
                  <AlertCircle size={14} /> 反模式 (易错点)
                </h4>
                <ul className='space-y-3'>
                  {noteData.content.refinement.anti_patterns.map((item, i) => (
                    <li
                      key={i}
                      className='text-xs leading-relaxed opacity-80 flex gap-2'>
                      <span className='text-red-400 font-bold'>×</span> {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className='bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/20 p-5 rounded-2xl'>
                <h4 className='text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2'>
                  <Link size={14} /> 知识外延 (Hooks)
                </h4>
                <div className='space-y-2'>
                  {noteData.content.hooks.map((hook, i) => (
                    <div
                      key={i}
                      className='bg-white dark:bg-[#0F1A1A] p-3 rounded-lg border border-slate-100 dark:border-white/5 shadow-sm'>
                      <div className='flex items-center justify-between mb-1'>
                        <span className='text-[9px] font-bold px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase'>
                          {hook.relation}
                        </span>
                        <span className='text-[10px] font-bold text-[#2B8F80]'>
                          {hook.target_concept}
                        </span>
                      </div>
                      <p className='text-[10px] opacity-50 leading-tight'>
                        {hook.context}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className='p-4 rounded-xl border border-dashed border-slate-200 dark:border-[#163033] text-center opacity-40'>
                <p className='text-[10px] uppercase font-mono tracking-tighter'>
                  Confidence: {noteData.metadata.confidence * 100}% | Created
                  2026
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* 闭卷复习模式：侧重压力测试与提取 */
          <div className='max-w-2xl mx-auto py-8 animate-in zoom-in-95 duration-300'>
            <div className='flex items-center justify-between mb-6 px-2'>
              <div className='flex flex-col'>
                <h2 className='text-sm font-bold opacity-40 uppercase tracking-widest flex items-center gap-2'>
                  <BrainCircuit size={14} /> 自测练习
                </h2>
                <span className='text-[10px] text-[#2B8F80] font-mono mt-1'>
                  当前卡片：{activeCard + 1} / {cardData.cards.length}
                </span>
              </div>
              <div className='flex items-center gap-1'>
                {cardData.cards.map((_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-1 rounded-full ${i === activeCard ? 'bg-[#2B8F80]' : 'bg-slate-200 dark:bg-[#163033]'}`}
                  />
                ))}
              </div>
            </div>

            <div className='bg-white dark:bg-[#0F1A1A] rounded-3xl border border-slate-200 dark:border-[#163033] shadow-2xl min-h-[480px] flex flex-col relative overflow-hidden'>
              {/* 装饰性背景 */}
              <div className='absolute top-0 right-0 w-32 h-32 bg-[#2B8F80]/5 rounded-full -mr-16 -mt-16 blur-3xl'></div>

              <div className='p-4 border-b border-slate-50 dark:border-[#163033] flex justify-between items-center bg-slate-50/30 dark:bg-[#163033]/20'>
                <span className='text-[10px] font-black px-2.5 py-1 rounded-full bg-[#5A5FB5] text-white tracking-wider'>
                  {cardData.cards[activeCard].type}
                </span>
                <button className='text-slate-300 hover:text-slate-500 transition-colors'>
                  <HelpCircle size={16} />
                </button>
              </div>

              <div className='flex-1 p-8 md:p-12 flex flex-col justify-center text-center'>
                <div className='space-y-6'>
                  <h3 className='text-xl md:text-2xl font-bold leading-tight text-slate-800 dark:text-[#E6F0EE]'>
                    {cardData.cards[activeCard].question ||
                      '请补充以下代码段：'}
                  </h3>

                  {cardData.cards[activeCard].template && (
                    <div className='bg-slate-900 text-slate-300 p-6 rounded-2xl text-sm font-mono text-left whitespace-pre-wrap border border-white/5 shadow-inner'>
                      {cardData.cards[activeCard].template}
                    </div>
                  )}

                  {cardData.cards[activeCard].code_snippet && (
                    <div className='bg-slate-900 text-emerald-400 p-6 rounded-2xl text-sm font-mono text-left border border-white/5 shadow-inner'>
                      {cardData.cards[activeCard].code_snippet}
                    </div>
                  )}
                </div>

                {showAnswer && (
                  <div className='mt-8 animate-in slide-in-from-bottom-4 duration-500'>
                    <div className='inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-full mb-4'>
                      <CheckCircle2 size={18} />
                      <span className='text-lg font-bold'>
                        {cardData.cards[activeCard].answer}
                      </span>
                    </div>
                    <p className='text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto'>
                      {cardData.cards[activeCard].explanation}
                    </p>
                  </div>
                )}
              </div>

              <div className='p-6 bg-slate-50/50 dark:bg-[#163033]/20 border-t border-slate-100 dark:border-[#163033]'>
                {!showAnswer ? (
                  <button
                    onClick={() => setShowAnswer(true)}
                    className='w-full py-4 bg-[#2B8F80] hover:bg-[#196B5E] text-white rounded-2xl font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2'>
                    <Eye size={18} /> 显示参考答案
                  </button>
                ) : (
                  <div className='flex gap-3'>
                    <button
                      onClick={() => {
                        setShowAnswer(false);
                        setActiveCard(
                          (prev) => (prev + 1) % cardData.cards.length,
                        );
                      }}
                      className='flex-1 py-4 bg-slate-900 dark:bg-[#2B8F80] text-white rounded-2xl text-sm font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2'>
                      下一个卡片 <ChevronRight size={18} />
                    </button>
                    <button
                      onClick={() => setShowAnswer(false)}
                      className='px-6 py-4 border border-slate-200 dark:border-white/10 rounded-2xl hover:bg-white dark:hover:bg-white/5 text-slate-400 transition-colors'
                      title='重新测试本卡'>
                      <RotateCcw size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 底部复习进度说明 */}
            <div className='mt-8 text-center opacity-40'>
              <p className='text-[10px] uppercase tracking-widest flex items-center justify-center gap-2'>
                <EyeOff size={12} /> 闭卷模式正在测试你的“主动提取”能力
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer 保持简洁 */}
      <footer className='mt-20 py-8 border-t border-slate-200 dark:border-[#163033] text-center'>
        <div className='flex items-center justify-center gap-2 mb-2 opacity-20'>
          <Zap size={14} />
          <span className='text-[10px] font-black uppercase tracking-widest'>
            Cognitive Flow OS
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
