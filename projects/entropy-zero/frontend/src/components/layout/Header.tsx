import { Link } from 'react-router-dom';
import { Brain, Search, User } from 'lucide-react';

// TODO: Implement Header
// Features:
// - Logo and branding
// - Breadcrumb navigation
// - Search icon
// - User profile menu

export default function Header() {
  return (
    <header className='sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md'>
      <div className='container mx-auto flex h-14 items-center justify-between px-4'>
        <Link to='/' className='flex items-center gap-2'>
          <div className='h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center'>
            <Brain className='h-5 w-5 text-white' />
          </div>
          <span className='font-semibold text-lg'>Entropy Zero</span>
        </Link>

        <div className='flex items-center gap-4'>
          <Search className='h-5 w-5 text-slate-500 cursor-pointer' />
          <User className='h-5 w-5 text-slate-500 cursor-pointer' />
        </div>
      </div>
    </header>
  );
}
