import { apiJson } from '@/lib/api/client';

export type NoteListItem = {
  note_id: string;
  title: string;
  abstract: string;
  created_at: string;
};

const notesApi = {
  list(limit = 10): Promise<NoteListItem[]> {
    return apiJson<NoteListItem[]>(`notes?limit=${limit}`);
  },
};

export default notesApi;
