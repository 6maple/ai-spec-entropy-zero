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
      className={`h-screen flex flex-col transition-colors duration-300 font-sans ${
        darkMode ? 'bg-[#0B1213] text-[#E6F0EE]' : 'bg-[#F6F8F4] text-[#0F2A26]'
      }`}>
      <nav className='flex-shrink-0 z-50 border-b shadow-sm backdrop-blur-md border-slate-200 dark:border-[#163033] bg-white/90 dark:bg-[#0F1A1A]/90 px-4'>
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
              <Link
                to='/'
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  isNotesActive
                    ? 'bg-white dark:bg-[#2B8F80] shadow-sm text-[#2B8F80] dark:text-white'
                    : 'text-slate-400'
                }`}>
                <Layout size={14} /> 开卷笔记
              </Link>
              <Link
                to='/cards'
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  isCardsActive
                    ? 'bg-white dark:bg-[#2B8F80] shadow-sm text-[#2B8F80] dark:text-white'
                    : 'text-slate-400'
                }`}>
                <BrainCircuit size={14} /> 闭卷复习
              </Link>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className='p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800'>
            {darkMode ? (
              <Sun size={16} className='text-[#F4B84A]' />
            ) : (
              <Moon size={16} className='text-[#5A5FB5]' />
            )}
          </button>
        </div>
      </nav>
      <main className='flex-1 overflow-y-auto'>{children}</main>
    </div>
  );
}
