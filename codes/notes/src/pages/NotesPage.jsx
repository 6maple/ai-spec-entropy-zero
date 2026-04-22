import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getNoteIndex } from '@/services/dataService';
import { BookOpen, ChevronRight } from 'lucide-react';

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await getNoteIndex();
      setNotes(data);
      setError(null);
    } catch (err) {
      setError('加载笔记列表失败');
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

  if (error) {
    return (
      <div className='max-w-[1200px] mx-auto p-6 text-center'>
        <p className='text-rose-500'>{error}</p>
        <button
          onClick={loadNotes}
          className='mt-4 px-4 py-2 bg-[#2B8F80] text-white rounded-lg hover:bg-[#247567]'>
          重试
        </button>
      </div>
    );
  }

  return (
    <div className='max-w-[1200px] mx-auto p-6'>
      <div className='mb-6'>
        <h2 className='text-2xl font-bold mb-2'>笔记库</h2>
        <p className='text-sm opacity-60'>共 {notes.length} 篇笔记</p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {notes.map((note) => (
          <Link
            key={note.id}
            to={`/notes/${note.slug}`}
            className='block bg-white dark:bg-[#163033] border border-slate-200 dark:border-[#2A4144] rounded-xl p-5 hover:shadow-lg hover:border-[#2B8F80] dark:hover:border-[#2B8F80] transition-all group'>
            <div className='flex items-start gap-3 mb-3'>
              <div className='p-2 bg-[#2B8F80]/10 rounded-lg group-hover:bg-[#2B8F80]/20 transition-colors'>
                <BookOpen size={20} className='text-[#2B8F80]' />
              </div>
              <div className='flex-1 min-w-0'>
                <h3 className='text-sm font-bold mb-1 line-clamp-2 group-hover:text-[#2B8F80] transition-colors'>
                  {note.title}
                </h3>
                {note.domain && note.domain.length > 0 && (
                  <div className='flex flex-wrap gap-1'>
                    {note.domain.slice(0, 2).map((tag, idx) => (
                      <span
                        key={idx}
                        className='text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full'>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className='text-xs opacity-70 line-clamp-2 mb-3 leading-relaxed'>
              {note.abstract}
            </p>
            <div className='flex items-center justify-between text-[10px] opacity-50'>
              <span>
                {new Date(note.created_at).toLocaleDateString('zh-CN')}
              </span>
              <ChevronRight
                size={14}
                className='group-hover:translate-x-1 transition-transform'
              />
            </div>
          </Link>
        ))}
      </div>

      {notes.length === 0 && (
        <div className='text-center py-12 opacity-60'>
          <BookOpen size={48} className='mx-auto mb-3 opacity-30' />
          <p>暂无笔记</p>
        </div>
      )}
    </div>
  );
}
