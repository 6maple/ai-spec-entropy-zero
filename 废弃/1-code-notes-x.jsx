import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Link2,
  Layers,
  Brain,
  Clock,
  Tag,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  X,
  FileText,
  Moon,
  Sun,
} from 'lucide-react';

// 模拟 JSON 数据输入
const leafData = {
  id: 'leaf_20260121_vue_perf_lazy_loading',
  title: 'Vue异步组件与路由懒加载',
  tree: 'Vue性能优化',
  created_at: '2026-01-21T10:30:00Z',
  updated_at: '2026-01-21T10:30:00Z',
  source: {
    type: 'markdown',
    path: 'docs/raw/vue-performance-guide.md',
    title: 'Vue.js性能优化指南',
    section: '包体积与Tree-shaking优化',
  },
  summary: {
    abstract:
      '异步组件与路由懒加载是Vue应用减小首屏包体积的核心手段，通过将非首屏必需的代码推迟到实际需要时再加载，可以显著提升页面加载性能。',
    takeaway:
      '使用defineAsyncComponent定义异步组件，配合Vue Router的动态import实现路由级别的代码分割。',
  },
  claims: [
    {
      id: 'claim_001',
      statement: '异步组件只有在被渲染时才会加载对应的JavaScript代码',
      evidence: [
        {
          type: 'source_quote',
          content:
            '当使用defineAsyncComponent定义一个异步组件时，它只会在被渲染时才会从服务器上加载相关组件。',
          source_lines: [42, 43],
        },
      ],
    },
    {
      id: 'claim_002',
      statement: '路由懒加载可以将不同路由对应的组件分割成独立的代码块',
      evidence: [
        {
          type: 'source_quote',
          content:
            '使用动态导入语法，Vue Router会在路由被访问时才加载对应的组件。',
          source_lines: [45, 47],
        },
      ],
    },
  ],
  hooks: {
    incoming: [
      {
        relation: 'depends_on',
        target_leaf_id: 'leaf_20260120_vue_bundle_size',
        description: '理解包体积优化的重要性是使用懒加载的前提',
      },
    ],
    outgoing: [
      {
        relation: 'precedes',
        target_leaf_id: 'leaf_20260122_vue_ssr',
        description: '如果懒加载仍无法满足首屏要求，可进一步考虑SSR',
      },
      {
        relation: 'complements',
        target_leaf_id: 'leaf_20260121_vue_tree_shaking',
        description:
          'Tree-shaking在编译时消除死代码，懒加载在运行时推迟加载，两者互补',
      },
    ],
  },
  conflicts: [],
  flashcards: [
    {
      question: 'Vue中如何定义一个异步组件？',
      answer: '使用defineAsyncComponent API，传入一个返回动态import的函数',
      hint: '需要从vue中导入defineAsyncComponent',
    },
    {
      question: '路由懒加载在Vue Router中如何实现？',
      answer:
        "在路由配置的component字段中使用动态import语法：() => import('./MyComponent.vue')",
    },
  ],
  review: {
    stability: 0,
    difficulty: 0,
    last_reviewed: null,
    next_review: null,
    state: 'fresh',
  },
  tags: ['vue', '性能', '懒加载', '异步组件', '代码分割'],
};

// 辅助组件：溯源弹窗
const SourceModal = ({ isOpen, onClose, source, evidenceLines }) => {
  if (!isOpen) return null;
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200'>
      <div className='bg-white dark:bg-[#0F1A1A] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-[#E6ECE6] dark:border-[#163033] animate-in zoom-in-95 duration-200'>
        <div className='p-4 border-b border-[#E6ECE6] dark:border-[#163033] flex justify-between items-center bg-[#F6F8F4] dark:bg-[#081514]'>
          <div className='flex items-center gap-2'>
            <FileText size={18} className='text-[#2B8F80]' />
            <span className='font-semibold text-[#0F2A26] dark:text-[#E6F0EE]'>
              源文件溯源
            </span>
          </div>
          <button
            onClick={onClose}
            className='p-1 hover:bg-[#E6ECE6] dark:hover:bg-[#163033] rounded-full transition-colors'>
            <X size={20} />
          </button>
        </div>
        <div className='p-6'>
          <div className='text-xs text-[#55686A] dark:text-[#98B0AD] mb-2 font-mono'>
            {source.path} {' > '} {source.section}
          </div>
          <h3 className='text-lg font-bold mb-4 text-[#0F2A26] dark:text-[#E6F0EE]'>
            {source.title}
          </h3>
          <div className='bg-[#F1F6F4] dark:bg-[#081514] p-4 rounded-xl font-mono text-sm border-l-4 border-[#2B8F80] leading-relaxed'>
            <p className='text-[#55686A] dark:text-[#98B0AD] mb-2 text-xs'>
              // 行号 {evidenceLines[0]} - {evidenceLines[1]}
            </p>
            <p className='text-[#0F2A26] dark:text-[#E6F0EE] italic'>
              "...当使用defineAsyncComponent定义一个异步组件时，它只会在被渲染时才会从服务器上加载相关组件。使用动态导入语法，Vue
              Router会在路由被访问时才加载对应的组件..."
            </p>
          </div>
          <button
            onClick={onClose}
            className='mt-6 w-full py-2.5 bg-[#196B5E] dark:bg-[#48B7A6] text-white dark:text-[#0F1A1A] rounded-xl font-bold hover:opacity-90 transition-opacity'>
            确 认
          </button>
        </div>
      </div>
    </div>
  );
};

