import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/layout/Header';
import HomePage from '@/pages/HomePage';
import NoteDetailPage from '@/pages/NoteDetailPage';
import ReviewPage from '@/pages/ReviewPage';
import UploadPage from '@/pages/UploadPage';
import LoginPage from '@/pages/LoginPage';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <p className='text-slate-500'>Loading...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className='min-h-screen bg-slate-50'>
        <Header />
        <Routes>
          <Route path='/' element={<HomePage />} />
          <Route path='/notes/:id' element={<NoteDetailPage />} />
          <Route path='/review' element={<ReviewPage />} />
          <Route path='/upload' element={<UploadPage />} />
          <Route path='/auth/login' element={<LoginPage />} />
          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
