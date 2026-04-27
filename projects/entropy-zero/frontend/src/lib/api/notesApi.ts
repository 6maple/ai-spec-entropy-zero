import { apiJson } from '@/lib/api/client';
import type { Note } from '@/types';

export type NoteListParams = {
  limit?: number;
  offset?: number;
  raw_id?: string;
  tag?: string;
  keyword?: string;
};

function buildQuery(p: NoteListParams): string {
  const q = new URLSearchParams();
  if (p.limit != null) q.set('limit', String(p.limit));
  if (p.offset != null) q.set('offset', String(p.offset));
  if (p.raw_id) q.set('raw_id', p.raw_id);
  if (p.tag) q.set('tag', p.tag);
  if (p.keyword) q.set('keyword', p.keyword);
  const s = q.toString();
  return s ? `?${s}` : '';
}

const notesApi = {
  list(params: NoteListParams = {}): Promise<Note[]> {
    const merged: NoteListParams = { limit: 50, ...params };
    return apiJson<Note[]>(`notes${buildQuery(merged)}`);
  },
  get(noteId: string): Promise<Note> {
    return apiJson<Note>(`notes/${noteId}`);
  },
};

export default notesApi;
