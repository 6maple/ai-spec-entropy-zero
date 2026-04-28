import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/contexts/I18nContext';
import AppShell from '@/components/layout/AppShell';
import { RequireAuth, RequireGuest } from '@/components/auth/RouteGuards';
import { UnauthorizedNavigatorBridge } from '@/components/auth/UnauthorizedNavigatorBridge';
import HomePage from '@/pages/HomePage';
import NoteDetailPage from '@/pages/NoteDetailPage';
import ReviewPage from '@/pages/ReviewPage';
import UploadPage from '@/pages/UploadPage';
import LoginPage from '@/pages/LoginPage';
import RawLibraryPage from '@/pages/RawLibraryPage';
import RawDetailPage from '@/pages/RawDetailPage';
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
      <UnauthorizedNavigatorBridge />
      <AppShell>
        <Routes>
          <Route path='/' element={<HomePage />} />
          <Route
            path='/auth/login'
            element={
              <RequireGuest>
                <LoginPage />
              </RequireGuest>
            }
          />
          <Route
            path='/raw'
            element={
              <RequireAuth>
                <RawLibraryPage />
              </RequireAuth>
            }
          />
          <Route
            path='/raw/:id'
            element={
              <RequireAuth>
                <RawDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path='/tasks'
            element={
              <RequireAuth>
                <TasksPage />
              </RequireAuth>
            }
          />
          <Route
            path='/notes'
            element={
              <RequireAuth>
                <NotesListPage />
              </RequireAuth>
            }
          />
          <Route
            path='/notes/:id'
            element={
              <RequireAuth>
                <NoteDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path='/review'
            element={
              <RequireAuth>
                <ReviewPage />
              </RequireAuth>
            }
          />
          <Route
            path='/upload'
            element={
              <RequireAuth>
                <UploadPage />
              </RequireAuth>
            }
          />
          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default function App() {
  return <AppRoutes />;
}
