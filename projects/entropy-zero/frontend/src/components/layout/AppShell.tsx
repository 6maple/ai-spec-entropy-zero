import type { ReactNode } from 'react';
import { TopNav } from '@/components/layout/TopNav';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className='flex min-h-screen flex-col bg-[#F6F8F4] text-[#0F2A26] dark:bg-[#0B1213] dark:text-[#E6F0EE]'>
      <TopNav />
      <div className='flex-1'>{children}</div>
    </div>
  );
}
