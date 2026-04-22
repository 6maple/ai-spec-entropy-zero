import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  ExternalLink,
  Layers,
  Brain,
  CheckCircle,
  Clock,
  Tag,
  ChevronRight,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Moon,
  Sun,
  X,
  Zap,
  Info,
} from 'lucide-react';

const KnowledgeLeaf = () => {
  const [showSource, setShowSource] = useState(false);
  const [flippedCards, setFlippedCards] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 输入数据
  const leafData = {
    id: 'leaf_20260121_vue_perf_lazy_loading',
    title: 'Vue 异步组件与路由懒加载',
    tree: 'Vue 性能优化',
    created_at: '2026-01-21T10:30:00Z',
    updated_at: '2026-01-21T10:30:00Z',
    source: {
      type: 'markdown',
      path: 'docs/raw/vue-performance-guide.md',
      title: 'Vue.js 性能优化指南',
      section: '包体积与 Tree-shaking 优化',
    },
    summary: {
      abstract:
        '异步组件与路由懒加载是 Vue 应用减小首屏包体积的核心手段，通过将非首屏必需的代码推迟到实际需要时再加载，可以显著提升页面加载性能。',
      takeaway:
        '使用 defineAsyncComponent 定义异步组件，配合 Vue Router 的动态 import 实现路由级别的代码分割。',
    },
    claims: [
      {
        id: 'claim_001',
        statement: '异步组件只有在被渲染时才会加载对应的 JavaScript 代码',
        evidence: [
          {
            type: 'source_quote',
            content:
              '当使用 defineAsyncComponent 定义一个异步组件时，它只会在被渲染时才会从服务器上加载相关组件。',
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
              '使用动态导入语法， Vue Router 会在路由被访问时才加载对应的组件。',
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
          description: '如果懒加载仍无法满足首屏要求，可进一步考虑 SSR',
        },
        {
          relation: 'complements',
          target_leaf_id: 'leaf_20260121_vue_tree_shaking',
          description:
            'Tree-shaking 在编译时消除死代码，懒加载在运行时推迟加载，两者互补',
        },
      ],
    },
    conflicts: [],
    flashcards: [
      {
        question: 'Vue 中如何定义一个异步组件？',
        answer: '使用 defineAsyncComponent API，传入一个返回动态 import 的函数',
        hint: '需要从 vue 中导入 defineAsyncComponent',
      },
      {
        question: '路由懒加载在 Vue Router 中如何实现？',
        answer:
          "在路由配置的 component 字段中使用动态 import 语法：() => import('./MyComponent.vue')",
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

  // 分类标签配色数组
  const tagColors = [
    'bg-[#A6D8D0] text-[#0F2A26]', // 水母蓝
    'bg-[#D6C9FF] text-[#0F2A26]', // 薰衣紫
    'bg-[#FFE3A7] text-[#0F2A26]', // 琥珀
    'bg-[#F9C1D9] text-[#0F2A26]', // 柔粉
    'bg-[#CFE7A9] text-[#0F2A26]', // 薄荷
    'bg-[#B6E0FF] text-[#0F2A26]', // 天蓝
    'bg-[#FFD1C0] text-[#0F2A26]', // 浅珊瑚
  ];

  const toggleCard = (index) => {
    setFlippedCards((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const RelationIcon = ({ relation }) => {
    switch (relation) {
      case 'depends_on':
        return <ArrowDownRight className='w-4 h-4 text-[#E08E4A]' />;
      case 'precedes':
        return <ArrowUpRight className='w-4 h-4 text-[#4CAD84]' />;
      case 'complements':
        return <ArrowRightLeft className='w-4 h-4 text-[#5A5FB5]' />;
      default:
        return <ChevronRight className='w-4 h-4 text-[#55686A]' />;
    }
  };

  return (
    <div className={`${isDarkMode ? 'dark' : ''}`}>
      <div className='min-h-screen bg-[#F6F8F4] dark:bg-[#0B1213] text-[#0F2A26] dark:text-[#E6F0EE] font-sans transition-colors duration-300 selection:bg-[#CDEEE6]'>
        {/* CSS 变量与全局样式 */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          :root {
            --primary: #2B8F80;
            --primary-700: #196B5E;
            --card-shadow: 0 6px 18px rgba(15, 42, 38, 0.04);
            --card-shadow-dark: 0 6px 18px rgba(0, 0, 0, 0.2);
          }
          .custom-shadow { box-shadow: var(--card-shadow); }
          .dark .custom-shadow { box-shadow: var(--card-shadow-dark); }
          .line-height-6 { line-height: 1.6; }
        `,
          }}
        />

        {/* 顶部导航 */}
        <header className='sticky top-0 z-40 bg-[#F6F8F4]/80 dark:bg-[#0B1213]/80 backdrop-blur-lg border-b border-[#E6ECE6] dark:border-[#163033]'>
          <div className='max-w-5xl mx-auto px-6 h-16 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-8 h-8 rounded-lg bg-[#2B8F80] flex items-center justify-center text-white'>
                <Layers size={18} />
              </div>
              <div className='hidden sm:block'>
                <p className='text-[10px] font-bold text-[#2B8F80] dark:text-[#48B7A6] uppercase tracking-widest'>
                  {leafData.tree}
                </p>
                <h2 className='text-sm font-bold truncate max-w-[200px]'>
                  {leafData.title}
                </h2>
              </div>
            </div>

            <div className='flex items-center gap-4'>
              <button
                onClick={() => setShowSource(true)}
                className='text-xs font-bold text-[#55686A] dark:text-[#98B0AD] hover:text-[#2B8F80] transition-colors flex items-center gap-1'>
                <BookOpen size={14} /> 溯源
              </button>
              <div className='h-4 w-[1px] bg-[#E6ECE6] dark:bg-[#163033]'></div>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className='p-2 rounded-xl hover:bg-[#E6ECE6] dark:hover:bg-[#163033] transition-colors'>
                {isDarkMode ? (
                  <Sun size={18} className='text-[#F4B84A]' />
                ) : (
                  <Moon size={18} className='text-[#55686A]' />
                )}
              </button>
            </div>
          </div>
        </header>

        <main className='max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8'>
          {/* 左侧：核心内容 */}
          <div className='lg:col-span-8 space-y-8'>
            {/* 标题区 */}
            <section>
              <div className='flex items-center gap-2 text-[#55686A] dark:text-[#98B0AD] text-xs font-medium mb-2'>
                <Clock size={12} /> 更新于{' '}
                {new Date(leafData.updated_at).toLocaleDateString('zh-CN')}
                <span className='mx-1'>·</span>
                <span>ID: {leafData.id}</span>
              </div>
              <h1 className='text-3xl font-extrabold tracking-tight mb-4'>
                {leafData.title}
              </h1>

              <div className='bg-[#FFFFFF] dark:bg-[#0F1A1A] border border-[#E6ECE6] dark:border-[#163033] rounded-2xl p-6 custom-shadow'>
                <h3 className='text-[11px] font-bold text-[#2B8F80] dark:text-[#48B7A6] uppercase tracking-[0.2em] mb-3 flex items-center gap-2'>
                  <Zap size={14} /> 核心摘要与行动指引
                </h3>
                <p className='text-lg line-height-6 text-[#0F2A26] dark:text-[#E6F0EE] mb-6'>
                  {leafData.summary.abstract}
                </p>
                <div className='bg-[#F4B84A]/10 dark:bg-[#FFD89A]/5 border-l-4 border-[#F4B84A] p-4 rounded-r-xl'>
                  <span className='text-[10px] font-black text-[#E08E4A] dark:text-[#FFD89A] uppercase tracking-widest'>
                    Key Takeaway
                  </span>
                  <p className='text-[#0F2A26] dark:text-[#E6F0EE] font-semibold mt-1'>
                    {leafData.summary.takeaway}
                  </p>
                </div>
              </div>
            </section>

            {/* 知识断言区 */}
            <section className='space-y-4'>
              <h3 className='text-xs font-bold text-[#55686A] dark:text-[#98B0AD] uppercase tracking-widest flex items-center gap-2'>
                <CheckCircle size={14} className='text-[#4CAD84]' /> 知识提炼
                (Claims)
              </h3>
              <div className='space-y-4'>
                {leafData.claims.map((claim, idx) => (
                  <div
                    key={claim.id}
                    className='bg-[#FFFFFF] dark:bg-[#0F1A1A] border border-[#E6ECE6] dark:border-[#163033] rounded-2xl p-6 custom-shadow transition-transform hover:scale-[1.01]'>
                    <div className='flex gap-4'>
                      <span className='flex-shrink-0 w-6 h-6 rounded bg-[#F1F6F4] dark:bg-[#081514] text-[#2B8F80] flex items-center justify-center text-xs font-bold border border-[#E6ECE6] dark:border-[#163033]'>
                        {idx + 1}
                      </span>
                      <div className='space-y-4 flex-grow'>
                        <h4 className='text-lg font-bold leading-snug'>
                          {claim.statement}
                        </h4>
                        {claim.evidence.map((ev, eIdx) => (
                          <div
                            key={eIdx}
                            className='bg-[#F1F6F4] dark:bg-[#081514] rounded-xl p-4 relative group'>
                            <div className='absolute top-3 right-3 text-[9px] font-mono text-[#98B0AD]'>
                              L{ev.source_lines.join('-')}
                            </div>
                            <p className='text-sm text-[#55686A] dark:text-[#98B0AD] italic pr-8'>
                              “{ev.content}”
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 关联网络 */}
            <section className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='bg-[#FFFFFF] dark:bg-[#0F1A1A] border border-[#E6ECE6] dark:border-[#163033] p-5 rounded-2xl custom-shadow'>
                <h4 className='text-[10px] font-black text-[#55686A] dark:text-[#98B0AD] uppercase tracking-widest mb-4'>
                  前置依赖
                </h4>
                <div className='space-y-3'>
                  {leafData.hooks.incoming.map((hook, i) => (
                    <div key={i} className='group cursor-pointer'>
                      <div className='flex items-center gap-2 mb-1'>
                        <RelationIcon relation={hook.relation} />
                        <span className='text-sm font-bold group-hover:text-[#2B8F80] transition-colors'>
                          {hook.target_leaf_id}
                        </span>
                      </div>
                      <p className='text-xs text-[#55686A] dark:text-[#98B0AD] pl-6 leading-relaxed'>
                        {hook.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className='bg-[#FFFFFF] dark:bg-[#0F1A1A] border border-[#E6ECE6] dark:border-[#163033] p-5 rounded-2xl custom-shadow'>
                <h4 className='text-[10px] font-black text-[#55686A] dark:text-[#98B0AD] uppercase tracking-widest mb-4'>
                  后续路径
                </h4>
                <div className='space-y-3'>
                  {leafData.hooks.outgoing.map((hook, i) => (
                    <div key={i} className='group cursor-pointer'>
                      <div className='flex items-center gap-2 mb-1'>
                        <RelationIcon relation={hook.relation} />
                        <span className='text-sm font-bold group-hover:text-[#2B8F80] transition-colors'>
                          {hook.target_leaf_id}
                        </span>
                      </div>
                      <p className='text-xs text-[#55686A] dark:text-[#98B0AD] pl-6 leading-relaxed'>
                        {hook.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* 右侧：状态与复习 */}
          <div className='lg:col-span-4 space-y-6'>
            {/* 记忆卡片 */}
            <section className='bg-[#FFFFFF] dark:bg-[#0F1A1A] border border-[#E6ECE6] dark:border-[#163033] rounded-2xl p-6 custom-shadow'>
              <h3 className='font-bold text-sm mb-4 flex items-center gap-2'>
                <HelpCircle size={16} className='text-[#5A5FB5]' /> 记忆自测
                (SRS)
              </h3>
              <div className='space-y-3'>
                {leafData.flashcards.map((card, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleCard(idx)}
                    className={`cursor-pointer p-4 rounded-xl border transition-all duration-300 ${
                      flippedCards[idx]
                        ? 'bg-[#F1F6F4] dark:bg-[#081514] border-[#2B8F80]'
                        : 'bg-white dark:bg-slate-800 border-[#E6ECE6] dark:border-[#163033] hover:border-[#5A5FB5]'
                    }`}>
                    <p className='text-xs font-bold text-[#5A5FB5] dark:text-[#8F93E6] mb-1'>
                      Q{idx + 1}
                    </p>
                    <p className='text-sm font-bold leading-snug'>
                      {card.question}
                    </p>
                    {flippedCards[idx] && (
                      <div className='mt-3 pt-3 border-t border-[#E6ECE6] dark:border-[#163033] animate-in fade-in'>
                        <p className='text-sm text-[#55686A] dark:text-[#98B0AD]'>
                          {card.answer}
                        </p>
                        {card.hint && (
                          <div className='mt-2 text-[10px] bg-[#FFE3A7] text-[#0F2A26] px-2 py-0.5 rounded font-bold'>
                            提示: {card.hint}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 复习调度 */}
            <section className='bg-[#196B5E] text-white rounded-2xl p-6 shadow-lg shadow-[#196B5E]/20'>
              <div className='flex justify-between items-center mb-4'>
                <span className='text-[10px] font-black uppercase tracking-widest opacity-70'>
                  复习调度状态
                </span>
                <span className='text-[10px] font-mono opacity-70'>
                  稳定性: {leafData.review.stability}
                </span>
              </div>
              <div className='flex items-end gap-2 mb-4'>
                <div className='text-2xl font-black'>FRESH</div>
                <div className='text-xs mb-1 opacity-80'>尚未复习</div>
              </div>
              <div className='w-full bg-white/20 h-1.5 rounded-full overflow-hidden mb-6'>
                <div className='bg-[#F4B84A] h-full w-1/4'></div>
              </div>
              <button className='w-full py-3 bg-[#FFFFFF] text-[#196B5E] rounded-xl font-bold text-sm hover:bg-[#F1F6F4] transition-colors active:scale-95'>
                开始复习
              </button>
            </section>

            {/* 标签云 */}
            <div className='flex flex-wrap gap-2'>
              {leafData.tags.map((tag, i) => (
                <span
                  key={tag}
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${tagColors[i % tagColors.length]}`}>
                  <Tag size={10} /> {tag}
                </span>
              ))}
            </div>

            {/* 辅助信息 */}
            <div className='bg-[#F1F6F4] dark:bg-[#081514] rounded-2xl p-5 border border-[#E6ECE6] dark:border-[#163033]'>
              <h4 className='text-[10px] font-black text-[#55686A] dark:text-[#98B0AD] uppercase tracking-widest mb-3 flex items-center gap-2'>
                <Info size={12} /> 元数据
              </h4>
              <ul className='text-xs space-y-2 text-[#55686A] dark:text-[#98B0AD]'>
                <li className='flex justify-between'>
                  <span>版本追踪</span>
                  <span className='font-mono text-[10px]'>v1.0.4</span>
                </li>
                <li className='flex justify-between'>
                  <span>知识树</span>
                  <span className='font-bold text-[#2B8F80]'>
                    {leafData.tree}
                  </span>
                </li>
                <li className='flex justify-between'>
                  <span>向量空间</span>
                  <span className='font-mono text-[10px]'>Embedded</span>
                </li>
              </ul>
            </div>
          </div>
        </main>

        {/* 溯源弹窗 */}
        {showSource && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
            <div
              className='absolute inset-0 bg-[#0F2A26]/60 backdrop-blur-md'
              onClick={() => setShowSource(false)}></div>
            <div className='relative bg-[#FFFFFF] dark:bg-[#0F1A1A] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-[#E6ECE6] dark:border-[#163033] animate-in zoom-in-95 duration-200'>
              <div className='px-6 py-4 border-b border-[#E6ECE6] dark:border-[#163033] flex justify-between items-center bg-[#F6F8F4] dark:bg-[#0B1213]'>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 rounded-full bg-[#D66A5A]'></div>
                  <div className='w-2 h-2 rounded-full bg-[#F4B84A]'></div>
                  <div className='w-2 h-2 rounded-full bg-[#4CAD84]'></div>
                  <h3 className='ml-2 font-bold text-sm'>
                    双向溯源：{data.source.title}
                  </h3>
                </div>
                <button
                  onClick={() => setShowSource(false)}
                  className='text-[#55686A] hover:text-[#D66A5A]'>
                  <X size={18} />
                </button>
              </div>
              <div className='p-6 font-mono text-[11px] line-height-6 text-[#55686A] dark:text-[#98B0AD]'>
                <div className='bg-[#081514] text-[#E6F0EE] p-6 rounded-xl overflow-x-auto'>
                  <div className='opacity-40 mb-2'>
                    // Path: {leafData.source.path}
                  </div>
                  <div className='opacity-40 mb-2'>
                    // Section: {leafData.source.section}
                  </div>
                  <div className='flex gap-4'>
                    <div className='opacity-30 text-right border-r border-white/10 pr-4 select-none'>
                      40
                      <br />
                      41
                      <br />
                      42
                      <br />
                      43
                      <br />
                      44
                      <br />
                      45
                      <br />
                      46
                      <br />
                      47
                    </div>
                    <div>
                      ...
                      <br />
                      <span className='text-[#48B7A6]'>
                        ## {leafData.source.section}
                      </span>
                      <br />
                      <span className='bg-[#2B8F80]/30 border-l-2 border-[#48B7A6] px-2 block my-1'>
                        当使用 defineAsyncComponent
                        定义一个异步组件时，它只会在被渲染时才会从服务器上加载相关组件。
                      </span>
                      <br />
                      <span className='bg-[#5A5FB5]/30 border-l-2 border-[#8F93E6] px-2 block my-1'>
                        使用动态导入语法，Vue Router
                        会在路由被访问时才加载对应的组件。
                      </span>
                      ...
                    </div>
                  </div>
                </div>
                <div className='mt-6 flex justify-between items-center'>
                  <span className='text-[10px] opacity-60'>
                    基于 Entropy Zero 熵减引擎生成
                  </span>
                  <button className='flex items-center gap-1 text-[#2B8F80] font-bold hover:underline'>
                    打开源文件 <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App = () => <KnowledgeLeaf />;
