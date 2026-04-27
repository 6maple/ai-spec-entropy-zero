import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/contexts/I18nContext';
import AppShell from '@/components/layout/AppShell';
import HomePage from '@/pages/HomePage';
import NoteDetailPage from '@/pages/NoteDetailPage';
import ReviewPage from '@/pages/ReviewPage';
import UploadPage from '@/pages/UploadPage';
import LoginPage from '@/pages/LoginPage';
import RawLibraryPage from '@/pages/RawLibraryPage';
import TasksPage from '@/pages/TasksPage';
import NotesListPage from '@/pages/NotesListPage';

function AppRoutes() {
  const { loading } = useAuth();
  const { t } = useI18n();

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[#F6F8F4] dark:bg-[#0B1213]'>
        <p className='text-slate-500'>{t('app.loading')}</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path='/' element={<HomePage />} />
          <Route path='/raw' element={<RawLibraryPage />} />
          <Route path='/tasks' element={<TasksPage />} />
          <Route path='/notes' element={<NotesListPage />} />
          <Route path='/notes/:id' element={<NoteDetailPage />} />
          <Route path='/review' element={<ReviewPage />} />
          <Route path='/upload' element={<UploadPage />} />
          <Route path='/auth/login' element={<LoginPage />} />
          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default function App() {
  return <AppRoutes />;
}
