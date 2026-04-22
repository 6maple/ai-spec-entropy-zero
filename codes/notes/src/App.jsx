import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import MainLayout from './layouts/MainLayout';
import NotesPage from './pages/NotesPage';
import NoteDetailPage from './pages/NoteDetailPage';
import CardsPage from './pages/CardsPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path='/' element={<NotesPage />} />
            <Route path='/notes/:slug' element={<NoteDetailPage />} />
            <Route path='/cards' element={<CardsPage />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </AppProvider>
  );
}
