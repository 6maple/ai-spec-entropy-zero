import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getAllCardsWithMeta,
  filterCards,
  sortCards,
} from '@/services/dataService';
import {
  BrainCircuit,
  Play,
  Filter,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  RotateCcw,
  X,
  Eye,
  ChevronRight,
} from 'lucide-react';
import HookItem from '@/components/HookItem';
import MarkdownContent from '@/components/MarkdownContent';

export default function CardsPage() {
  // 数据状态
  const [allCardsGroups, setAllCardsGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 会话状态
  const [sessionState, setSessionState] = useState('prepare'); // prepare | reviewing | completed
  const [sessionCards, setSessionCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionEndTime, setSessionEndTime] = useState(null);

  // 筛选配置
  const [filters, setFilters] = useState({
    tags: [],
    noteSlugs: [],
    cardTypes: [],
  });
  const [sortOrder, setSortOrder] = useState('random');
  const [showFilters, setShowFilters] = useState(false);

  // 可用选项
  const [availableTags, setAvailableTags] = useState([]);
  const [availableNotes, setAvailableNotes] = useState([]);
  const cardTypes = [
    { value: 'qa', label: '问答题' },
    { value: 'fill_in_blank', label: '填空题' },
    { value: 'error_correction', label: '纠错题' },
  ];

  useEffect(() => {
    loadAllCards();
  }, []);

  const loadAllCards = async () => {
    try {
      setLoading(true);
      const data = await getAllCardsWithMeta();
      setAllCardsGroups(data);

      // 提取可用的标签和笔记
      const tagsSet = new Set();
      const notesMap = new Map();
      data.forEach((group) => {
        group.tags.forEach((tag) => tagsSet.add(tag));
        notesMap.set(group.noteSlug, group.noteTitle);
      });
      setAvailableTags(Array.from(tagsSet));
      setAvailableNotes(
        Array.from(notesMap, ([slug, title]) => ({ slug, title })),
      );

      setError(null);
    } catch (err) {
      setError('加载复习卡失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartReview = () => {
    // 收集所有卡片
    const allCards = allCardsGroups.flatMap((group) => group.cards);

    // 应用筛选
    const filtered = filterCards(allCards, filters);

    // 应用排序
    const sorted = sortCards(filtered, sortOrder);

    setSessionCards(sorted);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setSessionState('reviewing');
    setSessionStartTime(Date.now());
    setSessionEndTime(null);
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleNextCard = () => {
    if (currentCardIndex < sessionCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    } else {
      // 完成复习
      setSessionState('completed');
      setSessionEndTime(Date.now());
    }
  };

  const handleRestartSession = () => {
    setSessionState('prepare');
    setSessionCards([]);
    setCurrentCardIndex(0);
    setShowAnswer(false);
  };

  const toggleFilter = (type, value) => {
    setFilters((prev) => {
      const current = prev[type];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [type]: updated };
    });
  };

  const clearFilters = () => {
    setFilters({ tags: [], noteSlugs: [], cardTypes: [] });
  };

  // 加载中
  if (loading) {
    return (
      <div className='max-w-[1200px] mx-auto p-6 text-center'>
        <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-[#2B8F80]'></div>
        <p className='mt-3 text-sm opacity-60'>加载中...</p>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className='max-w-[1200px] mx-auto p-6 text-center'>
        <p className='text-rose-500'>{error}</p>
        <button
          onClick={loadAllCards}
          className='mt-4 px-4 py-2 bg-[#2B8F80] text-white rounded-lg hover:bg-[#247567]'>
          重试
        </button>
      </div>
    );
  }

  const totalCards = allCardsGroups.reduce(
    (sum, group) => sum + group.cards.length,
    0,
  );

  // ========== 预备区 ==========
  if (sessionState === 'prepare') {
    const allCards = allCardsGroups.flatMap((group) => group.cards);
    const filteredCards = filterCards(allCards, filters);

    return (
      <div className='max-w-[900px] mx-auto p-6'>
        {/* 标题和简介 */}
        <div className='mb-8 text-center'>
          <h2 className='text-3xl font-bold mb-2'>全部复习</h2>
          <p className='text-sm opacity-60'>跨主题连续复习，强化长期记忆</p>
        </div>

        {/* 数据概览 */}
        <div className='mb-6 p-4 bg-white dark:bg-[#163033] rounded-xl border border-slate-200 dark:border-[#2A4144]'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-xs opacity-60 mb-1'>可复习卡片</p>
              <p className='text-2xl font-bold text-[#2B8F80]'>
                {filteredCards.length} 张
              </p>
            </div>
            <div className='text-right'>
              <p className='text-xs opacity-60 mb-1'>覆盖笔记</p>
              <p className='text-lg font-bold'>
                {new Set(filteredCards.map((c) => c.noteSlug)).size} 篇
              </p>
            </div>
          </div>
        </div>

        {/* 筛选控制 */}
        <div className='mb-6'>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className='flex items-center gap-2 text-sm font-bold opacity-60 hover:opacity-100 transition-opacity mb-3'>
            <Filter size={14} />
            筛选与排序
            {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showFilters && (
            <div className='bg-white dark:bg-[#163033] rounded-xl border border-slate-200 dark:border-[#2A4144] p-4 space-y-4'>
              {/* 标签筛选 */}
              <div>
                <label className='text-xs font-bold opacity-60 mb-2 block'>
                  按标签
                </label>
                <div className='flex flex-wrap gap-2'>
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleFilter('tags', tag)}
                      className={`px-3 py-1 rounded-full text-xs border transition-all ${
                        filters.tags.includes(tag)
                          ? 'bg-[#2B8F80] text-white border-[#2B8F80]'
                          : 'border-slate-200 dark:border-[#2A4144] opacity-60 hover:opacity-100'
                      }`}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* 笔记来源筛选 */}
              <div>
                <label className='text-xs font-bold opacity-60 mb-2 block'>
                  按笔记来源
                </label>
                <div className='flex flex-wrap gap-2'>
                  {availableNotes.map((note) => (
                    <button
                      key={note.slug}
                      onClick={() => toggleFilter('noteSlugs', note.slug)}
                      className={`px-3 py-1 rounded-full text-xs border transition-all ${
                        filters.noteSlugs.includes(note.slug)
                          ? 'bg-[#2B8F80] text-white border-[#2B8F80]'
                          : 'border-slate-200 dark:border-[#2A4144] opacity-60 hover:opacity-100'
                      }`}>
                      {note.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* 题型筛选 */}
              <div>
                <label className='text-xs font-bold opacity-60 mb-2 block'>
                  按题型
                </label>
                <div className='flex flex-wrap gap-2'>
                  {cardTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => toggleFilter('cardTypes', type.value)}
                      className={`px-3 py-1 rounded-full text-xs border transition-all ${
                        filters.cardTypes.includes(type.value)
                          ? 'bg-[#2B8F80] text-white border-[#2B8F80]'
                          : 'border-slate-200 dark:border-[#2A4144] opacity-60 hover:opacity-100'
                      }`}>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 排序策略 */}
              <div>
                <label className='text-xs font-bold opacity-60 mb-2 block'>
                  排序方式
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className='px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2A4144] bg-white dark:bg-[#0F1A1A] text-sm'>
                  <option value='random'>随机顺序</option>
                </select>
              </div>

              {/* 清空筛选 */}
              {(filters.tags.length > 0 ||
                filters.noteSlugs.length > 0 ||
                filters.cardTypes.length > 0) && (
                <button
                  onClick={clearFilters}
                  className='flex items-center gap-2 text-xs text-rose-500 hover:text-rose-600'>
                  <X size={12} />
                  清空筛选
                </button>
              )}
            </div>
          )}
        </div>

        {/* 开始按钮 */}
        <button
          onClick={handleStartReview}
          disabled={filteredCards.length === 0}
          className='w-full py-4 bg-[#2B8F80] hover:bg-[#247567] text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-30 disabled:cursor-not-allowed'>
          <Play size={20} />
          开始复习 ({filteredCards.length} 张)
        </button>

        {/* 空状态 */}
        {filteredCards.length === 0 && totalCards > 0 && (
          <div className='mt-4 text-center text-sm opacity-60'>
            <p>当前筛选无结果</p>
            <button
              onClick={clearFilters}
              className='mt-2 text-[#2B8F80] hover:underline'>
              清空筛选
            </button>
          </div>
        )}

        {totalCards === 0 && (
          <div className='mt-8 text-center opacity-60'>
            <BrainCircuit size={48} className='mx-auto mb-3 opacity-30' />
            <p>暂无可复习卡片</p>
            <Link
              to='/'
              className='mt-2 inline-block text-[#2B8F80] hover:underline'>
              返回笔记库
            </Link>
          </div>
        )}
      </div>
    );
  }

  // ========== 进行区 ==========
  if (sessionState === 'reviewing') {
    const currentCard = sessionCards[currentCardIndex];

    if (!currentCard) {
      return (
        <div className='max-w-xl mx-auto p-6 text-center'>
          <p className='text-gray-500'>无效的卡片数据</p>
          <button
            onClick={handleRestartSession}
            className='mt-4 px-4 py-2 bg-[#2B8F80] text-white rounded-lg'>
            返回
          </button>
        </div>
      );
    }

    return (
      <div className='max-w-xl mx-auto py-2 animate-in zoom-in-95 duration-300'>
        {/* 进度指示 */}
        <div className='flex items-center justify-between mb-3 px-2'>
          <span className='text-[9px] font-bold opacity-30 uppercase tracking-[0.2em]'>
            Global Review Mode
          </span>
          <div className='text-xs font-bold text-[#2B8F80]'>
            {currentCardIndex + 1} / {sessionCards.length}
          </div>
        </div>

        {/* 进度条 */}
        <div className='mb-4 h-1 bg-slate-200 dark:bg-[#163033] rounded-full overflow-hidden'>
          <div
            className='h-full bg-[#2B8F80] transition-all duration-300'
            style={{
              width: `${((currentCardIndex + 1) / sessionCards.length) * 100}%`,
            }}
          />
        </div>

        {/* 卡片容器 */}
        <div className='bg-white dark:bg-[#0F1A1A] rounded-2xl border border-slate-200 dark:border-[#163033] shadow-lg flex flex-col overflow-hidden'>
          {/* 卡片头部 */}
          <div className='px-4 py-2 border-b border-slate-50 dark:border-[#163033] flex justify-between items-center bg-slate-50/40 dark:bg-[#163033]/20'>
            <span className='text-[9px] font-bold px-2 py-0.5 rounded bg-[#5A5FB5] text-white uppercase'>
              {currentCard.type}
            </span>
            <span className='text-[9px] opacity-60'>
              {currentCard.noteTitle}
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
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className='p-3 bg-slate-50/50 dark:bg-[#163033]/20 border-t border-slate-100 dark:border-[#163033]'>
            {!showAnswer ? (
              <button
                onClick={handleShowAnswer}
                className='w-full py-2.5 bg-[#2B8F80] hover:bg-[#196B5E] text-white rounded-lg font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 text-xs'>
                <Eye size={14} /> 显示答案
              </button>
            ) : (
              <div className='flex gap-2'>
                <button
                  onClick={handleNextCard}
                  className='flex-1 py-2.5 bg-slate-900 dark:bg-[#2B8F80] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-transform'>
                  {currentCardIndex < sessionCards.length - 1
                    ? '下一张'
                    : '完成复习'}{' '}
                  <ChevronRight size={14} />
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

        {/* 底部操作 */}
        <div className='mt-4 text-center'>
          <button
            onClick={handleRestartSession}
            className='text-xs opacity-40 hover:opacity-100 transition-opacity'>
            结束本轮
          </button>
        </div>
      </div>
    );
  }

  // ========== 结果区 ==========
  if (sessionState === 'completed') {
    const duration = sessionEndTime - sessionStartTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    const coveredNotes = new Set(sessionCards.map((c) => c.noteSlug)).size;

    return (
      <div className='max-w-[700px] mx-auto p-6'>
        <div className='bg-white dark:bg-[#163033] rounded-2xl border border-slate-200 dark:border-[#2A4144] p-8 text-center'>
          {/* 完成图标 */}
          <div className='mb-6'>
            <div className='inline-flex items-center justify-center w-20 h-20 bg-emerald-500/10 rounded-full'>
              <CheckCircle2 size={40} className='text-emerald-500' />
            </div>
          </div>

          {/* 标题 */}
          <h2 className='text-2xl font-bold mb-2'>本轮复习完成！</h2>
          <p className='text-sm opacity-60 mb-8'>恭喜你完成了这一轮复习</p>

          {/* 数据统计 */}
          <div className='grid grid-cols-3 gap-4 mb-8'>
            <div className='p-4 bg-slate-50 dark:bg-[#0F1A1A] rounded-xl'>
              <p className='text-xs opacity-60 mb-1'>完成张数</p>
              <p className='text-2xl font-bold text-[#2B8F80]'>
                {sessionCards.length}
              </p>
            </div>
            <div className='p-4 bg-slate-50 dark:bg-[#0F1A1A] rounded-xl'>
              <p className='text-xs opacity-60 mb-1'>用时</p>
              <p className='text-2xl font-bold'>
                {minutes > 0 ? `${minutes}分` : `${seconds}秒`}
              </p>
            </div>
            <div className='p-4 bg-slate-50 dark:bg-[#0F1A1A] rounded-xl'>
              <p className='text-xs opacity-60 mb-1'>覆盖主题</p>
              <p className='text-2xl font-bold'>{coveredNotes}</p>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className='flex gap-3'>
            <button
              onClick={handleStartReview}
              className='flex-1 py-3 bg-[#2B8F80] hover:bg-[#247567] text-white rounded-xl font-bold flex items-center justify-center gap-2'>
              <RotateCcw size={16} />
              再来一轮
            </button>
            <button
              onClick={handleRestartSession}
              className='flex-1 py-3 border border-slate-200 dark:border-[#2A4144] rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-[#0F1A1A]'>
              调整筛选
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
