import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Zap, Layout, BrainCircuit, Moon, Sun } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export default function MainLayout({ children }) {
  const { darkMode, toggleDarkMode } = useApp();
  const location = useLocation();

  const isNotesActive =
    location.pathname === '/' || location.pathname.startsWith('/notes');
  const isCardsActive = location.pathname.startsWith('/cards');

  return (
    <div
      className={`min-h-screen transition-colors duration-300 font-sans ${
        darkMode ? 'bg-[#0B1213] text-[#E6F0EE]' : 'bg-[#F6F8F4] text-[#0F2A26]'
      }`}>
      <nav className='sticky top-0 z-50 border-b shadow-sm backdrop-blur-md border-slate-200 dark:border-[#163033] bg-white/90 dark:bg-[#0F1A1A]/90 px-4'>
        <div className='max-w-[1400px] mx-auto flex items-center justify-between h-14'>
          <div className='flex items-center gap-6'>
            <Link to='/' className='flex items-center gap-2'>
              <div className='p-1.5 bg-[#2B8F80] rounded text-white'>
                <Zap size={16} fill='currentColor' />
              </div>
              <h1 className='text-xs font-bold hidden md:block tracking-tight'>
                Entropy Zero
              </h1>
            </Link>
            <div className='flex bg-slate-100 dark:bg-[#163033] p-1 rounded-lg'>
              <Link
                to='/'
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  isNotesActive
                    ? 'bg-white dark:bg-[#2B8F80] shadow-sm text-[#2B8F80] dark:text-white'
                    : 'text-slate-400'
                }`}>
                <Layout size={14} /> 笔记库
              </Link>
              <Link
                to='/cards'
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  isCardsActive
                    ? 'bg-white dark:bg-[#2B8F80] shadow-sm text-[#2B8F80] dark:text-white'
                    : 'text-slate-400'
                }`}>
                <BrainCircuit size={14} /> 复习卡库
              </Link>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className='p-2 rounded-lg bg-slate-100 dark:bg-[#163033] hover:bg-slate-200 dark:hover:bg-[#2A4144] transition-colors'>
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
