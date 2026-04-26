import React, { useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  Clock,
  User,
  Tag,
  FileEdit,
  MoreHorizontal,
  ArrowLeft,
  Search,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Terminal,
  Copy,
  Check,
  Brain,
  List,
} from 'lucide-react';

// --- Components ---

// 1. Q&A Interactive Card
const QACard = ({ question, answer, codeSnippet }) => {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div className='bg-white rounded-xl border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-emerald-200'>
      {/* Question Header (Clickable) */}
      <button
        onClick={() => setIsRevealed(!isRevealed)}
        className='w-full text-left px-6 py-5 flex items-start justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors'>
        <div className='flex gap-3 items-start pr-4'>
          <span className='flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold mt-0.5'>
            Q
          </span>
          <h4 className='text-slate-800 font-medium leading-relaxed'>
            {question}
          </h4>
        </div>
        <div className='flex-shrink-0 mt-1 text-slate-400'>
          {isRevealed ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* Answer Body (Collapsible) */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isRevealed
            ? 'max-h-[800px] opacity-100 border-t border-slate-100'
            : 'max-h-0 opacity-0 overflow-hidden'
        }`}>
        <div className='p-6 pt-5 bg-white'>
          <div className='flex gap-3'>
            <span className='flex-shrink-0 w-6 h-6 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-sm font-bold mt-0.5'>
              A
            </span>
            <div className='text-slate-600 leading-relaxed text-sm w-full'>
              {answer}
              {codeSnippet && (
                <div className='mt-4'>
                  <CodeBlock code={codeSnippet} language='javascript' />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. Mac-style Code Block
const CodeBlock = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // 使用兼容性更好的 fallback 方案复制文本
    const textArea = document.createElement('textarea');
    textArea.value = code;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
    document.body.removeChild(textArea);
  };

  return (
    <div className='bg-[#1e1e2e] rounded-xl overflow-hidden shadow-sm my-4 font-mono text-sm border border-slate-700/50 group'>
      {/* Window Header */}
      <div className='relative flex items-center justify-between px-4 py-3 bg-[#181825] border-b border-white/5'>
        <div className='flex space-x-2 w-16'>
          <div className='w-3 h-3 rounded-full bg-rose-500/80'></div>
          <div className='w-3 h-3 rounded-full bg-amber-500/80'></div>
          <div className='w-3 h-3 rounded-full bg-emerald-500/80'></div>
        </div>
        <div className='text-slate-400 text-xs font-medium uppercase tracking-wider text-center flex-1'>
          {language}
        </div>
        <div className='flex justify-end w-16'>
          <button
            onClick={handleCopy}
            className='text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center p-1.5 rounded-md hover:bg-white/10 opacity-0 group-hover:opacity-100 focus:opacity-100'
            title='复制代码'>
            {copied ? (
              <Check size={14} className='text-emerald-400' />
            ) : (
              <Copy size={14} />
            )}
          </button>
        </div>
      </div>
      {/* Code Content */}
      <div className='p-5 overflow-x-auto'>
        <pre className='text-slate-300 leading-relaxed'>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

// 3. Knowledge Point Card
const PointCard = ({ number, title, content, code }) => {
  return (
    <div className='relative bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow group'>
      {/* Large Watermark Number for visual order */}
      <div className='absolute top-4 right-6 text-6xl font-black text-slate-50 opacity-50 select-none pointer-events-none group-hover:text-slate-100 transition-colors'>
        {number}
      </div>

      <div className='relative z-10'>
        <div className='flex items-center gap-3 mb-3'>
          <span className='bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md text-xs font-bold tracking-wide'>
            {number}
          </span>
          {title && (
            <h3 className='text-base font-semibold text-slate-800'>{title}</h3>
          )}
        </div>

        <div className='text-slate-600 text-sm leading-relaxed'>{content}</div>

        {code && <CodeBlock code={code} language='javascript' />}
      </div>
    </div>
  );
};

// --- Main Application ---
export default function App() {
  const codeSnippet1 = `const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // 元素进入可视区域
        console.log('Element is visible');
      }
    });
  },
  { threshold: 0.1 }
  // 阈值：表示元素可见 10% 时触发
);

