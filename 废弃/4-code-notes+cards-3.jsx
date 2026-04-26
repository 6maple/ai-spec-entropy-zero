import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ChevronRight,
  Zap,
  Moon,
  Sun,
  RotateCcw,
  CheckCircle2,
  Layout,
  BrainCircuit,
  Eye,
  EyeOff,
  GitBranch,
  ArrowRight,
  Repeat,
  Lock,
  MinusCircle,
  Link,
  Hash,
} from 'lucide-react';

// 语义化关系配置：森林地图视觉暗示
const RELATION_MAP = {
  补充: {
    label: '补充',
    icon: <GitBranch size={14} />,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800/40',
    hint: '分支生长：细粒度展开',
  },
  对立: {
    label: '对立',
    icon: <MinusCircle size={14} />,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    border: 'border-rose-200 dark:border-rose-800/40',
    hint: '红色警示：逻辑矛盾',
  },
  因果: {
    label: '因果',
    icon: <ArrowRight size={14} />,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800/40',
    hint: '箭头指向：因果传导',
  },
  相似: {
    label: '相似',
    icon: <Repeat size={14} />,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800/40',
    hint: '虚线共振：同构模式',
  },
  前提: {
    label: '前提',
    icon: <Lock size={14} />,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    border: 'border-indigo-200 dark:border-indigo-800/40',
    hint: '前置锁链：理解基础',
  },
  延伸: {
    label: '延伸',
    icon: <GitBranch size={14} />,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    border: 'border-teal-200 dark:border-teal-800/40',
    hint: '向外探索',
  },
};

const noteData = {
  id: 'note_3f2a1b_20260512',
  title: 'Vue 大型不可变数据的响应性优化策略',
  abstract:
    '为了避免 Vue 深度响应式系统在处理超大数组或深层对象时的性能负担，应使用浅层响应式 API 并遵循不可变数据更新模式。',
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
        evidence: { type: 'api', description: 'Vue 提供的官方浅层式 API。' },
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
      anti_patterns: [
        '通过 `shallowArray.value.push()` 修改内容',
        '直接修改深层属性 `shallowArray.value[0].foo = 1`',
      ],
    },
    hooks: [
      {
        relation: '前提',
        target_concept: 'Vue 响应式 Proxy 原理',
        context: '理解 shallowRef 的前提是理解 Vue 响应式 Proxy。',
      },
      {
        relation: '补充',
        target_concept: 'shallowRef 与 ref',
        context: 'shallowRef 是对 ref 在高性能场景下的细粒度实现。',
      },
      {
        relation: '对立',
        target_concept: 'ref 自动解包',
        context: '与常规 ref 不同，shallowRef 不具备模板自动解包能力。',
      },
      {
        relation: '相似',
        target_concept: 'React useMemo',
        context:
          'Vue 的 shallowRef 与 React 的 useMemo 在“防止不必要更新”上逻辑相似。',
      },
      {
        relation: '因果',
        target_concept: '渲染卡顿降低',
        context: '因为减少了深度代理，所以大型列表的渲染性能得到提升。',
      },
    ],
  },
  metadata: { confidence: 0.95 },
};

const cardData = {
  cards: [
    {
      card_id: 'card_a1',
      type: '问答题',
      question: '10 万条数据列表渲染卡顿，应优先替换为什么 API？',
      answer: '优先替换为 shallowRef。',
      explanation: '跳过深层属性代理开销，减少初始化负担。',
      hook_index: 0,
    },
    {
      card_id: 'card_a2',
      type: '填空题',
      template: 'shallowRef 触发更新必须写：\narr.value = __________',
      answer: '[...arr.value, x]',
      explanation: '通过替换引用触发浅层 setter。',
      hook_index: 1,
    },
    {
      card_id: 'card_a3',
      type: '找错题',
      code_snippet:
        "const state = shallowRef({ list: [] });\nstate.value.list.push('item');",
      question: '上述代码为什么不会触发视图更新？',
      answer: '修改的是深层属性而非根引用。',
      explanation: 'shallowRef 只监听 .value 的赋值操作。',
      hook_index: 2,
    },
  ],
};

