import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getNoteBySlug, getCardsBySlug } from '@/services/dataService';
import NoteViewer from '@/components/NoteViewer';
import CardPlayer from '@/components/CardPlayer';
import { ArrowLeft, Layout, BrainCircuit } from 'lucide-react';

export default function NoteDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [noteData, setNoteData] = useState(null);
  const [cardsData, setCardsData] = useState(null);
  const [viewMode, setViewMode] = useState('note');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [slug]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [note, cards] = await Promise.all([
        getNoteBySlug(slug),
        getCardsBySlug(slug).catch(() => null),
      ]);
      setNoteData(note);
      setCardsData(cards);
      setError(null);
    } catch (err) {
      setError('加载笔记失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className='max-w-[1200px] mx-auto p-6 text-center'>
        <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-[#2B8F80]'></div>
        <p className='mt-3 text-sm opacity-60'>加载中...</p>
      </div>
    );
  }

  if (error || !noteData) {
    return (
      <div className='max-w-[1200px] mx-auto p-6 text-center'>
        <p className='text-rose-500'>{error || '笔记不存在'}</p>
        <button
          onClick={() => navigate('/')}
          className='mt-4 px-4 py-2 bg-[#2B8F80] text-white rounded-lg hover:bg-[#247567]'>
          返回笔记库
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 工具栏 */}
      <div className='border-b border-slate-200 dark:border-[#163033] bg-white/50 dark:bg-[#0F1A1A]/50 backdrop-blur-sm'>
        <div className='max-w-[1200px] mx-auto px-6 py-3 flex items-center justify-between'>
          <button
            onClick={() => navigate('/')}
            className='flex items-center gap-2 text-sm opacity-60 hover:opacity-100 transition-opacity'>
            <ArrowLeft size={16} />
            返回列表
          </button>
          <div className='flex bg-slate-100 dark:bg-[#163033] p-1 rounded-lg'>
            <button
              onClick={() => setViewMode('note')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'note'
                  ? 'bg-white dark:bg-[#2B8F80] shadow-sm text-[#2B8F80] dark:text-white'
                  : 'text-slate-400'
              }`}>
              <Layout size={14} /> 开卷笔记
            </button>
            <button
              onClick={() => setViewMode('review')}
              disabled={!cardsData}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'review'
                  ? 'bg-white dark:bg-[#2B8F80] shadow-sm text-[#2B8F80] dark:text-white'
                  : 'text-slate-400'
              } ${!cardsData ? 'opacity-30 cursor-not-allowed' : ''}`}>
              <BrainCircuit size={14} /> 闭卷复习
            </button>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      {viewMode === 'note' ? (
        <NoteViewer noteData={noteData} />
      ) : cardsData ? (
        <CardPlayer cardsData={cardsData} />
      ) : (
        <div className='max-w-[800px] mx-auto p-6 text-center opacity-60'>
          <p>该笔记暂无复习卡</p>
        </div>
      )}
    </div>
  );
}