observer.observe(targetElement);`;

  return (
    <div className='min-h-screen bg-slate-50 font-sans selection:bg-emerald-100 selection:text-emerald-900'>
      {/* Top Navigation Bar - Sticky & Frosted */}
      <header className='sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200'>
        <div className='max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between'>
          <div className='flex items-center gap-6'>
            {/* Logo */}
            <div className='flex items-center gap-2 text-emerald-600 font-bold text-lg tracking-tight'>
              <div className='w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white'>
                <BookOpen size={18} />
              </div>
              Entropy Zero
            </div>
            {/* Nav Links */}
            <nav className='hidden md:flex items-center gap-1 text-sm font-medium text-slate-500'>
              <a
                href='#'
                className='px-3 py-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors'>
                首页
              </a>
              <a
                href='#'
                className='px-3 py-1.5 text-slate-900 bg-slate-100 rounded-md transition-colors'>
                知识库
              </a>
              <a
                href='#'
                className='px-3 py-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors'>
                复习计划
              </a>
            </nav>
          </div>

          <div className='flex items-center gap-4'>
            <button className='text-slate-400 hover:text-slate-600'>
              <Search size={18} />
            </button>
            <button className='text-slate-400 hover:text-slate-600'>
              <Bell size={18} />
            </button>
            <div className='w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-blue-500 border-2 border-white shadow-sm cursor-pointer'></div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className='max-w-[1400px] mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8 items-start'>
        {/* Left/Center Main Content */}
        <main className='flex-1 min-w-0 lg:max-w-[850px] w-full'>
          {/* Breadcrumb & Back */}
          <div className='flex items-center gap-2 text-sm text-slate-500 mb-6'>
            <button className='flex items-center gap-1 hover:text-slate-900 transition-colors'>
              <ArrowLeft size={16} /> 返回
            </button>
            <span className='text-slate-300'>|</span>
            <span>前端知识库</span>
            <ChevronRight size={14} className='text-slate-400' />
            <span className='text-slate-900 font-medium'>性能优化</span>
          </div>

          {/* Article Header */}
          <div className='mb-10'>
            <h1 className='text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4'>
              可视区域检测 (Viewport Detection)
            </h1>
            <div className='flex flex-wrap items-center gap-3'>
              <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-sm font-medium border border-emerald-100'>
                <CheckCircle2 size={14} /> 核心原理
              </span>
              <span className='inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm'>
                <Tag size={12} /> 前端性能优化
              </span>
              <span className='inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm'>
                <Tag size={12} /> 懒加载
              </span>
            </div>
          </div>

          {/* Section: Core Knowledge */}
          <div className='mb-12'>
            <div className='flex items-center gap-2 mb-6'>
              <Terminal className='text-slate-400' size={20} />
              <h2 className='text-xl font-bold text-slate-800'>核心检测方案</h2>
            </div>

            <div className='space-y-5'>
              <PointCard
                number='01'
                title='Intersection Observer API (现代浏览器首选)'
                content={
                  <>
                    这是目前最推荐的可视区域检测方案。它是
                    <strong>异步触发</strong>的，不绑定 <code>scroll</code>{' '}
                    事件，因此不会引起主线程阻塞或频繁的重绘重排，性能极佳。
                  </>
                }
                code={codeSnippet1}
              />
              <PointCard
                number='02'
                title='getBoundingClientRect() 计算'
                content={
                  <>
                    通过动态计算元素与视口的位置，并结合 <code>scroll</code>{' '}
                    事件监听。这是一种传统方案，由于同步计算且频繁触发，性能较差，通常需要配合
                    <strong>防抖 (Debounce)</strong> 或
                    <strong>节流 (Throttle)</strong> 使用。
                  </>
                }
              />
              <PointCard
                number='03'
                title='offsetTop / scrollTop 方案'
                content='通过比对元素的 offsetTop 与容器的 scrollTop 及视口高度来判断可见性。适用于结构简单、没有复杂 transform 变换的列表。'
              />
              <PointCard
                number='04'
                title='框架层面的封装 (如 Vue)'
                content={
                  <>
                    在 Vue 等现代框架中，推荐将可见性检测逻辑封装为
                    <strong>自定义指令 (Custom Directive)</strong> 或{' '}
                    <strong>Hooks</strong>，例如{' '}
                    <code>v-observe-visibility</code>
                    ，以实现逻辑复用并保持组件代码的整洁。
                  </>
                }
              />
              <PointCard
                number='05'
                title='最佳实践建议'
                content='现代 Web 开发中，应默认优先采用 Intersection Observer。仅在需要兼容非常古老的浏览器（如 IE11 以下）时，才作为降级策略使用 scroll 事件方案（并引入 polyfill）。'
              />
            </div>
          </div>

          {/* Section: Q&A Flashcards */}
          <div>
            <div className='flex items-center justify-between mb-6 border-b border-slate-200 pb-4'>
              <div className='flex items-center gap-2'>
                <div className='w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center'>
                  <FileEdit size={18} />
                </div>
                <h2 className='text-xl font-bold text-slate-800'>
                  单题测试 | Q&A 问答
                </h2>
              </div>
              <span className='text-sm text-slate-400 font-medium'>
                点击卡片展开答案
              </span>
            </div>

            <div className='space-y-4'>
              <QACard
                question='Why is Intersection Observer recommended for visibility detection?'
                answer='Intersection Observer 是现代浏览器的原生 API。与传统的 scroll 事件监听不同，它是异步执行的，不会在主线程上造成阻塞，大大减少了页面卡顿的风险。此外，它内置了 threshold（阈值）配置，代码实现比手动计算更加简洁和健壮。'
                codeSnippet={`// 简洁的实现示例