const App = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState('note');
  const [activeCard, setActiveCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const HookItem = ({ hook, compact = false }) => {
    const config = RELATION_MAP[hook.relation] || RELATION_MAP['补充'];
    return (
      <div
        className={`transition-all border ${config.bg} ${config.border} rounded-xl ${compact ? 'p-2.5 shadow-sm' : 'p-3 hover:shadow-md'}`}>
        <div
          className={`flex items-center gap-1.5 mb-1.5 ${config.color} font-bold text-[9px] uppercase tracking-wider`}>
          {config.icon}
          <span>
            {hook.relation} · {config.hint}
          </span>
        </div>
        <h5 className='text-[11px] font-bold mb-1 leading-tight'>
          {hook.target_concept}
        </h5>
        {!compact && (
          <p className='text-[10px] opacity-60 leading-relaxed'>
            {hook.context}
          </p>
        )}
      </div>
    );
  };

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
      <nav className='sticky top-0 z-50 border-b shadow-sm backdrop-blur-md border-slate-200 dark:border-[#163033] bg-white/90 dark:bg-[#0F1A1A]/90 px-4'>
        <div className='max-w-[1400px] mx-auto flex items-center justify-between h-14'>
          <div className='flex items-center gap-6'>
            <div className='flex items-center gap-2'>
              <div className='p-1.5 bg-[#2B8F80] rounded text-white'>
                <Zap size={16} fill='currentColor' />
              </div>
              <h1 className='text-xs font-bold hidden md:block tracking-tight'>
                Cognitive Hub
              </h1>
            </div>
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
          <button
            onClick={() => setDarkMode(!darkMode)}
            className='p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800'>
            {darkMode ? (
              <Sun size={16} className='text-[#F4B84A]' />
            ) : (
              <Moon size={16} className='text-[#5A5FB5]' />
            )}
          </button>
        </div>
      </nav>

      <main className='max-w-[1400px] mx-auto p-4 md:p-6'>
        {viewMode === 'note' ? (
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500'>
            {/* 左侧：严禁修改核心逻辑拆解和关联复习卡部分 */}
            <div className='lg:col-span-8 space-y-6'>
              <div className='bg-white dark:bg-[#0F1A1A] p-6 rounded-2xl border border-slate-200 dark:border-[#163033] shadow-sm relative overflow-hidden'>
                <div className='absolute top-0 left-0 w-1.5 h-full bg-[#2B8F80]'></div>
                <h2 className='text-xl font-bold mb-4'>{noteData.title}</h2>
                <p className='text-sm opacity-70 leading-relaxed italic border-l-2 border-slate-100 dark:border-[#163033] pl-4 mb-6'>
                  {noteData.abstract}
                </p>

                {/* # 核心逻辑拆解 (保持原样) */}
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

              {/* 关联复习卡 (保持原样) */}
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
                      <div className='text-xs font-bold mb-3 leading-relaxed'>
                        {card.question ||
                          card.template.replace('__________', '____')}
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
            </div>

            {/* 右侧：仅修改 Hooks 部分 */}
            <div className='lg:col-span-4 space-y-4'>
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

              {/* 重构的 Hooks 部分：引入语义图谱 */}
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
                  提示：关联语义通过图标与色彩建立“森林地图”，帮你理解知识间的推导逻辑。
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 闭卷复习模式：更紧凑的卡片与关联体现 */
          <div className='max-w-xl mx-auto py-2 animate-in zoom-in-95 duration-300'>
            <div className='flex items-center justify-between mb-3 px-2'>
              <span className='text-[9px] font-bold opacity-30 uppercase tracking-[0.2em]'>
                Self-Testing Mode
              </span>
              <div className='flex items-center gap-1'>
                {cardData.cards.map((_, i) => (
                  <div
                    key={i}
                    className={`w-5 h-0.5 rounded-full ${i === activeCard ? 'bg-[#2B8F80]' : 'bg-slate-200 dark:bg-[#163033]'}`}
                  />
                ))}
              </div>
            </div>

            <div className='bg-white dark:bg-[#0F1A1A] rounded-2xl border border-slate-200 dark:border-[#163033] shadow-lg flex flex-col overflow-hidden'>
              <div className='px-4 py-2 border-b border-slate-50 dark:border-[#163033] flex justify-between items-center bg-slate-50/40 dark:bg-[#163033]/20'>
                <span className='text-[9px] font-bold px-2 py-0.5 rounded bg-[#5A5FB5] text-white uppercase'>
                  {cardData.cards[activeCard].type}
                </span>
                <span className='text-[9px] opacity-30'>
                  {activeCard + 1} / {cardData.cards.length}
                </span>
              </div>

              <div className='px-6 py-8 flex flex-col justify-center text-center'>
                <h3 className='text-lg font-bold leading-tight mb-4 text-slate-800 dark:text-[#E6F0EE]'>
                  {cardData.cards[activeCard].question || '补全代码：'}
                </h3>

                {(cardData.cards[activeCard].template ||
                  cardData.cards[activeCard].code_snippet) && (
                  <div className='bg-slate-900 text-slate-300 p-4 rounded-xl text-[12px] font-mono text-left mb-4 border border-white/5 leading-relaxed'>
                    {cardData.cards[activeCard].template ||
                      cardData.cards[activeCard].code_snippet}
                  </div>
                )}

                {showAnswer && (
                  <div className='space-y-4 animate-in slide-in-from-bottom-2 duration-400'>
                    <div className='inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-lg border border-emerald-100 dark:border-emerald-800/30'>
                      <CheckCircle2 size={16} />
                      <span className='text-sm font-bold'>
                        {cardData.cards[activeCard].answer}
                      </span>
                    </div>
                    <p className='text-[10px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed italic'>
                      {cardData.cards[activeCard].explanation}
                    </p>

                    {/* 在显示答案时突出与其他知识的关联性 */}
                    <div className='pt-4 border-t border-slate-100 dark:border-[#163033]'>
                      <p className='text-[9px] font-black uppercase tracking-widest opacity-20 mb-2'>
                        关联语义节点 (Memory Link)
                      </p>
                      <div className='text-left'>
                        <HookItem
                          hook={
                            noteData.content.hooks[
                              cardData.cards[activeCard].hook_index
                            ]
                          }
                          compact
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

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
                      onClick={() => {
                        setShowAnswer(false);
                        setActiveCard(
                          (prev) => (prev + 1) % cardData.cards.length,
                        );
                      }}
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
            <div className='mt-4 text-center'>
              <p className='text-[10px] uppercase font-bold tracking-[0.2em] opacity-10 flex items-center justify-center gap-2'>
                <EyeOff size={10} /> Active Recall with Semantic Anchors
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
