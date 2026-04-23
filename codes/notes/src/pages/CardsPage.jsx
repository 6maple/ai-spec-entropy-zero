import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllCards } from '@/services/dataService';
import { BrainCircuit, ChevronRight } from 'lucide-react';

export default function CardsPage() {
  const [cardsGroups, setCardsGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setLoading(true);
      const data = await getAllCards();
      setCardsGroups(data);
      setError(null);
    } catch (err) {
      setError('加载复习卡失败');
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
          onClick={loadCards}
          className='mt-4 px-4 py-2 bg-[#2B8F80] text-white rounded-lg hover:bg-[#247567]'>
          重试
        </button>
      </div>
    );
  }

  const totalCards = cardsGroups.reduce(
    (sum, group) => sum + (group.cards?.length || 0),
    0,
  );

  return (
    <div className='max-w-[1200px] mx-auto p-6'>
      <div className='mb-6'>
        <h2 className='text-2xl font-bold mb-2'>复习卡库</h2>
        <p className='text-sm opacity-60'>
          共 {cardsGroups.length} 组复习卡，{totalCards} 张卡片
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {cardsGroups.map((group) => {
          return (
            <Link
              key={group.note_id}
              to={`/notes/${group.slug}?view=review`}
              className='block bg-white dark:bg-[#163033] border border-slate-200 dark:border-[#2A4144] rounded-xl p-5 hover:shadow-lg hover:border-[#2B8F80] dark:hover:border-[#2B8F80] transition-all group'>
              <div className='flex items-start gap-3 mb-3'>
                <div className='p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors'>
                  <BrainCircuit size={20} className='text-blue-500' />
                </div>
                <div className='flex-1 min-w-0'>
                  <h3 className='text-sm font-bold mb-1 line-clamp-2 group-hover:text-[#2B8F80] transition-colors'>
                    {group.note_title}
                  </h3>
                  <div className='text-[10px] opacity-60'>
                    {group.cards?.length || 0} 张卡片
                  </div>
                </div>
              </div>
              <div className='flex items-center justify-end text-[10px] opacity-50'>
                <ChevronRight
                  size={14}
                  className='group-hover:translate-x-1 transition-transform'
                />
              </div>
            </Link>
          );
        })}
      </div>

      {cardsGroups.length === 0 && (
        <div className='text-center py-12 opacity-60'>
          <BrainCircuit size={48} className='mx-auto mb-3 opacity-30' />
          <p>暂无复习卡</p>
        </div>
      )}
    </div>
  );
}