const observer = new IntersectionObserver(cb, { threshold: 0.5 });
observer.observe(el);`}
              />
              <QACard
                question='How does getBoundingClientRect help determine element visibility?'
                answer='getBoundingClientRect() 返回一个 DOMRect 对象，包含了元素相对于视口（viewport）的 top、bottom、left 和 right 的距离。通过判断 top > 0 且 top < window.innerHeight 等条件，可以精确计算出元素是否在屏幕内。'
              />
              <QACard
                question='What are the limitations of using offsetTop and scrollTop?'
                answer='offsetTop 是相对于其最近的已定位父元素（offsetParent）的距离。如果 DOM 结构复杂，涉及多层嵌套或 transform 变形，计算真实位置会变得非常困难且容易出错。此外，每次读取都会强制浏览器重新计算布局（Reflow）。'
              />
              <QACard
                question='How should visibility logic be organized in a Vue/React project?'
                answer='为了保持组件的纯粹性，不应将 DOM 操作直接写在业务组件中。在 Vue 中建议封装为自定义指令 (v-lazy)；在 React 中建议封装为自定义 Hook (useIntersectionObserver)，实现视图逻辑与业务逻辑的解耦。'
              />
            </div>
          </div>
        </main>

        {/* Right Sidebar - Sticky & Independent Scroll */}
        <aside className='w-full lg:w-[280px] flex-shrink-0 lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
          <div className='space-y-6 pb-8'>
            {/* Action Card: Review Mode */}
            <button className='w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl p-4 flex items-center justify-center gap-2 font-bold shadow-md shadow-emerald-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0 group'>
              <Brain size={20} className='group-hover:animate-pulse' />
              进入闭卷复习
            </button>

            {/* Metadata Card */}
            <div className='bg-white rounded-2xl p-5 border border-slate-100 shadow-sm'>
              <h3 className='text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2'>
                <MoreHorizontal size={14} /> Metadata
              </h3>

              <div className='space-y-4'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-slate-500 flex items-center gap-2'>
                    <div className='w-2 h-2 rounded-full bg-blue-400'></div>{' '}
                    状态
                  </span>
                  <span className='font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded'>
                    Development
                  </span>
                </div>

                <div className='flex items-center justify-between text-sm'>
                  <span className='text-slate-500 flex items-center gap-2'>
                    <Clock size={14} /> 创建时间
                  </span>
                  <span className='font-medium text-slate-700'>2023-10-24</span>
                </div>

                <div className='flex items-center justify-between text-sm'>
                  <span className='text-slate-500 flex items-center gap-2'>
                    <User size={14} /> 贡献者
                  </span>
                  <div className='flex items-center gap-1.5'>
                    <img
                      src='https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
                      alt='avatar'
                      className='w-5 h-5 rounded-full bg-slate-100'
                    />
                    <span className='font-medium text-slate-700'>
                      EntropyAdmin
                    </span>
                  </div>
                </div>

                <div className='flex items-center justify-between text-sm'>
                  <span className='text-slate-500 flex items-center gap-2'>
                    <FileEdit size={14} /> 字数统计
                  </span>
                  <span className='font-medium text-slate-700'>~1,240 字</span>
                </div>
              </div>
            </div>

            {/* Table of Contents Card */}
            <div className='bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hidden lg:block'>
              <h3 className='text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2'>
                <List size={14} /> 目录导航
              </h3>

              <nav>
                <ul className='space-y-2.5'>
                  <li>
                    <a
                      href='#'
                      className='text-sm font-medium text-emerald-600 flex items-center gap-2'>
                      <div className='w-1.5 h-1.5 rounded-full bg-emerald-500'></div>
                      核心检测方案
                    </a>
                    <ul className='pl-4 mt-2 space-y-2.5 border-l-2 border-slate-100 ml-[3px]'>
                      <li>
                        <a
                          href='#'
                          className='text-sm text-slate-500 hover:text-slate-900 transition-colors block pl-4'>
                          01. Intersection Observer
                        </a>
                      </li>
                      <li>
                        <a
                          href='#'
                          className='text-sm text-slate-500 hover:text-slate-900 transition-colors block pl-4'>
                          02. getBoundingClientRect
                        </a>
                      </li>
                      <li>
                        <a
                          href='#'
                          className='text-sm text-slate-500 hover:text-slate-900 transition-colors block pl-4'>
                          03. offsetTop / scrollTop
                        </a>
                      </li>
                      <li>
                        <a
                          href='#'
                          className='text-sm text-slate-500 hover:text-slate-900 transition-colors block pl-4'>
                          04. 框架层面的封装
                        </a>
                      </li>
                      <li>
                        <a
                          href='#'
                          className='text-sm text-slate-500 hover:text-slate-900 transition-colors block pl-4'>
                          05. 最佳实践建议
                        </a>
                      </li>
                    </ul>
                  </li>
                  <li className='pt-2'>
                    <a
                      href='#'
                      className='text-sm text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-2'>
                      <div className='w-1.5 h-1.5 rounded-full bg-slate-300'></div>
                      单题测试 | Q&A 问答
                    </a>
                  </li>
                </ul>
              </nav>
            </div>

            {/* Links/TOC Card */}
            <div className='bg-white rounded-2xl p-5 border border-slate-100 shadow-sm'>
              <h3 className='text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2'>
                相关链接 (Assets)
              </h3>
              <ul className='space-y-3 text-sm'>
                <li>
                  <a
                    href='#'
                    className='flex items-start gap-2 text-slate-600 hover:text-emerald-600 transition-colors group'>
                    <span className='text-emerald-400 group-hover:text-emerald-600 mt-0.5'>
                      ↗
                    </span>
                    <span className='leading-tight'>
                      MDN: Intersection Observer API 文档
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href='#'
                    className='flex items-start gap-2 text-slate-600 hover:text-emerald-600 transition-colors group'>
                    <span className='text-emerald-400 group-hover:text-emerald-600 mt-0.5'>
                      ↗
                    </span>
                    <span className='leading-tight'>
                      前端性能优化白皮书 (2024版)
                    </span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