// 辅助组件：记忆卡片
const Flashcard = ({ card }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  return (
    <div
      onClick={() => setIsFlipped(!isFlipped)}
      className='group perspective-1000 cursor-pointer h-32 w-full'>
      <div
        className={`relative w-full h-full transition-all duration-500 preserve-3d shadow-sm rounded-xl border border-[#E6ECE6] dark:border-[#163033] ${isFlipped ? 'rotate-y-180' : ''}`}>
        <div className='absolute inset-0 backface-hidden p-4 flex flex-col justify-between bg-white dark:bg-[#0F1A1A] rounded-xl'>
          <div className='text-[10px] font-bold text-[#2B8F80] flex items-center gap-1 uppercase tracking-wider'>
            <HelpCircle size={12} /> Question
          </div>
          <div className='text-sm font-medium text-[#0F2A26] dark:text-[#E6F0EE] line-clamp-2 leading-relaxed'>
            {card.question}
          </div>
          <div className='text-[10px] text-[#55686A] text-right italic'>
            点击查看答案
          </div>
        </div>
        <div className='absolute inset-0 backface-hidden rotate-y-180 p-4 bg-[#F1F6F4] dark:bg-[#081514] rounded-xl flex flex-col justify-between'>
          <div className='text-[10px] font-bold text-[#4CAD84] flex items-center gap-1 uppercase tracking-wider'>
            <CheckCircle2 size={12} /> Answer
          </div>
          <div className='text-sm text-[#0F2A26] dark:text-[#E6F0EE] leading-snug'>
            {card.answer}
          </div>
          <div className='text-[10px] text-[#2B8F80]'>点击返回</div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeEvidenceLines, setActiveEvidenceLines] = useState([0, 0]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const openSource = (lines) => {
    setActiveEvidenceLines(lines);
    setIsModalOpen(true);
  };

  return (
    <div className='min-h-screen bg-[#F6F8F4] dark:bg-[#0B1213] text-[#0F2A26] dark:text-[#E6F0EE] font-sans transition-colors duration-300'>
      {/* 顶部导航 */}
      <header className='sticky top-0 z-30 bg-white/70 dark:bg-[#0F1A1A]/70 backdrop-blur-md border-b border-[#E6ECE6] dark:border-[#163033]'>
        <div className='max-w-4xl mx-auto px-4 py-3 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='bg-[#2B8F80]/10 p-2 rounded-lg text-[#2B8F80]'>
              <Layers size={20} />
            </div>
            <div>
              <div className='text-[10px] text-[#55686A] dark:text-[#98B0AD] font-bold tracking-widest'>
                {leafData.tree.toUpperCase()}
              </div>
              <h1 className='text-base font-bold truncate max-w-[200px] sm:max-w-md'>
                {leafData.title}
              </h1>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className='p-2 rounded-full hover:bg-[#E6ECE6] dark:hover:bg-[#163033] transition-colors'>
              {darkMode ? (
                <Sun size={18} className='text-[#F4B84A]' />
              ) : (
                <Moon size={18} className='text-[#5A5FB5]' />
              )}
            </button>
            <div className='px-3 py-1 bg-[#196B5E] text-white text-[10px] font-black rounded-md tracking-tighter'>
              {leafData.review.state.toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className='max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8'>
        {/* 左侧：内容主体 */}
        <div className='lg:col-span-8 space-y-8'>
          {/* 1. 核心提炼 */}
          <section className='bg-white dark:bg-[#0F1A1A] rounded-3xl p-7 shadow-[0_8px_30px_rgb(15,42,38,0.04)] border border-[#E6ECE6] dark:border-[#163033]'>
            <div className='flex items-center gap-2 mb-4 text-[#2B8F80]'>
              <BookOpen size={18} />
              <h2 className='font-bold text-xs uppercase tracking-[0.2em]'>
                摘要 & 核心结论
              </h2>
            </div>
            <p className='text-[#55686A] dark:text-[#98B0AD] text-sm leading-relaxed mb-6'>
              {leafData.summary.abstract}
            </p>
            <div className='bg-[#F1F6F4] dark:bg-[#081514] p-5 rounded-2xl border border-[#E6ECE6] dark:border-[#163033]'>
              <div className='text-[10px] font-black text-[#196B5E] dark:text-[#48B7A6] mb-2 uppercase italic tracking-wider'>
                Takeaway
              </div>
              <p className='text-[#0F2A26] dark:text-[#E6F0EE] font-semibold leading-relaxed'>
                {leafData.summary.takeaway}
              </p>
            </div>
          </section>

          {/* 2. 关键论断 */}
          <section className='space-y-5'>
            <div className='flex items-center gap-2 px-1 text-[#55686A] dark:text-[#98B0AD]'>
              <AlertCircle size={18} />
              <h2 className='font-bold text-xs uppercase tracking-[0.2em]'>
                关键论断 (Claims)
              </h2>
            </div>
            {leafData.claims.map((claim, idx) => (
              <div
                key={claim.id}
                className='bg-white dark:bg-[#0F1A1A] rounded-2xl border border-[#E6ECE6] dark:border-[#163033] shadow-sm overflow-hidden group'>
                <div className='p-6'>
                  <div className='flex gap-4'>
                    <span className='flex-shrink-0 w-7 h-7 rounded-lg bg-[#F6F8F4] dark:bg-[#081514] flex items-center justify-center text-xs font-black text-[#2B8F80]'>
                      {idx + 1}
                    </span>
                    <p className='text-[#0F2A26] dark:text-[#E6F0EE] font-bold text-base leading-snug pt-1'>
                      {claim.statement}
                    </p>
                  </div>
                  <div className='mt-5 ml-11 space-y-3'>
                    {claim.evidence.map((ev, evIdx) => (
                      <div
                        key={evIdx}
                        className='flex items-start gap-3 bg-[#F6F8F4] dark:bg-[#081514] p-4 rounded-xl border border-transparent hover:border-[#A6D8D0] dark:hover:border-[#2B8F80] transition-all'>
                        <div className='text-xs text-[#55686A] dark:text-[#98B0AD] leading-relaxed flex-grow italic'>
                          “{ev.content}”
                        </div>
                        <button
                          onClick={() => openSource(ev.source_lines)}
                          className='flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-[#163033] rounded-lg shadow-sm border border-[#E6ECE6] dark:border-[#163033] text-[10px] font-bold text-[#2B8F80] hover:bg-[#2B8F80] hover:text-white transition-all'>
                          <ExternalLink size={10} /> 溯源
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* 3. 关联网络 */}
          <section className='grid grid-cols-1 md:grid-cols-2 gap-5'>
            <div className='bg-[#F1F6F4] dark:bg-[#081514] rounded-2xl p-6 border border-dashed border-[#A6D8D0] dark:border-[#163033]'>
              <div className='text-[10px] font-bold text-[#55686A] dark:text-[#98B0AD] mb-4 flex items-center gap-2 uppercase tracking-widest'>
                <Link2 size={14} className='text-[#5A5FB5]' /> 前置知识
              </div>
              {leafData.hooks.incoming.map((hook, i) => (
                <div
                  key={i}
                  className='hover:translate-x-1 transition-transform'>
                  <div className='text-sm font-bold text-[#0F2A26] dark:text-[#E6F0EE] flex items-center gap-2'>
                    <span className='w-1.5 h-1.5 rounded-full bg-[#5A5FB5]' />
                    {hook.target_leaf_id}
                  </div>
                  <p className='text-xs text-[#55686A] dark:text-[#98B0AD] mt-1.5 ml-3.5 leading-relaxed'>
                    {hook.description}
                  </p>
                </div>
              ))}
            </div>
            <div className='bg-white dark:bg-[#0F1A1A] rounded-2xl p-6 border border-[#E6ECE6] dark:border-[#163033] shadow-sm'>
              <div className='text-[10px] font-bold text-[#2B8F80] mb-4 flex items-center gap-2 uppercase tracking-widest'>
                <ChevronRight size={14} /> 后续延伸
              </div>
              <div className='space-y-5'>
                {leafData.hooks.outgoing.map((hook, i) => (
                  <div key={i} className='group cursor-pointer'>
                    <div className='text-sm font-bold text-[#0F2A26] dark:text-[#E6F0EE] group-hover:text-[#2B8F80] transition-colors flex items-center justify-between'>
                      {hook.target_leaf_id}
                      <span className='text-[9px] px-1.5 py-0.5 bg-[#A6D8D0]/20 text-[#2B8F80] rounded font-bold uppercase'>
                        {hook.relation}
                      </span>
                    </div>
                    <p className='text-xs text-[#55686A] dark:text-[#98B0AD] mt-1 leading-relaxed'>
                      {hook.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* 右侧：边栏 */}
        <aside className='lg:col-span-4 space-y-8'>
          {/* 记忆看板 */}
          <div className='bg-[#196B5E] dark:bg-[#196B5E] rounded-3xl p-6 text-white shadow-[0_12px_40px_rgba(25,107,94,0.25)] relative overflow-hidden group'>
            <div className='absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all' />
            <div className='flex items-center gap-2 text-[#A6D8D0] text-[10px] font-bold mb-5 uppercase tracking-widest'>
              <Clock size={14} /> 复习状态
            </div>
            <div className='space-y-4'>
              <div>
                <div className='text-xs text-[#A6D8D0] opacity-80 mb-1 font-medium'>
                  下次复习预计
                </div>
                <div className='text-2xl font-black tracking-tight'>
                  24h 以后
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div className='bg-white/10 p-3 rounded-xl border border-white/10'>
                  <div className='text-[9px] text-[#A6D8D0] uppercase font-bold'>
                    难度
                  </div>
                  <div className='text-lg font-bold'>--</div>
                </div>
                <div className='bg-white/10 p-3 rounded-xl border border-white/10'>
                  <div className='text-[9px] text-[#A6D8D0] uppercase font-bold'>
                    稳定性
                  </div>
                  <div className='text-lg font-bold'>0.0</div>
                </div>
              </div>
            </div>
            <button className='w-full mt-6 py-3 bg-[#F4B84A] text-[#0F2A26] rounded-xl font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-[#F4B84A]/20'>
              开始今日记忆
            </button>
          </div>

          {/* Q&A 卡片 */}
          <section className='space-y-4'>
            <div className='flex items-center gap-2 px-1 text-[#55686A] dark:text-[#98B0AD]'>
              <Brain size={18} />
              <h2 className='font-bold text-xs uppercase tracking-[0.2em]'>
                记忆卡片
              </h2>
            </div>
            <div className='space-y-4'>
              {leafData.flashcards.map((card, i) => (
                <Flashcard key={i} card={card} />
              ))}
            </div>
          </section>

          {/* 标签 */}
          <section className='bg-white dark:bg-[#0F1A1A] rounded-2xl p-6 border border-[#E6ECE6] dark:border-[#163033] shadow-sm'>
            <div className='flex items-center gap-2 text-[#55686A] dark:text-[#98B0AD] text-[10px] font-bold mb-4 uppercase tracking-widest'>
              <Tag size={14} /> 知识标签
            </div>
            <div className='flex flex-wrap gap-2'>
              {leafData.tags.map((tag, idx) => {
                const colors = [
                  '#A6D8D0',
                  '#D6C9FF',
                  '#FFE3A7',
                  '#F9C1D9',
                  '#CFE7A9',
                ];
                const color = colors[idx % colors.length];
                return (
                  <span
                    key={tag}
                    style={{
                      backgroundColor: `${color}20`,
                      color: darkMode ? '#E6F0EE' : '#196B5E',
                    }}
                    className='px-3 py-1.5 rounded-lg text-xs font-bold border border-transparent hover:border-current transition-all cursor-pointer'>
                    #{tag}
                  </span>
                );
              })}
            </div>
          </section>

          {/* 脚注 */}
          <div className='text-[10px] text-[#55686A] dark:text-[#98B0AD] px-3 space-y-1 font-mono opacity-60'>
            <p>ID: {leafData.id}</p>
            <p>SYNC: {new Date().toLocaleDateString()}</p>
          </div>
        </aside>
      </main>

      <SourceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        source={leafData.source}
        evidenceLines={activeEvidenceLines}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .perspective-1000 { perspective: 1000px; }
        .backface-hidden { backface-visibility: hidden; }
        .preserve-3d { transform-style: preserve-3d; }
        .rotate-y-180 { transform: rotateY(180deg); }
        
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { 
          background: #E6ECE6; 
          border-radius: 10px;
        }
        .dark ::-webkit-scrollbar-thumb { background: #163033; }
      `,
        }}
      />
    </div>
  );
}
